-- =====================================================================
-- Migração 0026: a marca de exemplo só muda sem sessão, e duas arestas de
-- privilégio da 0024/0025
--
-- 1. A MARCA `exemplo` NÃO SE GRAVA PELA API.
--    `npm run dados:limpar` (supabase/dados-exemplo-limpar.sql) roda em
--    produção e apaga o que tem `exemplo = true`. Os grants de INSERT e
--    UPDATE da 0019 são por tabela, então a coluna `exemplo` entrava neles:
--    qualquer sessão marcava um paciente ou atendimento REAL como exemplo
--    (ou cadastrava um já marcado), e a próxima limpeza o apagava. A
--    aplicação nunca escreve essa coluna.
--
--    `private.exemplo_so_sem_sessao()` recusa (42501), com sessão de
--    usuário, INSERT com `exemplo = true` e UPDATE que troque a marca —
--    nas dez tabelas que a limpeza apaga. Sem sessão (`auth.uid()` nulo:
--    o seed, `dados:exemplo`, `dados:limpar`, o SQL editor) passa, como
--    manda a regra dos gatilhos de sessão (AGENTS.md §4, item 8). Gatilho
--    em vez de grant por coluna: coluna nova da tabela não precisa entrar
--    em lista nenhuma, e as funções DEFINER (venda) também ficam presas.
--
-- 2. `private.sem_acento` PARA `service_role`.
--    A 0025 revogou de `public` e concedeu só a `authenticated`. A coluna
--    gerada `pacientes.busca` chama a função em todo INSERT/UPDATE, então
--    uma rotina administrativa com a chave de serviço não gravava paciente
--    ("permission denied for function sem_acento").
--
-- 3. SEQUÊNCIA NOVA NASCE SÓ COM USAGE PARA `authenticated`.
--    A 0024 tirou UPDATE (setval) e SELECT das sequências existentes, mas o
--    privilégio padrão do `postgres` em `public` continuava concedendo
--    `rwU` a `authenticated`: a próxima tabela com identity/bigserial
--    voltaria a deixar a sessão empurrar a sequência. Fica só USAGE
--    (nextval), que é o que o INSERT precisa. O padrão do
--    `supabase_admin` (que ainda concede a `anon`) só vale para objetos
--    criados por ele, nunca por migração, e o `postgres` não pode
--    alterá-lo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Marca de exemplo
-- ---------------------------------------------------------------------

create or replace function private.exemplo_so_sem_sessao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if (tg_op = 'INSERT' and new.exemplo)
     or (tg_op = 'UPDATE' and new.exemplo is distinct from old.exemplo) then
    raise exception using
      errcode = '42501',
      message = 'A marca de dado de exemplo não se altera pela aplicação.';
  end if;

  return new;
end;
$$;

revoke all on function private.exemplo_so_sem_sessao() from public, anon, authenticated;

comment on function private.exemplo_so_sem_sessao is
  'Com sessão de usuário, recusa INSERT marcado como exemplo e UPDATE que troque a marca (0026). Sem sessão passa.';

create trigger pacientes_exemplo_so_sem_sessao
  before insert or update on public.pacientes
  for each row execute function private.exemplo_so_sem_sessao();
create trigger profissionais_exemplo_so_sem_sessao
  before insert or update on public.profissionais
  for each row execute function private.exemplo_so_sem_sessao();
create trigger procedimentos_exemplo_so_sem_sessao
  before insert or update on public.procedimentos
  for each row execute function private.exemplo_so_sem_sessao();
create trigger atendimentos_exemplo_so_sem_sessao
  before insert or update on public.atendimentos
  for each row execute function private.exemplo_so_sem_sessao();
create trigger retornos_exemplo_so_sem_sessao
  before insert or update on public.retornos
  for each row execute function private.exemplo_so_sem_sessao();
create trigger pendencias_exemplo_so_sem_sessao
  before insert or update on public.pendencias
  for each row execute function private.exemplo_so_sem_sessao();
create trigger recebimentos_exemplo_so_sem_sessao
  before insert or update on public.recebimentos
  for each row execute function private.exemplo_so_sem_sessao();
create trigger despesas_exemplo_so_sem_sessao
  before insert or update on public.despesas
  for each row execute function private.exemplo_so_sem_sessao();
create trigger vendas_exemplo_so_sem_sessao
  before insert or update on public.vendas
  for each row execute function private.exemplo_so_sem_sessao();
create trigger ajustes_financeiros_exemplo_so_sem_sessao
  before insert or update on public.ajustes_financeiros
  for each row execute function private.exemplo_so_sem_sessao();

-- ---------------------------------------------------------------------
-- 2. Busca sem acento para a chave de serviço
-- ---------------------------------------------------------------------

grant execute on function private.sem_acento(text) to service_role;

-- ---------------------------------------------------------------------
-- 3. Privilégio padrão das sequências
-- ---------------------------------------------------------------------

alter default privileges in schema public revoke select, update on sequences from authenticated;
