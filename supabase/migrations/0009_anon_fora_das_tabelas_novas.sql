-- =====================================================================
-- Migração 0009: visitante anônimo fora das tabelas do Financeiro
--
-- A 0001 revogou o acesso do papel `anon` a todas as tabelas que
-- existiam NAQUELE momento. Tabela nova nasce com o grant padrão do
-- Supabase de volta — a RLS já não devolvia linha nenhuma, mas a
-- postura do projeto é o anônimo não alcançar nem a tabela (401, não
-- 200 vazio).
--
-- Regra para as próximas migrações: toda tabela nova termina com o
-- revoke de anon.
-- =====================================================================

revoke all on public.taxas_cartao        from anon;
revoke all on public.vendas              from anon;
revoke all on public.venda_alteracoes    from anon;
revoke all on public.ajustes_financeiros from anon;

-- E que as futuras já nasçam sem o grant.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on functions from anon;
