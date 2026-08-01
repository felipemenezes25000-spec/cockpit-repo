-- =====================================================================
-- Cockpit Consultório — Migração 0001: fundação
--
-- Cria o núcleo do sistema: identidade, cadastro, agenda, relacionamento
-- e financeiro. O conteúdo clínico (fichas de atendimento, anamneses e
-- termos) entra na Etapa 5, com a modelagem própria do CRBM.
--
-- Perfis desta etapa: administradora e recepção.
-- A recepção não acessa despesas nem o consolidado financeiro.
--
-- Dado de saúde é dado pessoal sensível (LGPD, art. 5º, II): RLS fica
-- ligada em todas as tabelas e nenhuma política é aberta ao público.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------

create type public.papel_usuario as enum ('administradora', 'recepcao');

create type public.situacao_atendimento as enum (
  'agendado',
  'aguardando_confirmacao',
  'confirmado',
  'em_atendimento',
  'concluido',
  'cancelado',
  'ausente'
);

create type public.prioridade as enum ('alta', 'media', 'baixa');

create type public.tipo_pendencia as enum (
  'anamnese',
  'termo',
  'confirmacao',
  'pagamento',
  'retorno',
  'pesquisa',
  'outro'
);

create type public.situacao_pendencia as enum ('aberta', 'resolvida', 'cancelada');

create type public.situacao_acompanhamento as enum (
  'nao_iniciado',
  'em_contato',
  'aguardando_resposta',
  'agendado',
  'recusado'
);

create type public.situacao_recebimento as enum ('em_aberto', 'recebido', 'cancelado');

create type public.forma_pagamento as enum (
  'pix',
  'credito',
  'debito',
  'dinheiro',
  'transferencia'
);

create type public.categoria_despesa as enum (
  'produtos',
  'estrutura',
  'equipe',
  'marketing',
  'impostos',
  'outros'
);

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Identidade e acesso
-- ---------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  papel public.papel_usuario not null default 'recepcao',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.perfis is
  'Usuário do sistema. Estende auth.users com nome e papel de acesso.';

create trigger perfis_atualizado_em
  before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- Papel do usuário logado. SECURITY DEFINER para as políticas de RLS
-- poderem ler a tabela sem cair em recursão.
create or replace function public.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select papel
    from public.perfis
   where id = auth.uid()
     and ativo
$$;

create or replace function public.e_administradora()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(public.papel_atual() = 'administradora', false)
$$;

-- Todo usuário autenticado precisa ter perfil ativo para enxergar qualquer coisa.
create or replace function public.tem_acesso()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.perfis where id = auth.uid() and ativo
  )
$$;

-- Cria o perfil assim que alguém é convidado pelo painel do Supabase.
-- O papel padrão é o mais restrito: promover é decisão da administradora.
create or replace function public.criar_perfil_para_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'papel')::public.papel_usuario, 'recepcao')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil_para_novo_usuario();

-- ---------------------------------------------------------------------
-- Equipe e catálogo
-- ---------------------------------------------------------------------

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  -- Um profissional pode existir na agenda sem ter login no sistema.
  perfil_id uuid unique references public.perfis (id) on delete set null,
  nome text not null,
  especialidade text,
  registro_conselho text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger profissionais_atualizado_em
  before update on public.profissionais
  for each row execute function public.tocar_atualizado_em();

create table public.procedimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  duracao_min integer not null default 60 check (duracao_min > 0),
  valor_padrao numeric(10, 2) not null default 0 check (valor_padrao >= 0),
  -- Intervalo sugerido para o retorno. Definido pela equipe, não pelo sistema.
  retorno_sugerido_dias integer check (retorno_sugerido_dias > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger procedimentos_atualizado_em
  before update on public.procedimentos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Pacientes
-- ---------------------------------------------------------------------

create table public.pacientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  -- Nome social tem precedência na interface sempre que preenchido.
  nome_social text,
  cpf text,
  data_nascimento date,
  telefone text,
  email text,
  endereco jsonb,
  observacoes text,
  origem text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null
);

comment on column public.pacientes.observacoes is
  'Anotação administrativa. Conteúdo clínico não entra aqui — vai para a ficha de atendimento na Etapa 5.';

-- CPF é opcional, mas não pode repetir quando informado.
create unique index pacientes_cpf_unico
  on public.pacientes (cpf)
  where cpf is not null;

create index pacientes_nome_busca on public.pacientes using gin (to_tsvector('portuguese', nome));
create index pacientes_aniversario on public.pacientes (extract(month from data_nascimento));

create trigger pacientes_atualizado_em
  before update on public.pacientes
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Agenda
-- ---------------------------------------------------------------------

create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  profissional_id uuid not null references public.profissionais (id) on delete restrict,
  procedimento_id uuid not null references public.procedimentos (id) on delete restrict,
  inicio timestamptz not null,
  duracao_min integer not null check (duracao_min > 0),
  situacao public.situacao_atendimento not null default 'agendado',
  valor numeric(10, 2) not null default 0 check (valor >= 0),
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null
);

create index atendimentos_inicio on public.atendimentos (inicio);
create index atendimentos_paciente on public.atendimentos (paciente_id, inicio desc);
create index atendimentos_profissional_dia on public.atendimentos (profissional_id, inicio);

create trigger atendimentos_atualizado_em
  before update on public.atendimentos
  for each row execute function public.tocar_atualizado_em();

-- Trilha de mudanças de situação: quem confirmou, quem cancelou e quando.
create table public.atendimento_situacoes (
  id bigint generated always as identity primary key,
  atendimento_id uuid not null references public.atendimentos (id) on delete cascade,
  de public.situacao_atendimento,
  para public.situacao_atendimento not null,
  em timestamptz not null default now(),
  por uuid references public.perfis (id) on delete set null
);

create index atendimento_situacoes_atendimento
  on public.atendimento_situacoes (atendimento_id, em desc);

create or replace function public.registrar_situacao_atendimento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.atendimento_situacoes (atendimento_id, de, para, por)
    values (new.id, null, new.situacao, auth.uid());
  elsif new.situacao is distinct from old.situacao then
    insert into public.atendimento_situacoes (atendimento_id, de, para, por)
    values (new.id, old.situacao, new.situacao, auth.uid());
  end if;
  return new;
end;
$$;

create trigger atendimentos_trilha_situacao
  after insert or update of situacao on public.atendimentos
  for each row execute function public.registrar_situacao_atendimento();

-- ---------------------------------------------------------------------
-- Relacionamento
-- ---------------------------------------------------------------------

create table public.retornos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete cascade,
  atendimento_origem_id uuid references public.atendimentos (id) on delete set null,
  procedimento_id uuid references public.procedimentos (id) on delete set null,
  sugerido_para date not null,
  situacao public.situacao_acompanhamento not null default 'nao_iniciado',
  observacoes text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index retornos_sugerido on public.retornos (sugerido_para)
  where situacao not in ('agendado', 'recusado');

create trigger retornos_atualizado_em
  before update on public.retornos
  for each row execute function public.tocar_atualizado_em();

create table public.pendencias (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_pendencia not null,
  paciente_id uuid references public.pacientes (id) on delete cascade,
  atendimento_id uuid references public.atendimentos (id) on delete cascade,
  descricao text not null,
  prazo date,
  prioridade public.prioridade not null default 'media',
  situacao public.situacao_pendencia not null default 'aberta',
  responsavel_id uuid references public.perfis (id) on delete set null,
  resolvida_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pendencias_abertas on public.pendencias (prioridade, prazo)
  where situacao = 'aberta';

create trigger pendencias_atualizado_em
  before update on public.pendencias
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------

create table public.recebimentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete restrict,
  atendimento_id uuid references public.atendimentos (id) on delete set null,
  descricao text,
  valor numeric(10, 2) not null check (valor >= 0),
  forma public.forma_pagamento,
  situacao public.situacao_recebimento not null default 'em_aberto',
  vencimento date not null,
  recebido_em date,
  -- Parcela 2 de 6, por exemplo. Nulo quando é pagamento único.
  parcela integer check (parcela > 0),
  total_parcelas integer check (total_parcelas > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,

  -- Só faz sentido ter data de recebimento quando já foi recebido.
  constraint recebimento_coerente check (
    (situacao = 'recebido' and recebido_em is not null)
    or (situacao <> 'recebido' and recebido_em is null)
  )
);

create index recebimentos_vencimento on public.recebimentos (vencimento)
  where situacao = 'em_aberto';
create index recebimentos_competencia on public.recebimentos (recebido_em)
  where situacao = 'recebido';

create trigger recebimentos_atualizado_em
  before update on public.recebimentos
  for each row execute function public.tocar_atualizado_em();

create table public.despesas (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  categoria public.categoria_despesa not null default 'outros',
  valor numeric(10, 2) not null check (valor >= 0),
  competencia date not null,
  pago_em date,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null
);

create index despesas_competencia on public.despesas (competencia);

create trigger despesas_atualizado_em
  before update on public.despesas
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Auditoria
--
-- Registro de quem alterou o quê. Só a administradora lê, ninguém edita.
-- ---------------------------------------------------------------------

create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  acao text not null,
  ator_id uuid,
  em timestamptz not null default now(),
  dados jsonb
);

create index auditoria_registro on public.auditoria (tabela, registro_id, em desc);

create or replace function public.auditar()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alvo record;
begin
  alvo := coalesce(new, old);
  insert into public.auditoria (tabela, registro_id, acao, ator_id, dados)
  values (
    tg_table_name,
    (to_jsonb(alvo) ->> 'id'),
    tg_op,
    auth.uid(),
    case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end
  );
  return alvo;
end;
$$;

create trigger auditar_pacientes
  after insert or update or delete on public.pacientes
  for each row execute function public.auditar();

create trigger auditar_atendimentos
  after insert or update or delete on public.atendimentos
  for each row execute function public.auditar();

create trigger auditar_recebimentos
  after insert or update or delete on public.recebimentos
  for each row execute function public.auditar();

-- =====================================================================
-- Row Level Security
--
-- Regra geral: quem não tem perfil ativo não enxerga nada.
-- A recepção opera cadastro, agenda, relacionamento e recebimentos.
-- Despesas e auditoria ficam só com a administradora.
-- =====================================================================

alter table public.perfis                enable row level security;
alter table public.profissionais         enable row level security;
alter table public.procedimentos         enable row level security;
alter table public.pacientes             enable row level security;
alter table public.atendimentos          enable row level security;
alter table public.atendimento_situacoes enable row level security;
alter table public.retornos              enable row level security;
alter table public.pendencias            enable row level security;
alter table public.recebimentos          enable row level security;
alter table public.despesas              enable row level security;
alter table public.auditoria             enable row level security;

-- Perfis: cada um lê o próprio; a administradora lê e administra todos.
create policy perfis_le_proprio on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.e_administradora());

create policy perfis_atualiza_proprio_nome on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and papel = public.papel_atual());

create policy perfis_admin_gerencia on public.perfis
  for all to authenticated
  using (public.e_administradora())
  with check (public.e_administradora());

-- Equipe e catálogo: todo mundo lê, só a administradora altera.
create policy profissionais_leitura on public.profissionais
  for select to authenticated using (public.tem_acesso());
create policy profissionais_escrita on public.profissionais
  for all to authenticated
  using (public.e_administradora()) with check (public.e_administradora());

create policy procedimentos_leitura on public.procedimentos
  for select to authenticated using (public.tem_acesso());
create policy procedimentos_escrita on public.procedimentos
  for all to authenticated
  using (public.e_administradora()) with check (public.e_administradora());

-- Pacientes, agenda e relacionamento: os dois perfis operam.
create policy pacientes_operacao on public.pacientes
  for all to authenticated
  using (public.tem_acesso()) with check (public.tem_acesso());

create policy atendimentos_operacao on public.atendimentos
  for all to authenticated
  using (public.tem_acesso()) with check (public.tem_acesso());

create policy atendimento_situacoes_leitura on public.atendimento_situacoes
  for select to authenticated using (public.tem_acesso());

create policy retornos_operacao on public.retornos
  for all to authenticated
  using (public.tem_acesso()) with check (public.tem_acesso());

create policy pendencias_operacao on public.pendencias
  for all to authenticated
  using (public.tem_acesso()) with check (public.tem_acesso());

-- Recebimentos: a recepção lança e consulta.
create policy recebimentos_operacao on public.recebimentos
  for all to authenticated
  using (public.tem_acesso()) with check (public.tem_acesso());

-- Despesas: só a administradora.
create policy despesas_admin on public.despesas
  for all to authenticated
  using (public.e_administradora()) with check (public.e_administradora());

-- Auditoria: leitura restrita, escrita apenas pelos gatilhos.
create policy auditoria_admin_le on public.auditoria
  for select to authenticated using (public.e_administradora());
