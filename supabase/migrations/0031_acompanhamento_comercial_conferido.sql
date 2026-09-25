-- =====================================================================
-- Migração 0031: o acompanhamento comercial conferido pelo banco
--
-- A 0030 criou `lead_interacoes` e o resumo em `leads` (último contato e
-- próximo retorno). A auditoria de 24/09/2026 apontou o que só o banco
-- fecha, e esta migração fecha — sem reescrever a 0030, que pode já estar
-- aplicada em algum ambiente (migração aplicada é imutável, AGENTS.md §4).
--
-- 1. LEAD ENCERRADO NÃO GUARDA RETORNO. Ganho ou perdido, `proximo_contato`
--    continuava preenchido: a data velha seguia "vencendo" num lead que não
--    se acompanha mais. `private.lead_encerrado_sem_retorno` limpa o resumo
--    em toda passagem para ganho/perdido — pela carteira, pela venda
--    (gatilho da 0029) ou por qualquer porta — e a CHECK
--    `leads_encerrado_sem_retorno` torna isso invariante. O histórico em
--    `lead_interacoes` fica intacto: só o resumo sai. Lead reaberto volta
--    sem retorno; o próximo contato registrado programa outro.
--
-- 2. CONTATO CONFERIDO NA ENTRADA (`private.lead_interacao_conferida`).
--    - Trava a linha do lead (FOR NO KEY UPDATE) antes de conferir a etapa.
--      Sem a trava, um contato registrado no instante em que outra pessoa
--      encerra o lead passava pela RLS, que leu a etapa antiga, e reescrevia
--      o resumo de um lead já fechado. É o cuidado da conversão em paciente
--      (0029).
--    - Lead encerrado recusa com frase legível (P0001). A política da 0030
--      continua valendo, mas só respondia "row-level security".
--    - O próximo contato não nasce no passado: "hoje" é o dia da clínica
--      (America/Sao_Paulo, como `chaveDoDia` de `lib/dates.ts`), a mesma
--      regra de `registrarContatoLead`. Uma data que já passou continua
--      existindo — é o retorno atrasado —, mas só porque nasceu válida.
--    - Sem sessão (manutenção pelo SQL do projeto, AGENTS.md §4 regra 8)
--      passa: é por aí que se importa um histórico antigo.
--
-- 3. O RESUMO SÓ ANDA PARA A FRENTE. O gatilho da 0030 copiava para o lead
--    a interação que acabava de entrar, qualquer que fosse o `em`. Pela API
--    o `em` é sempre `now()`, mas uma importação de contatos antigos pelo
--    SQL trocaria o último contato por um mais velho. Agora só a interação
--    mais recente (ou empatada) escreve o resumo.
--
-- 4. AUDITORIA. `lead_interacoes` entra na auditoria geral (INSERT, UPDATE
--    e DELETE). Pela API a tabela só recebe INSERT, com autor e hora
--    escritos pelo banco — a trilha já está na própria linha —, mas a
--    observação é dado pessoal de quem ainda não é paciente (§4 regra 4), e
--    uma correção ou remoção pelo SQL do projeto, que passa por cima dos
--    grants, precisa deixar rastro.
--
-- 5. SEQUÊNCIA DA TRILHA DE ETAPAS SEM `authenticated`. `lead_etapas` só é
--    escrita pelo gatilho `private.lead_registrar_etapa` (DEFINER). O USAGE
--    que o padrão da 0026 deixou para a sessão só servia para empurrar a
--    sequência (§4 regra 12, como a 0024 fez com as outras trilhas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Lead encerrado não guarda retorno
-- ---------------------------------------------------------------------

-- Só mexe em NEW: pode ser INVOKER (§4 regra 11).
create or replace function private.lead_encerrado_sem_retorno()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.etapa in ('ganho', 'perdido') then
    new.proximo_contato := null;
  end if;
  return new;
end;
$$;

revoke all on function private.lead_encerrado_sem_retorno() from public, anon, authenticated;

comment on function private.lead_encerrado_sem_retorno is
  'Lead ganho ou perdido não guarda próximo contato: limpo na passagem e em toda escrita do resumo (0031). O histórico em lead_interacoes fica.';

create trigger lead_encerrado_sem_retorno
  before insert or update of etapa, proximo_contato on public.leads
  for each row execute function private.lead_encerrado_sem_retorno();

-- Ambiente em que a 0030 já rodou: lead que fechou antes desta migração.
update public.leads
   set proximo_contato = null
 where etapa in ('ganho', 'perdido')
   and proximo_contato is not null;

alter table public.leads
  add constraint leads_encerrado_sem_retorno
  check (etapa not in ('ganho', 'perdido') or proximo_contato is null);

-- ---------------------------------------------------------------------
-- 2. Contato conferido na entrada
-- ---------------------------------------------------------------------

-- DEFINER para ler e travar o lead mesmo quando a RLS de quem chama não o
-- deixaria travar: a recusa por perfil continua sendo da política da 0030,
-- que é conferida depois deste gatilho.
create or replace function private.lead_interacao_conferida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_etapa public.etapa_lead;
begin
  if auth.uid() is null then
    return new;
  end if;

  select etapa into v_etapa
    from public.leads
   where id = new.lead_id
   for no key update;

  if not found then
    raise exception 'Lead não encontrado.';
  end if;

  if v_etapa = 'ganho' then
    raise exception 'Lead com venda concluída não recebe contato comercial: o acompanhamento segue pela ficha da paciente.';
  end if;

  if v_etapa = 'perdido' then
    raise exception 'Reabra o lead antes de registrar um novo contato.';
  end if;

  -- "Hoje" é o dia da clínica, não o do servidor (AGENTS.md §7.2).
  if new.proximo_contato < (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'O próximo contato não pode ficar no passado.';
  end if;

  return new;
end;
$$;

revoke all on function private.lead_interacao_conferida() from public, anon, authenticated;

comment on function private.lead_interacao_conferida is
  'Com sessão: trava o lead, recusa lead encerrado e próximo contato antes de hoje no relógio da clínica (0031). Sem sessão passa.';

create trigger lead_interacao_conferida
  before insert on public.lead_interacoes
  for each row execute function private.lead_interacao_conferida();

-- ---------------------------------------------------------------------
-- 3. O resumo só anda para a frente
-- ---------------------------------------------------------------------

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
   where id = new.lead_id
     and (ultimo_contato_em is null or ultimo_contato_em <= new.em);

  return new;
end;
$$;

revoke all on function private.lead_interacao_atualiza_resumo() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Auditoria
-- ---------------------------------------------------------------------

create trigger auditar_lead_interacoes
  after insert or update or delete on public.lead_interacoes
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- 5. Sequência da trilha de etapas
-- ---------------------------------------------------------------------

revoke all on sequence public.lead_etapas_id_seq from authenticated;

comment on column public.leads.proximo_contato is
  'Próxima data combinada no contato comercial mais recente. Escrito só pelos gatilhos (0030); limpo quando o lead é encerrado (0031).';
comment on column public.leads.ultimo_contato_em is
  'Instante da interação comercial mais recente. Escrito só pelo gatilho da 0030, que desde a 0031 não volta no tempo.';
