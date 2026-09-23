-- =====================================================================
-- Migração 0025: registro de contato com campo próprio, busca sem acento
-- e duas arestas de integridade
--
-- 1. REGISTRO DE CONTATO DEIXA DE SER RECONHECIDO PELO TEXTO.
--    O Relacionamento grava o convite de avaliação e a mensagem de
--    aniversário como `pendencia` concluída (AGENTS.md §8.8), e até aqui
--    o único jeito de separar esse registro de uma tarefa comum era a
--    `descricao`: "Convite para avaliação no Google enviado…" e "Mensagem
--    de aniversário enviada…". A aba Tarefas escondia esses textos, a aba
--    Avaliações só listava os que começavam com eles e a deduplicação do
--    dia comparava a frase inteira. Mudar a frase na aplicação escondia o
--    histórico; uma tarefa que alguém escrevesse começando igual sumia da
--    aba Tarefas.
--
--    Agora a linha diz o que é: `origem` (`tarefa`, `contato_avaliacao`,
--    `contato_aniversario`), `not null default 'tarefa'` — tudo o que
--    existia e tudo o que for inserido sem dizer nada continua tarefa.
--
--    Registros antigos: `private.pendencia_origem_pelo_texto` aplica a
--    MESMA regra que a aplicação usava (tipo + prefixo da descrição de
--    `REGISTRO_CONTATO` em `src/lib/relacionamento.ts`) e só reconhece
--    como contato a linha que já tem a forma de um registro — concluída,
--    com paciente e com hora. Uma linha com o texto mas reaberta ou
--    cancelada pela API continua `tarefa` (e passa a aparecer na aba
--    Tarefas, que é o que ela é hoje). A função fica no banco para o teste
--    conferir a classificação; ninguém da API a executa.
--
--    `pendencias_origem_coerente`: registro de contato é sempre concluído,
--    com paciente e hora, e o tipo acompanha a origem (avaliação é
--    `pesquisa`, aniversário é `outro`, como sempre foi). Consequência: o
--    registro não se reabre nem se cancela — a interface nunca ofereceu
--    isso (a aba Tarefas não o mostra); pela API, antes, dava.
--
--    `origem` não muda depois de gravada: o UPDATE de `pendencias` passa a
--    ser por coluna e a lista não inclui `origem` (nem `id`, `criado_em`,
--    `atualizado_em` e `exemplo`, que a aplicação nunca escreve). Uma
--    tarefa não vira "convite registrado", e um registro não vira tarefa
--    para ser reaberto.
--
--    Deduplicação atômica: `pendencias_contato_um_por_dia`, único por
--    paciente, origem e dia da clínica (America/Sao_Paulo). A aplicação
--    conferia antes do INSERT, sem trava — dois cliques em abas diferentes
--    gravavam dois. Histórico de contato não se apaga para caber num
--    índice: se houver dois registros iguais no mesmo dia, a migração
--    FALHA com a contagem e o dono resolve antes (pré-conferência no
--    supabase/README.md). Nunca segue sem o índice — o schema é o mesmo
--    no local e em produção sob o número 0025.
--
--    O backfill não toca `atualizado_em` (o gatilho fica desligado só
--    durante o UPDATE); a auditoria registra a troca, sem ator.
--
-- 2. BUSCA DE PACIENTES SEM ACENTO.
--    A listagem usa `ilike`, e "Conceicao" não achava "Conceição". A
--    extensão `unaccent` entra no schema `extensions` e
--    `pacientes.busca` é coluna GERADA (nome + nome social, sem acento e
--    em minúsculas) — não se escreve, só se lê, e segue a RLS da tabela.
--    Sem índice: a busca é `%termo%` numa base de centenas a poucos
--    milhares de linhas, e o índice de trigramas exigiria outra extensão
--    para um ganho que não aparece nesse tamanho (AGENTS.md, índice só
--    com justificativa).
--
-- 3. TÍTULO DO PRONTUÁRIO COM TETO NO BANCO.
--    A aplicação recusa título acima de 160 caracteres (`validarProntuario`)
--    e o banco só tinha o mínimo (0010). CHECK validada: com título acima
--    do teto a migração FALHA com a contagem, sem reescrever registro
--    clínico — o dono resolve antes (pré-conferência no README).
--
-- 4. `private.recebimento_da_venda_criar` SEM `authenticated`.
--    Desde a 0023 só `venda_registrar` a chama, e ela é SECURITY DEFINER
--    (roda como dona). O EXECUTE de `authenticated` era privilégio a mais —
--    inofensivo porque `private` não é exposto, mas sem uso.
--
-- Recebimento com data futura (pedido da onda 1): já é recusado pelo
-- banco desde a 0023 (`recebimento_confirmacao_coerente`), inclusive
-- quando a venda nasce `recebido` por `venda_registrar` — a função roda
-- como dona, mas o JWT de quem chamou continua lá e `auth.uid()` não é
-- nulo. Nada muda aqui; o teste passa a cobrir o caminho da venda.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Origem da pendência
-- ---------------------------------------------------------------------

create type public.origem_pendencia as enum ('tarefa', 'contato_avaliacao', 'contato_aniversario');

alter table public.pendencias
  add column origem public.origem_pendencia not null default 'tarefa';

comment on column public.pendencias.origem is
  'O que a linha é: tarefa da equipe ou registro de contato do Relacionamento. Não muda depois de gravada (0025).';

-- A regra de texto que a aplicação usava até a 0025, num lugar só.
create or replace function private.pendencia_origem_pelo_texto(
  p_tipo public.tipo_pendencia,
  p_descricao text,
  p_situacao public.situacao_pendencia,
  p_paciente_id uuid,
  p_resolvida_em timestamptz
)
returns public.origem_pendencia
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_situacao is distinct from 'resolvida' or p_paciente_id is null or p_resolvida_em is null
      then 'tarefa'
    when p_tipo = 'pesquisa' and p_descricao like 'Convite para avaliação no Google enviado%'
      then 'contato_avaliacao'
    when p_tipo = 'outro' and p_descricao like 'Mensagem de aniversário enviada%'
      then 'contato_aniversario'
    else 'tarefa'
  end::public.origem_pendencia;
$$;

revoke all on function private.pendencia_origem_pelo_texto(public.tipo_pendencia, text, public.situacao_pendencia, uuid, timestamptz)
  from public, anon, authenticated;

comment on function private.pendencia_origem_pelo_texto is
  'Transição da 0025: reconhece pelo texto os registros de contato gravados antes da coluna origem. Não é usada pela aplicação.';

-- O backfill não é alteração de ninguém: `atualizado_em` dos registros
-- antigos fica como estava. A auditoria registra a troca (sem ator).
alter table public.pendencias disable trigger pendencias_atualizado_em;

update public.pendencias
   set origem = private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em)
 where private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em) <> 'tarefa';

alter table public.pendencias enable trigger pendencias_atualizado_em;

alter table public.pendencias
  add constraint pendencias_origem_coerente check (
    origem = 'tarefa'
    or (
      paciente_id is not null
      and situacao = 'resolvida'
      and resolvida_em is not null
      and (
        (origem = 'contato_avaliacao' and tipo = 'pesquisa')
        or (origem = 'contato_aniversario' and tipo = 'outro')
      )
    )
  );

-- Determinístico: com repetição no histórico a migração FALHA (e o
-- `db push` para aqui, sem registrar a 0025) — o schema nunca fica
-- diferente entre o local e a produção sob o mesmo número. A consulta de
-- pré-conferência está no supabase/README.md.
do $$
declare
  v_grupos integer;
begin
  select count(*) into v_grupos
    from (
      select 1
        from public.pendencias
       where origem <> 'tarefa'
       group by paciente_id, origem, (resolvida_em at time zone 'America/Sao_Paulo')::date
      having count(*) > 1
    ) repetidos;
  if v_grupos > 0 then
    raise exception using
      message = format('0025: %s grupo(s) de registro de contato repetido no mesmo dia; o índice pendencias_contato_um_por_dia não pode nascer.', v_grupos),
      hint = 'Rode a pré-conferência do supabase/README.md ("Pendente de aplicação em produção"), resolva com a clínica e rode o db:push de novo.';
  end if;
end $$;

create unique index pendencias_contato_um_por_dia
  on public.pendencias (paciente_id, origem, ((resolvida_em at time zone 'America/Sao_Paulo')::date))
  where origem <> 'tarefa';

-- UPDATE por coluna: as que a aplicação escreve (tarefa e situação),
-- sem `origem`.
revoke update on public.pendencias from authenticated;
grant update (tipo, paciente_id, atendimento_id, descricao, prazo, prioridade, situacao, responsavel_id, resolvida_em)
  on public.pendencias to authenticated;

-- ---------------------------------------------------------------------
-- 2. Busca de pacientes sem acento
-- ---------------------------------------------------------------------

create extension if not exists unaccent with schema extensions;

-- IMMUTABLE com o dicionário explícito: `unaccent(text)` sozinho é STABLE
-- (depende do search_path para achar o dicionário) e não entra em coluna
-- gerada.
create or replace function private.sem_acento(p_texto text)
returns text
language sql
immutable
parallel safe
set search_path = public, pg_temp
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, coalesce(p_texto, '')));
$$;

revoke all on function private.sem_acento(text) from public, anon;
-- A coluna gerada é calculada no INSERT/UPDATE de quem grava o paciente.
grant execute on function private.sem_acento(text) to authenticated;

alter table public.pacientes
  add column busca text generated always as (
    private.sem_acento(nome || coalesce(' ' || nome_social, ''))
  ) stored;

comment on column public.pacientes.busca is
  'Nome e nome social sem acento e em minúsculas, para a busca da listagem (0025). Gerada: não se escreve.';

-- ---------------------------------------------------------------------
-- 3. Teto do título do prontuário
-- ---------------------------------------------------------------------

-- Determinístico, como o índice acima: título acima do teto faz a
-- migração falhar em vez de deixar a restrição NOT VALID só em produção.
do $$
declare
  v_linhas integer;
begin
  select count(*) into v_linhas from public.prontuarios where char_length(titulo) > 160;
  if v_linhas > 0 then
    raise exception using
      message = format('0025: %s prontuário(s) com título acima de 160 caracteres; prontuarios_titulo_maximo não pode ser validada.', v_linhas),
      hint = 'Rode a pré-conferência do supabase/README.md ("Pendente de aplicação em produção"), resolva com a clínica e rode o db:push de novo.';
  end if;
end $$;

alter table public.prontuarios
  add constraint prontuarios_titulo_maximo check (char_length(titulo) <= 160);

-- ---------------------------------------------------------------------
-- 4. Recebimento da venda só pela função
-- ---------------------------------------------------------------------

revoke execute on function private.recebimento_da_venda_criar(uuid, public.situacao_recebimento, date, date, text)
  from authenticated;
