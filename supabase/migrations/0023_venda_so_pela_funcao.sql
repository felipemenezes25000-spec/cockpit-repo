-- =====================================================================
-- Migração 0023: venda só nasce e só muda pela função — e o recebimento
-- confirmado passa a ser coerente no banco
--
-- A dívida do AGENTS.md §13 ("Venda sem recebimento pela API"): a política
-- `vendas_insercao` da 0007 deixava qualquer perfil ativo inserir uma linha
-- em `vendas` direto pela API, sem passar por `venda_registrar`. O gatilho
-- da 0020 confere a taxa, mas a venda ficava SEM recebimento — dinheiro
-- vendido que nunca aparece "a receber", nem no painel, nem na ficha.
--
-- A mesma porta ao lado valia para as tabelas irmãs, que só fazem sentido
-- como efeito de `venda_alterar_pagamento`:
--
--   - `venda_alteracoes` (histórico): o financeiro podia inserir uma
--     "alteração" que nunca aconteceu — histórico falso numa tabela que
--     ninguém edita nem apaga;
--   - `ajustes_financeiros`: um ajuste solto, sem alteração nenhuma, entra
--     no "Líquido recebido" do mês;
--   - UPDATE direto em `vendas`: trocar forma ou taxa sem histórico e sem
--     reescrever o recebimento previsto — a venda diz uma coisa, o
--     recebimento outra;
--   - INSERT direto em `recebimentos` com `venda_id`: um segundo
--     recebimento para a mesma venda, fora de
--     `private.recebimento_da_venda_criar`, que é quem garante "um só";
--   - UPDATE direto em `recebimentos` de colunas que vêm da venda (valor,
--     taxa, forma, paciente, venda): o recebimento previsto deixa de
--     bater com a venda que o gerou.
--
-- Nenhuma dessas portas é usada pela aplicação — ela só chama
-- `venda_registrar` e `venda_alterar_pagamento`, e no recebimento só
-- confirma (situação, data e valor recebido) e muda a situação.
--
-- O que muda:
--
-- 1. `authenticated` perde INSERT e UPDATE em `vendas` e INSERT em
--    `venda_alteracoes` e `ajustes_financeiros`. As políticas de escrita
--    dessas tabelas saem junto: sem grant E sem política, uma concessão
--    esquecida no futuro continua não abrindo nada.
-- 2. As duas funções viram `SECURITY DEFINER` — é a única forma de gravar
--    numa tabela que a sessão não alcança — e conferem o perfil logo na
--    entrada, no lugar da RLS que deixa de valer dentro delas:
--      - `venda_registrar`: perfil ativo (era a política `vendas_insercao`);
--        taxa manual continua só do financeiro;
--      - `venda_alterar_pagamento`: financeiro ou administradora (42501),
--        como já fazia desde a 0020 antes de tocar qualquer linha.
--    `auth.uid()` continua sendo quem clicou: autor, auditoria, o gatilho
--    `vendas_confere_taxa` e `recebimentos_confirmado_imutavel` enxergam
--    a mesma sessão de antes.
-- 3. Recebimento: o financeiro continua inserindo recebimento SOLTO (sem
--    venda), como antes; o de venda nasce só pela porta da 0020. UPDATE
--    passa a ser por coluna — situação, data e valor recebido, o que a
--    confirmação e a mudança de situação gravam.
-- 4. A confirmação confere o que a ação já conferia (a regra da tela vira
--    regra do banco, sem regra nova):
--      - data do recebimento não está no futuro, no relógio da clínica
--        (America/Sao_Paulo, como `chaveDoDia` de `lib/dates.ts`);
--      - `recebido` é o líquido previsto; valor diferente é
--        `recebido_divergencia` (o comentário da coluna `valor_recebido`,
--        na 0007, já definia assim).
--    Vale para quem entra com sessão e só na passagem para confirmado.
--    Linha antiga não é revalidada; manutenção pelo SQL do projeto (sem
--    sessão) passa, como nas outras regras.
--
-- Dados existentes: nada é reescrito. Venda antiga sem recebimento
-- continua como está — esta migração fecha a porta, não corrige o que já
-- entrou por ela. Para conferir em produção:
--   select v.id from public.vendas v
--    where not exists (select 1 from public.recebimentos r where r.venda_id = v.id);
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Sem escrita direta nas tabelas da venda
-- ---------------------------------------------------------------------

revoke insert, update on public.vendas from authenticated;
revoke insert on public.venda_alteracoes from authenticated;
revoke insert on public.ajustes_financeiros from authenticated;
-- O id do histórico só é gerado dentro da função, que roda como dona.
revoke all on sequence public.venda_alteracoes_id_seq from authenticated;

drop policy if exists vendas_insercao on public.vendas;
drop policy if exists vendas_edicao on public.vendas;
drop policy if exists alteracoes_insercao on public.venda_alteracoes;
drop policy if exists ajustes_insercao on public.ajustes_financeiros;

-- ---------------------------------------------------------------------
-- 2. Recebimento: o de venda só pela porta; UPDATE por coluna
-- ---------------------------------------------------------------------

drop policy if exists recebimentos_insercao on public.recebimentos;
create policy recebimentos_insercao on public.recebimentos
  for insert to authenticated
  with check (private.e_financeira() and venda_id is null);

revoke update on public.recebimentos from authenticated;
grant update (situacao, recebido_em, valor_recebido) on public.recebimentos to authenticated;

-- ---------------------------------------------------------------------
-- 3. As duas operações de venda: a porta, com o perfil conferido nela
-- ---------------------------------------------------------------------

create or replace function public.venda_registrar(
  p_paciente_id uuid,
  p_procedimento_id uuid,
  p_data_venda date,
  p_valor_original numeric,
  p_desconto numeric,
  p_forma public.forma_pagamento,
  p_parcelas integer,
  p_taxa_cartao_id uuid,
  p_taxa_percentual numeric,
  p_taxa_valor numeric,
  p_taxa_manual boolean,
  p_taxa_justificativa text,
  p_observacoes text,
  p_situacao_inicial public.situacao_recebimento,
  p_vencimento date,
  p_recebido_em date,
  p_descricao text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venda_id uuid;
begin
  -- Era a política `vendas_insercao`. Dentro de uma função DEFINER a RLS
  -- não vale; o perfil é conferido aqui, antes de qualquer gravação.
  if not private.tem_acesso() then
    raise exception using
      errcode = '42501',
      message = 'Seu perfil não tem acesso a esta operação.';
  end if;

  if p_situacao_inicial not in ('previsto', 'recebido') then
    raise exception 'Situação inicial precisa ser prevista ou recebida.';
  end if;

  if p_data_venda is null then
    raise exception 'Informe a data da venda.';
  end if;

  if coalesce(p_taxa_manual, false) and not private.e_financeira() then
    raise exception 'Alterar a taxa é restrito ao financeiro e à administradora.';
  end if;

  -- Valores derivados aqui, das mesmas entradas que as CHECKs conferem; o
  -- gatilho `vendas_confere_taxa` confere a origem da taxa.
  insert into public.vendas (
    paciente_id, procedimento_id, data_venda,
    valor_original, desconto, valor_final,
    forma, parcelas,
    taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido,
    taxa_manual, taxa_justificativa, observacoes, criado_por
  ) values (
    p_paciente_id, p_procedimento_id, p_data_venda,
    p_valor_original, p_desconto, p_valor_original - p_desconto,
    p_forma, coalesce(p_parcelas, 1),
    p_taxa_cartao_id, coalesce(p_taxa_percentual, 0), coalesce(p_taxa_valor, 0),
    p_valor_original - p_desconto - coalesce(p_taxa_valor, 0),
    coalesce(p_taxa_manual, false),
    left(nullif(trim(p_taxa_justificativa), ''), 500),
    left(nullif(trim(p_observacoes), ''), 2000),
    auth.uid()
  )
  returning id into v_venda_id;

  perform private.recebimento_da_venda_criar(
    v_venda_id,
    p_situacao_inicial,
    case when p_situacao_inicial = 'recebido' then coalesce(p_vencimento, p_recebido_em) else p_vencimento end,
    p_recebido_em,
    p_descricao
  );

  return v_venda_id;
end;
$$;

-- O corpo da 0020 já confere `private.e_financeira()` (42501) antes de ler
-- ou gravar qualquer linha; só o modo de execução muda.
alter function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text)
  security definer;

revoke all on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text) from public, anon;
revoke all on function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text) from public, anon;
grant execute on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text) to authenticated;
grant execute on function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text) to authenticated;

comment on function public.venda_registrar is
  'Única porta da venda: grava a venda e o seu único recebimento na mesma transação. SECURITY DEFINER desde a 0023, com o perfil conferido na entrada.';
comment on function public.venda_alterar_pagamento is
  'Única porta da mudança de forma/taxa: histórico, venda e recebimento previsto (ou ajuste, se já confirmado) na mesma transação. Só financeiro e administradora. SECURITY DEFINER desde a 0023.';

-- ---------------------------------------------------------------------
-- 4. Confirmação coerente
-- ---------------------------------------------------------------------

-- INVOKER: só confere NEW (regra 11 das migrações).
create or replace function private.recebimento_confirmacao_coerente()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.situacao not in ('recebido', 'recebido_divergencia') then
    return new;
  end if;

  -- Já estava confirmado: quem responde é `recebimento_confirmado_imutavel`.
  if tg_op = 'UPDATE' and old.situacao in ('recebido', 'recebido_divergencia') then
    return new;
  end if;

  if new.recebido_em > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data do recebimento não pode estar no futuro.';
  end if;

  -- `valor_liquido` é coluna gerada: num BEFORE ela ainda não foi calculada.
  if (new.situacao = 'recebido') <> (new.valor_recebido = new.valor - new.taxa_valor) then
    raise exception 'Recebido pelo líquido previsto é "recebido"; valor diferente é "recebido com divergência".';
  end if;

  return new;
end;
$$;

revoke all on function private.recebimento_confirmacao_coerente() from public, anon, authenticated;

create trigger recebimentos_confirmacao_coerente
  before insert or update of situacao, recebido_em, valor_recebido
  on public.recebimentos
  for each row execute function private.recebimento_confirmacao_coerente();
