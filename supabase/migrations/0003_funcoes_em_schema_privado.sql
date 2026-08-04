-- =====================================================================
-- Migração 0003: funções auxiliares fora do schema exposto
--
-- `papel_atual`, `e_administradora` e `tem_acesso` são usadas dentro das
-- políticas de RLS. Como expressões de política são avaliadas com os
-- privilégios de quem consulta, o papel `authenticated` precisa manter
-- EXECUTE nelas — não dá simplesmente para revogar.
--
-- A saída é tirá-las do `public`: o PostgREST só publica os schemas
-- configurados, então nada em `private` vira endpoint em /rest/v1/rpc/.
-- As políticas continuam funcionando porque podem referenciar qualquer
-- schema.
-- =====================================================================

create schema if not exists private;

grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Funções, agora em `private`
-- ---------------------------------------------------------------------

create or replace function private.papel_atual()
returns public.papel_usuario
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

create or replace function private.e_administradora()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(private.papel_atual() = 'administradora', false)
$$;

create or replace function private.tem_acesso()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.perfis where id = auth.uid() and ativo)
$$;

revoke all on function private.papel_atual()      from public, anon;
revoke all on function private.e_administradora() from public, anon;
revoke all on function private.tem_acesso()       from public, anon;

grant execute on function private.papel_atual()      to authenticated;
grant execute on function private.e_administradora() to authenticated;
grant execute on function private.tem_acesso()       to authenticated;

-- ---------------------------------------------------------------------
-- Políticas reapontadas para `private`
-- ---------------------------------------------------------------------

drop policy if exists perfis_le_proprio             on public.perfis;
drop policy if exists perfis_atualiza_proprio_nome  on public.perfis;
drop policy if exists perfis_admin_gerencia         on public.perfis;

create policy perfis_le_proprio on public.perfis
  for select to authenticated
  using (id = auth.uid() or private.e_administradora());

create policy perfis_atualiza_proprio_nome on public.perfis
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and papel = private.papel_atual());

create policy perfis_admin_gerencia on public.perfis
  for all to authenticated
  using (private.e_administradora())
  with check (private.e_administradora());

drop policy if exists profissionais_leitura on public.profissionais;
drop policy if exists profissionais_escrita on public.profissionais;

create policy profissionais_leitura on public.profissionais
  for select to authenticated using (private.tem_acesso());
create policy profissionais_escrita on public.profissionais
  for all to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

drop policy if exists procedimentos_leitura on public.procedimentos;
drop policy if exists procedimentos_escrita on public.procedimentos;

create policy procedimentos_leitura on public.procedimentos
  for select to authenticated using (private.tem_acesso());
create policy procedimentos_escrita on public.procedimentos
  for all to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

drop policy if exists pacientes_operacao on public.pacientes;
create policy pacientes_operacao on public.pacientes
  for all to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists atendimentos_operacao on public.atendimentos;
create policy atendimentos_operacao on public.atendimentos
  for all to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists atendimento_situacoes_leitura on public.atendimento_situacoes;
create policy atendimento_situacoes_leitura on public.atendimento_situacoes
  for select to authenticated using (private.tem_acesso());

drop policy if exists retornos_operacao on public.retornos;
create policy retornos_operacao on public.retornos
  for all to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists pendencias_operacao on public.pendencias;
create policy pendencias_operacao on public.pendencias
  for all to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists recebimentos_operacao on public.recebimentos;
create policy recebimentos_operacao on public.recebimentos
  for all to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists despesas_admin on public.despesas;
create policy despesas_admin on public.despesas
  for all to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

drop policy if exists auditoria_admin_le on public.auditoria;
create policy auditoria_admin_le on public.auditoria
  for select to authenticated using (private.e_administradora());

-- ---------------------------------------------------------------------
-- Remove as versões públicas
-- ---------------------------------------------------------------------

drop function if exists public.e_administradora();
drop function if exists public.tem_acesso();
drop function if exists public.papel_atual();
