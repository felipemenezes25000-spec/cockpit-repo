-- =====================================================================
-- Migração 0002: endurecimento das funções
--
-- Corrige o que o verificador de segurança do Supabase apontou na 0001:
--
-- 1. `tocar_atualizado_em` estava sem `search_path` fixo. Sem isso, quem
--    controla o search_path da sessão pode induzir a função a chamar um
--    objeto diferente do pretendido.
--
-- 2. Todas as funções nasciam executáveis por `public`, o que as expõe
--    como endpoint em /rest/v1/rpc/. As funções de gatilho não têm por que
--    ser chamadas de fora, e as funções auxiliares não interessam a quem
--    não está autenticado.
--
-- Gatilho continua disparando normalmente: o Postgres verifica EXECUTE na
-- criação do gatilho, não a cada disparo.
-- =====================================================================

-- 1. search_path fixo na função que faltava.
alter function public.tocar_atualizado_em()
  set search_path = public, pg_temp;

-- 2. Funções de gatilho: ninguém chama pela API.
revoke all on function public.tocar_atualizado_em()            from public, anon, authenticated;
revoke all on function public.auditar()                        from public, anon, authenticated;
revoke all on function public.registrar_situacao_atendimento() from public, anon, authenticated;
revoke all on function public.criar_perfil_para_novo_usuario()  from public, anon, authenticated;

-- 3. Funções auxiliares das políticas.
--
-- O `authenticated` precisa manter EXECUTE: expressões de RLS são avaliadas
-- com os privilégios de quem consulta, então tirar a permissão quebraria o
-- acesso de todo mundo. Quem não está autenticado não tem o que fazer com
-- elas — só reportam o papel de quem chama.
revoke all on function public.papel_atual()      from public, anon;
revoke all on function public.e_administradora() from public, anon;
revoke all on function public.tem_acesso()       from public, anon;

grant execute on function public.papel_atual()      to authenticated;
grant execute on function public.e_administradora() to authenticated;
grant execute on function public.tem_acesso()       to authenticated;
