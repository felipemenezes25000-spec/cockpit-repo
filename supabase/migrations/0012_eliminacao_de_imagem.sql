-- =====================================================================
-- Migração 0012: o motivo da eliminação
--
-- A 0011 abriu a única exceção ao "registro não se apaga" e deixou uma
-- instrução para quem fosse implementar a tela: a ação de servidor deve
-- exigir motivo e confirmação. Faltava o lugar onde o motivo pousa.
--
-- `auditoria` não serve. O papel `authenticated` só tem SELECT nela;
-- quem escreve é o gatilho `auditar()`, que grava a linha removida — o
-- que a imagem ERA, não por que deixou de existir. E escrever o motivo
-- em `legenda` na linha antes do DELETE, para o gatilho levá-lo de
-- carona, seria mentir sobre o que aquela coluna significa.
--
-- Daí uma tabela própria. Ela é o oposto da auditoria genérica: existe
-- para ser lida por gente, no dia em que a clínica precisar mostrar à
-- titular — ou a quem cobrar — por que uma foto sumiu e a pedido de
-- quem. Por isso guarda o caminho e o nome do arquivo, que somem junto
-- com a linha.
--
-- Exigir motivo sem ter onde guardá-lo seria encenação: a tela pediria
-- uma justificativa que o sistema descarta no mesmo instante.
-- =====================================================================

create table public.prontuario_imagem_eliminacoes (
  id bigint generated always as identity primary key,

  -- Sem FK: a linha que este id apontava não existe mais. É esse o
  -- ponto. Único porque um id de imagem só se elimina uma vez.
  imagem_id uuid not null unique,

  prontuario_id uuid not null references public.prontuarios (id) on delete restrict,

  -- O que sumiu junto com a linha. Sem isto, o registro provaria que
  -- "alguma" imagem foi eliminada, sem dizer qual.
  caminho text not null,
  nome_original text not null,
  data_captura date not null,

  motivo text not null,

  eliminada_em timestamptz not null default now(),
  eliminada_por uuid references public.perfis (id) on delete set null,

  -- Dez caracteres não fazem ninguém escrever bem, mas barram o "x" e o
  -- "ok" — que é o que se digita quando o campo é só um obstáculo.
  constraint prontuario_imagem_eliminacoes_motivo
    check (length(btrim(motivo)) between 10 and 500)
);

comment on table public.prontuario_imagem_eliminacoes is
  'Por que cada foto de evolução foi eliminada, e a pedido de quem. Não se apaga nem se corrige.';

comment on column public.prontuario_imagem_eliminacoes.imagem_id is
  'Id da linha de prontuario_imagens que deixou de existir. Sem FK, de propósito.';

create index prontuario_imagem_eliminacoes_prontuario
  on public.prontuario_imagem_eliminacoes (prontuario_id, eliminada_em desc);

-- ---------------------------------------------------------------------
-- Acesso
--
-- Escreve e lê quem pode ver a foto: a administradora. Não há política
-- de UPDATE nem de DELETE — esta tabela é o registro que sobra depois
-- que tudo o mais foi embora, e mexer nela esvaziaria o sentido dela.
-- ---------------------------------------------------------------------

alter table public.prontuario_imagem_eliminacoes enable row level security;

create policy prontuario_imagem_eliminacoes_leitura
  on public.prontuario_imagem_eliminacoes
  for select to authenticated using (private.e_administradora());

create policy prontuario_imagem_eliminacoes_insercao
  on public.prontuario_imagem_eliminacoes
  for insert to authenticated with check (private.e_administradora());

grant select, insert on public.prontuario_imagem_eliminacoes to authenticated;
revoke all on public.prontuario_imagem_eliminacoes from anon;

-- ---------------------------------------------------------------------
-- Eliminar
--
-- Registrar e apagar precisam ser o mesmo ato. Em duas chamadas
-- separadas, a que falhasse no meio deixaria ou um registro de
-- eliminação que não aconteceu, ou uma imagem eliminada sem motivo
-- nenhum. Aqui é uma transação só.
--
-- `security invoker`: a RLS continua valendo e a função não empresta
-- poder a quem a chama. A checagem explícita no topo existe para o não
-- autorizado receber um erro com nome, em vez de um silencioso "0
-- linhas afetadas".
--
-- O ARQUIVO NÃO É REMOVIDO AQUI. O Postgres não fala com o Storage, e a
-- ordem manda o arquivo sair primeiro (0011). Quem chama esta função já
-- removeu o objeto do bucket; ela fecha o serviço do lado do banco.
-- ---------------------------------------------------------------------

create or replace function public.prontuario_imagem_eliminar(
  p_imagem_id uuid,
  p_motivo text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_imagem public.prontuario_imagens;
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if not private.e_administradora() then
    raise exception 'Acesso negado ao prontuário';
  end if;

  if length(v_motivo) < 10 then
    raise exception 'Motivo da eliminação obrigatório';
  end if;

  select * into v_imagem
  from public.prontuario_imagens
  where id = p_imagem_id;

  if not found then
    raise exception 'Imagem não encontrada';
  end if;

  insert into public.prontuario_imagem_eliminacoes (
    imagem_id,
    prontuario_id,
    caminho,
    nome_original,
    data_captura,
    motivo,
    eliminada_por
  )
  values (
    v_imagem.id,
    v_imagem.prontuario_id,
    v_imagem.caminho,
    v_imagem.nome_original,
    v_imagem.data_captura,
    left(v_motivo, 500),
    auth.uid()
  );

  delete from public.prontuario_imagens where id = p_imagem_id;
end;
$$;

revoke all on function public.prontuario_imagem_eliminar(uuid, text) from public, anon;
grant execute on function public.prontuario_imagem_eliminar(uuid, text) to authenticated;

comment on function public.prontuario_imagem_eliminar(uuid, text) is
  'Registra o motivo e apaga a linha da imagem, na mesma transação. O arquivo no bucket sai antes, pela aplicação.';
