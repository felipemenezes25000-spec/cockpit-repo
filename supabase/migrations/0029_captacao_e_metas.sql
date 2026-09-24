-- =====================================================================
-- Migração 0029: captação, funil comercial e metas mensais
--
-- O módulo nasce separado de Pacientes: lead ainda não é paciente. Quando a
-- pessoa entra de fato na clínica, o lead pode ser vinculado a `pacientes` e
-- uma venda vinculada ao mesmo paciente converte o lead aberto mais recente.
-- =====================================================================

create type public.etapa_lead as enum (
  'novo',
  'qualificado',
  'agendamento',
  'ganho',
  'perdido'
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(trim(nome)) between 3 and 120),
  telefone text,
  email text,
  origem text not null default 'Outro' check (char_length(origem) <= 60),
  campanha text check (campanha is null or char_length(campanha) <= 120),
  procedimento_interesse_id uuid references public.procedimentos (id) on delete set null,
  etapa public.etapa_lead not null default 'novo',
  paciente_id uuid references public.pacientes (id) on delete set null,
  venda_id uuid references public.vendas (id) on delete set null,
  motivo_perda text check (motivo_perda is null or char_length(motivo_perda) <= 300),
  observacoes text check (observacoes is null or char_length(observacoes) <= 2000),
  criado_por uuid references public.perfis (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (etapa <> 'perdido' or motivo_perda is not null),
  check (etapa <> 'ganho' or motivo_perda is null)
);

create index leads_criado_em on public.leads (criado_em desc);
create index leads_etapa on public.leads (etapa, criado_em desc);
create index leads_origem on public.leads (origem, criado_em desc);
create index leads_paciente on public.leads (paciente_id) where paciente_id is not null;
create index leads_procedimento on public.leads (procedimento_interesse_id) where procedimento_interesse_id is not null;

create trigger leads_atualizado_em
  before update on public.leads
  for each row execute function public.tocar_atualizado_em();

create table public.lead_etapas (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete restrict,
  de public.etapa_lead,
  para public.etapa_lead not null,
  por uuid references public.perfis (id) on delete set null,
  em timestamptz not null default now()
);

create index lead_etapas_lead_em on public.lead_etapas (lead_id, em desc);
create index lead_etapas_para_em on public.lead_etapas (para, em desc);

create table public.metas_comerciais (
  id uuid primary key default gen_random_uuid(),
  competencia date not null,
  procedimento_id uuid references public.procedimentos (id) on delete restrict,
  meta_faturamento numeric(12, 2) not null check (meta_faturamento >= 0),
  ticket_medio_planejado numeric(10, 2) not null check (ticket_medio_planejado > 0),
  taxa_lead_qualificado numeric(5, 2) not null default 50 check (taxa_lead_qualificado > 0 and taxa_lead_qualificado <= 100),
  taxa_qualificado_agendamento numeric(5, 2) not null default 50 check (taxa_qualificado_agendamento > 0 and taxa_qualificado_agendamento <= 100),
  taxa_agendamento_venda numeric(5, 2) not null default 50 check (taxa_agendamento_venda > 0 and taxa_agendamento_venda <= 100),
  criado_por uuid references public.perfis (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  check (competencia = date_trunc('month', competencia)::date)
);

create unique index metas_comerciais_mes_geral
  on public.metas_comerciais (competencia)
  where procedimento_id is null;

create unique index metas_comerciais_mes_procedimento
  on public.metas_comerciais (competencia, procedimento_id)
  where procedimento_id is not null;

create trigger metas_comerciais_atualizado_em
  before update on public.metas_comerciais
  for each row execute function public.tocar_atualizado_em();

-- A trilha é escrita pelo banco. A aplicação não insere nela diretamente.
create or replace function private.lead_registrar_etapa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_etapas (lead_id, de, para, por)
    values (new.id, null, new.etapa, auth.uid());
  elsif new.etapa is distinct from old.etapa then
    insert into public.lead_etapas (lead_id, de, para, por)
    values (new.id, old.etapa, new.etapa, auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function private.lead_registrar_etapa() from public, anon, authenticated;

create trigger lead_etapa_historico
  after insert or update of etapa on public.leads
  for each row execute function private.lead_registrar_etapa();

-- Quando uma venda nasce, converte o lead aberto mais recente daquele paciente.
-- Isso fecha o ciclo sem fazer o Financeiro conhecer regras de interface da Captação.
create or replace function private.venda_converte_lead()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  alvo uuid;
begin
  select id into alvo
    from public.leads
   where paciente_id = new.paciente_id
     and etapa not in ('ganho', 'perdido')
   order by criado_em desc, id desc
   limit 1;

  if alvo is not null then
    update public.leads
       set etapa = 'ganho',
           venda_id = new.id,
           motivo_perda = null
     where id = alvo;
  end if;

  return new;
end;
$$;

revoke all on function private.venda_converte_lead() from public, anon, authenticated;

create trigger venda_converte_lead
  after insert on public.vendas
  for each row execute function private.venda_converte_lead();

-- Auditoria das duas superfícies editáveis do módulo.
create trigger auditar_leads
  after insert or update on public.leads
  for each row execute function public.auditar();

create trigger auditar_metas_comerciais
  after insert or update on public.metas_comerciais
  for each row execute function public.auditar();

alter table public.leads enable row level security;
alter table public.lead_etapas enable row level security;
alter table public.metas_comerciais enable row level security;

-- Todos os perfis ativos enxergam o funil. Recepção e administradora operam
-- leads; financeiro acompanha, mas não altera a carteira comercial.
create policy leads_leitura on public.leads
  for select to authenticated using (private.tem_acesso());
create policy leads_insercao on public.leads
  for insert to authenticated
  with check (private.papel_atual() in ('administradora', 'recepcao'));
create policy leads_edicao on public.leads
  for update to authenticated
  using (private.papel_atual() in ('administradora', 'recepcao'))
  with check (private.papel_atual() in ('administradora', 'recepcao'));

create policy lead_etapas_leitura on public.lead_etapas
  for select to authenticated using (private.tem_acesso());

-- Meta é decisão de gestão/financeiro; todos podem ler para saber o alvo.
create policy metas_comerciais_leitura on public.metas_comerciais
  for select to authenticated using (private.tem_acesso());
create policy metas_comerciais_insercao on public.metas_comerciais
  for insert to authenticated with check (private.e_financeira());
create policy metas_comerciais_edicao on public.metas_comerciais
  for update to authenticated
  using (private.e_financeira()) with check (private.e_financeira());

-- Privilégio por coluna: a aplicação não ganha porta para fabricar autoria,
-- timestamps, `venda_id` ou reescrever a competência de uma meta pela API.
grant usage on type public.etapa_lead to authenticated;
grant select on public.leads to authenticated;
grant insert (
  nome, telefone, email, origem, campanha, procedimento_interesse_id,
  etapa, paciente_id, motivo_perda, observacoes
) on public.leads to authenticated;
grant update (
  nome, telefone, email, origem, campanha, procedimento_interesse_id,
  etapa, paciente_id, motivo_perda, observacoes
) on public.leads to authenticated;

grant select on public.lead_etapas to authenticated;

grant select on public.metas_comerciais to authenticated;
grant insert (
  competencia, procedimento_id, meta_faturamento, ticket_medio_planejado,
  taxa_lead_qualificado, taxa_qualificado_agendamento, taxa_agendamento_venda
) on public.metas_comerciais to authenticated;
grant update (
  meta_faturamento, ticket_medio_planejado,
  taxa_lead_qualificado, taxa_qualificado_agendamento, taxa_agendamento_venda
) on public.metas_comerciais to authenticated;

revoke all on public.leads, public.lead_etapas, public.metas_comerciais from anon, public;

comment on table public.leads is
  'Oportunidades comerciais antes de virarem pacientes. Não apaga; encerra como perdido.';
comment on table public.lead_etapas is
  'Trilha imutável das mudanças de etapa do funil, escrita por gatilho.';
comment on table public.metas_comerciais is
  'Metas mensais e premissas de conversão. procedimento_id nulo significa meta geral da clínica.';
