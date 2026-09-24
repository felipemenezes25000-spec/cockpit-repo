-- =====================================================================
-- Migração 0030: acompanhamento comercial dos leads
--
-- A etapa diz ONDE a oportunidade está. Esta migração passa a registrar
-- QUANDO a equipe falou com ela e QUANDO combinou falar de novo, sem misturar
-- isso com o relacionamento de pacientes ou com conteúdo clínico.
-- =====================================================================

alter table public.leads
  add column ultimo_contato_em timestamptz,
  add column proximo_contato date;

create index leads_proximo_contato
  on public.leads (proximo_contato, criado_em)
  where proximo_contato is not null
    and etapa not in ('ganho', 'perdido');

create index leads_ultimo_contato
  on public.leads (ultimo_contato_em)
  where etapa not in ('ganho', 'perdido');

create table public.lead_interacoes (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete restrict,
  canal text not null check (canal in ('whatsapp', 'telefone', 'instagram', 'email', 'presencial', 'outro')),
  observacao text check (observacao is null or char_length(observacao) <= 1000),
  proximo_contato date,
  por uuid references public.perfis (id) on delete set null default auth.uid(),
  em timestamptz not null default now()
);

create index lead_interacoes_lead_em
  on public.lead_interacoes (lead_id, em desc, id desc);

create index lead_interacoes_proximo_contato
  on public.lead_interacoes (proximo_contato)
  where proximo_contato is not null;

-- A interação é append-only. Este gatilho mantém no lead apenas o resumo que
-- a carteira precisa para ordenar/alertar sem reconstruir todo o histórico.
create or replace function private.lead_interacao_atualiza_resumo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.leads
     set ultimo_contato_em = new.em,
         proximo_contato = new.proximo_contato
   where id = new.lead_id;

  return new;
end;
$$;

revoke all on function private.lead_interacao_atualiza_resumo()
  from public, anon, authenticated;

create trigger lead_interacao_atualiza_resumo
  after insert on public.lead_interacoes
  for each row execute function private.lead_interacao_atualiza_resumo();

alter table public.lead_interacoes enable row level security;

create policy lead_interacoes_leitura on public.lead_interacoes
  for select to authenticated
  using (private.tem_acesso());

-- Contato comercial é operação de recepção/admin e só existe enquanto a
-- oportunidade está aberta. Depois de ganho, o acompanhamento volta para os
-- módulos de paciente/relacionamento; perdido precisa ser reaberto primeiro.
create policy lead_interacoes_insercao on public.lead_interacoes
  for insert to authenticated
  with check (
    private.papel_atual() in ('administradora', 'recepcao')
    and exists (
      select 1
        from public.leads l
       where l.id = lead_id
         and l.etapa not in ('ganho', 'perdido')
    )
  );

-- Não há UPDATE nem DELETE: corrigir o próximo passo significa registrar uma
-- nova interação, preservando o que foi informado anteriormente.
grant select on public.lead_interacoes to authenticated;
grant insert (lead_id, canal, observacao, proximo_contato)
  on public.lead_interacoes to authenticated;

revoke all on public.lead_interacoes from anon, public;

comment on table public.lead_interacoes is
  'Histórico imutável dos contatos comerciais feitos antes da conversão em paciente/venda.';
comment on column public.leads.ultimo_contato_em is
  'Resumo derivado da interação comercial mais recente; escrito apenas pelo gatilho da 0030.';
comment on column public.leads.proximo_contato is
  'Próxima data combinada no contato comercial mais recente; escrito apenas pelo gatilho da 0030.';
