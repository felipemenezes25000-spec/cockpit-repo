-- =====================================================================
-- Migração 0021: choque de horário recusado pelo banco, não só pela tela
--
-- A regra existe desde a Agenda (AGENTS.md §8.2): o mesmo profissional
-- não atende duas pacientes ao mesmo tempo; cancelado e ausente liberam a
-- vaga. Mas quem garantia era só `conflitoDeHorario`, na ação de
-- servidor, num padrão "ler e depois escrever". Duas recepcionistas
-- marcando o mesmo horário no mesmo segundo liam a agenda vazia as duas,
-- e as duas gravavam. Overbooking real, sem erro nenhum.
--
-- E havia um acoplamento frágil: a ação varre uma janela de 8 horas para
-- trás porque a duração máxima é 480 minutos. Aumentar um sem o outro
-- criava overbooking silencioso.
--
-- Esta migração põe a garantia onde ela não tem janela nem corrida:
--
--   - Um gatilho BEFORE INSERT/UPDATE compara o intervalo inteiro
--     [inicio, inicio + duracao) com os atendimentos ativos do mesmo
--     profissional. Sem janela: a sobreposição é exata.
--   - Antes de ler, trava o profissional com `pg_advisory_xact_lock`.
--     Duas gravações simultâneas para a mesma pessoa passam uma de cada
--     vez; a segunda enxerga a primeira já gravada e é recusada.
--     Profissionais diferentes não esperam um pelo outro.
--   - O erro sai como `23P01` (exclusion_violation), que é o que ele é. A
--     ação continua conferindo antes, para dizer COM QUEM choca; o banco
--     é a rede para a corrida.
--
-- Uma decisão consciente: reabrir um atendimento cancelado ou ausente
-- também passa pela conferência. Reabrir devolve a paciente a um
-- horário; se ele foi ocupado nesse meio-tempo, gravar criaria o
-- overbooking que a regra existe para impedir. A tela avisa e a pessoa
-- remarca.
--
-- Não é uma constraint de exclusão (`exclude using gist`) de propósito:
-- ela validaria as linhas antigas no ato, e um choque legado qualquer na
-- base de produção faria a migração inteira falhar. O gatilho vale da
-- gravação em diante.
-- =====================================================================

create or replace function private.atendimento_sem_choque()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ocupa_antes boolean;
  v_outro_inicio timestamptz;
begin
  -- Cancelado e ausente não ocupam a vaga.
  if new.situacao in ('cancelado', 'ausente') then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_ocupa_antes := old.situacao not in ('cancelado', 'ausente');
    -- Nada que mude o intervalo ocupado: só situação entre estados ativos,
    -- valor, observação.
    if v_ocupa_antes
       and new.inicio = old.inicio
       and new.duracao_min = old.duracao_min
       and new.profissional_id = old.profissional_id then
      return new;
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('agenda:' || new.profissional_id::text, 0)
  );

  select a.inicio into v_outro_inicio
    from public.atendimentos a
   where a.profissional_id = new.profissional_id
     and a.id <> new.id
     and a.situacao not in ('cancelado', 'ausente')
     and a.inicio < new.inicio + make_interval(mins => new.duracao_min)
     and a.inicio + make_interval(mins => a.duracao_min) > new.inicio
   limit 1;

  if found then
    raise exception using
      errcode = '23P01',
      message = 'Choque de horário com outro atendimento do mesmo profissional.';
  end if;

  return new;
end;
$$;

revoke all on function private.atendimento_sem_choque() from public, anon, authenticated;

create trigger atendimentos_sem_choque
  before insert or update of inicio, duracao_min, profissional_id, situacao
  on public.atendimentos
  for each row execute function private.atendimento_sem_choque();
