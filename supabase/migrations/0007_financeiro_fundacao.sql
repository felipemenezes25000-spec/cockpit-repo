-- =====================================================================
-- Migração 0007: fundação do módulo Financeiro
--
-- Vendas, tabela de taxas de cartão, ajustes e histórico de alterações,
-- mais as colunas que faltavam em recebimentos e despesas.
--
-- Princípios desta migração:
--
-- 1. REGISTRO FINANCEIRO NÃO SE APAGA. Nenhuma tabela nova tem política
--    de DELETE — o banco recusa a exclusão para qualquer perfil, não só
--    a interface. Corrigir é cancelar, ajustar ou reabrir.
--
-- 2. A CONTA FECHA NO BANCO. As igualdades da venda são CHECK
--    constraints: original − desconto = final e final − taxa = líquido.
--    Aplicação com bug de arredondamento não consegue gravar linha
--    inconsistente.
--
-- 3. A TAXA É COPIADA NA VENDA. Mudar a tabela padrão amanhã não pode
--    mudar o que já foi vendido — por isso a venda guarda o percentual
--    e o valor da taxa do momento, e só referencia a linha da tabela
--    como proveniência.
--
-- 4. CARTÃO PARCELADO, REPASSE ÚNICO. A operadora antecipa: a paciente
--    parcela, a clínica recebe uma vez, com a taxa (que já inclui a
--    antecipação) descontada. Uma venda em 5x gera UM recebimento.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfil financeiro
-- ---------------------------------------------------------------------

create or replace function private.e_financeira()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(private.papel_atual() in ('administradora', 'financeiro'), false)
$$;

revoke all on function private.e_financeira() from public, anon;
grant execute on function private.e_financeira() to authenticated;

comment on function private.e_financeira() is
  'Administradora ou perfil financeiro, com a conta ativa. Usada pelas políticas do módulo Financeiro.';

-- ---------------------------------------------------------------------
-- Tabela de taxas de cartão
-- ---------------------------------------------------------------------

create table public.taxas_cartao (
  id uuid primary key default gen_random_uuid(),
  operadora text not null,
  tipo public.tipo_cartao not null,
  parcelas integer not null default 1 check (parcelas between 1 and 24),
  -- 6.00 = 6%. A taxa já inclui a antecipação do parcelado.
  percentual numeric(5, 2) not null check (percentual >= 0 and percentual <= 100),
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint debito_nao_parcela check (tipo <> 'debito' or parcelas = 1)
);

comment on table public.taxas_cartao is
  'Tabela padrão de taxas por operadora, tipo e parcelas. A venda copia o percentual no momento — mudar aqui não muda venda antiga.';

-- A mesma combinação só pode estar ativa uma vez; inativas ficam como histórico.
create unique index taxas_cartao_combinacao_ativa
  on public.taxas_cartao (operadora, tipo, parcelas)
  where ativa;

create trigger taxas_cartao_atualizado_em
  before update on public.taxas_cartao
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Vendas
-- ---------------------------------------------------------------------

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  procedimento_id uuid not null references public.procedimentos (id) on delete restrict,
  data_venda date not null,

  valor_original numeric(10, 2) not null check (valor_original >= 0),
  desconto numeric(10, 2) not null default 0 check (desconto >= 0),
  valor_final numeric(10, 2) not null check (valor_final >= 0),

  forma public.forma_pagamento not null,
  parcelas integer not null default 1 check (parcelas between 1 and 24),

  -- Proveniência da taxa aplicada. A cópia congelada está nas colunas
  -- abaixo; esta referência só diz de onde ela veio.
  taxa_cartao_id uuid references public.taxas_cartao (id) on delete set null,
  taxa_percentual numeric(5, 2) not null default 0 check (taxa_percentual >= 0 and taxa_percentual <= 100),
  taxa_valor numeric(10, 2) not null default 0 check (taxa_valor >= 0),
  valor_liquido numeric(10, 2) not null check (valor_liquido >= 0),

  -- Taxa diferente da tabela padrão: quem alterou assina o porquê.
  taxa_manual boolean not null default false,
  taxa_justificativa text,

  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  exemplo boolean not null default false,

  -- A conta fecha ou a linha não entra.
  constraint venda_desconto_fecha check (valor_original - desconto = valor_final),
  constraint venda_liquido_fecha check (valor_final - taxa_valor = valor_liquido),
  constraint taxa_manual_justificada check (not taxa_manual or taxa_justificativa is not null)
);

comment on column public.vendas.taxa_percentual is
  'Cópia congelada no momento da venda. Alterar a tabela padrão não altera este valor.';

create index vendas_data on public.vendas (data_venda desc);
create index vendas_paciente on public.vendas (paciente_id, data_venda desc);
create index vendas_exemplo on public.vendas (id) where exemplo;

create trigger vendas_atualizado_em
  before update on public.vendas
  for each row execute function public.tocar_atualizado_em();

create trigger auditar_vendas
  after insert or update or delete on public.vendas
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Histórico de alterações da venda
-- ---------------------------------------------------------------------

create table public.venda_alteracoes (
  id bigint generated always as identity primary key,
  venda_id uuid not null references public.vendas (id) on delete cascade,
  tipo text not null check (tipo in ('forma_pagamento', 'taxa_manual')),
  -- Fotografia de antes e depois: forma, parcelas, taxa e líquido.
  de jsonb not null,
  para jsonb not null,
  motivo text not null,
  por uuid references public.perfis (id) on delete set null,
  em timestamptz not null default now()
);

comment on table public.venda_alteracoes is
  'Histórico imutável: sem política de UPDATE nem DELETE. Cada mudança de forma de pagamento ou de taxa fica assinada, com motivo e fotografia dos valores.';

create index venda_alteracoes_venda on public.venda_alteracoes (venda_id, em desc);

-- ---------------------------------------------------------------------
-- Ajustes financeiros
-- ---------------------------------------------------------------------

create table public.ajustes_financeiros (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references public.vendas (id) on delete restrict,
  recebimento_id uuid references public.recebimentos (id) on delete restrict,
  -- Diferença entre o novo líquido e o que já tinha sido confirmado.
  -- Negativo quando a mudança reduziu o valor da clínica.
  valor numeric(10, 2) not null check (valor <> 0),
  motivo text not null,
  criado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  exemplo boolean not null default false
);

comment on table public.ajustes_financeiros is
  'Quando a forma de pagamento muda depois de o recebimento já estar confirmado, o registro original não é tocado: a diferença entra aqui.';

create index ajustes_venda on public.ajustes_financeiros (venda_id);

create trigger auditar_ajustes_financeiros
  after insert or update or delete on public.ajustes_financeiros
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Recebimentos: venda, taxa e valor efetivo
-- ---------------------------------------------------------------------

alter table public.recebimentos
  add column venda_id uuid references public.vendas (id) on delete restrict,
  add column taxa_valor numeric(10, 2) not null default 0 check (taxa_valor >= 0),
  add column valor_recebido numeric(10, 2) check (valor_recebido >= 0);

-- Líquido previsto calculado pelo próprio banco: bruto menos taxa.
alter table public.recebimentos
  add column valor_liquido numeric(10, 2)
    generated always as (valor - taxa_valor) stored;

comment on column public.recebimentos.valor is 'Valor bruto previsto.';
comment on column public.recebimentos.valor_recebido is
  'O que de fato entrou. Preenchido na confirmação; diferente do líquido previsto vira recebido_divergencia.';

create index recebimentos_venda on public.recebimentos (venda_id);

-- Linhas antigas marcadas como recebidas ganham o valor efetivo = bruto,
-- ANTES de a constraint passar a valer — na ordem inversa ela recusaria.
update public.recebimentos
   set valor_recebido = valor
 where situacao = 'recebido' and valor_recebido is null;

-- A coerência agora inclui a divergência: recebido de qualquer jeito
-- exige data e valor efetivo.
alter table public.recebimentos drop constraint recebimento_coerente;
alter table public.recebimentos add constraint recebimento_coerente check (
  (situacao in ('recebido', 'recebido_divergencia')
    and recebido_em is not null and valor_recebido is not null)
  or (situacao not in ('recebido', 'recebido_divergencia')
    and recebido_em is null and valor_recebido is null)
);

-- ---------------------------------------------------------------------
-- Despesas: vencimento, forma, situação e observações
-- ---------------------------------------------------------------------

alter table public.despesas
  add column vencimento date,
  add column forma public.forma_pagamento,
  add column situacao public.situacao_despesa not null default 'pendente',
  add column observacoes text;

-- O que existia ganha vencimento = competência e a situação que os dados
-- já contavam: pago_em preenchido é despesa paga.
update public.despesas set vencimento = competencia where vencimento is null;
update public.despesas set situacao = 'paga' where pago_em is not null;

alter table public.despesas alter column vencimento set not null;

alter table public.despesas add constraint despesa_coerente check (
  (situacao = 'paga' and pago_em is not null)
  or (situacao <> 'paga' and pago_em is null)
);

comment on column public.despesas.competencia is
  'Mês a que a despesa pertence. O vencimento é quando ela cobra.';

-- ---------------------------------------------------------------------
-- Acesso
-- ---------------------------------------------------------------------

alter table public.taxas_cartao        enable row level security;
alter table public.vendas              enable row level security;
alter table public.venda_alteracoes    enable row level security;
alter table public.ajustes_financeiros enable row level security;

-- Taxas: todo mundo lê (o formulário de venda precisa); só a
-- administradora define.
create policy taxas_leitura on public.taxas_cartao
  for select to authenticated using (private.tem_acesso());
create policy taxas_escrita on public.taxas_cartao
  for all to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

-- Vendas: a recepção registra (com a taxa padrão — regra da aplicação);
-- editar é do financeiro. Sem política de DELETE: venda não se apaga.
create policy vendas_leitura on public.vendas
  for select to authenticated using (private.tem_acesso());
create policy vendas_insercao on public.vendas
  for insert to authenticated with check (private.tem_acesso());
create policy vendas_edicao on public.vendas
  for update to authenticated
  using (private.e_financeira()) with check (private.e_financeira());

-- Histórico: quem tem acesso lê; o financeiro escreve; ninguém edita
-- nem apaga — imutável no banco.
create policy alteracoes_leitura on public.venda_alteracoes
  for select to authenticated using (private.tem_acesso());
create policy alteracoes_insercao on public.venda_alteracoes
  for insert to authenticated with check (private.e_financeira());

create policy ajustes_leitura on public.ajustes_financeiros
  for select to authenticated using (private.tem_acesso());
create policy ajustes_insercao on public.ajustes_financeiros
  for insert to authenticated with check (private.e_financeira());

-- Despesas deixam de ser exclusivas da administradora: o perfil
-- financeiro também opera. A recepção segue sem enxergar.
drop policy if exists despesas_admin on public.despesas;
create policy despesas_financeiro on public.despesas
  for all to authenticated
  using (private.e_financeira()) with check (private.e_financeira());
