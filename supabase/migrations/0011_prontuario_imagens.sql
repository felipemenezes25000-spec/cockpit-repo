-- =====================================================================
-- Migração 0011: imagens do prontuário
--
-- Fotos de evolução: o registro visual do antes, durante e depois do
-- tratamento. É a informação mais sensível que o sistema passa a guardar
-- — dado de saúde (LGPD, art. 5º, II) com a pessoa identificável na
-- própria imagem.
--
-- Quatro decisões estruturam esta migração:
--
-- 1. O ARQUIVO NÃO ENTRA NO POSTGRES. Vai para um bucket privado do
--    Supabase Storage; a tabela guarda só o caminho e os metadados.
--    Imagem em `bytea` incharia o banco, os backups e cada consulta.
--
-- 2. A IMAGEM PERTENCE AO PRONTUÁRIO, NÃO À VERSÃO. Versionar serve
--    para texto que se corrige. Foto não se corrige: acrescenta-se ou
--    remove-se. Amarrá-la a `prontuario_versoes` faria cada correção de
--    texto órfã ou duplicar as fotos. Cada imagem tem a sua própria
--    `data_captura` — é ela que dá a linha do tempo da evolução.
--
-- 3. ESTA TABELA PODE APAGAR. É a primeira exceção deliberada à regra
--    de "registro não se apaga", e o motivo é a LGPD: o art. 18 dá à
--    titular o direito de eliminação, e foto do corpo de uma paciente é
--    exatamente onde esse direito se exerce. O gatilho de auditoria
--    guarda que a imagem existiu e foi removida, sem guardar a imagem.
--    Ver a seção "Apagar" no fim deste arquivo.
--
-- 4. MESMO ALCANCE DO PRONTUÁRIO: só a administradora, até existir o
--    perfil clínico próprio. Na interface, na ação e na RLS — e também
--    na RLS do Storage, que é uma quarta porta e costuma ser esquecida.
-- =====================================================================

-- ---------------------------------------------------------------------
-- O bucket
--
-- `public = false`: nada aqui é servido por URL aberta. A aplicação
-- gera URL assinada, de validade curta, para cada exibição.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'prontuario-imagens',
  'prontuario-imagens',
  false,
  10485760,  -- 10 MB: foto de celular cabe; vídeo não entra por engano
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Metadados da imagem
-- ---------------------------------------------------------------------

create table public.prontuario_imagens (
  id uuid primary key default gen_random_uuid(),
  prontuario_id uuid not null references public.prontuarios (id) on delete restrict,

  -- Caminho dentro do bucket. Convenção: `<prontuario_id>/<uuid>.<ext>`.
  caminho text not null unique,

  nome_original text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null,

  -- Preenchidas quando a aplicação consegue lê-las; servem para reservar
  -- o espaço na tela antes de a imagem chegar, sem pulo de layout.
  largura integer,
  altura integer,

  legenda text not null default '',

  -- Quando a foto foi TIRADA, não quando foi enviada. É o eixo da
  -- evolução: a clínica fotografa hoje e cadastra semana que vem.
  data_captura date not null,

  -- Ordem manual dentro do prontuário, para o antes vir antes do depois
  -- mesmo quando as datas empatam.
  ordem integer not null default 0,

  -- Tira da tela sem apagar: foto tremida, duplicada, enquadramento
  -- errado. Some da ficha e continua existindo. Diferente de eliminar,
  -- que é o pedido da titular.
  arquivada boolean not null default false,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  exemplo boolean not null default false,

  -- O caminho no Storage precisa começar pelo prontuário a que a linha
  -- diz pertencer. Sem isto, uma linha poderia apontar para o arquivo de
  -- outra paciente — e a checagem de acesso olharia o prontuário errado.
  constraint prontuario_imagens_caminho_coerente
    check (caminho like prontuario_id::text || '/%'),

  -- Espelha `allowed_mime_types` do bucket. O Storage recusa o upload; o
  -- banco recusa a linha. As duas portas, como manda a casa.
  constraint prontuario_imagens_tipo
    check (tipo_mime in ('image/jpeg', 'image/png', 'image/webp')),

  constraint prontuario_imagens_tamanho
    check (tamanho_bytes > 0 and tamanho_bytes <= 10485760),

  constraint prontuario_imagens_legenda_limite
    check (length(legenda) <= 300),

  -- Ou as duas dimensões, ou nenhuma: meia dimensão não reserva espaço.
  constraint prontuario_imagens_dimensoes
    check ((largura is null and altura is null) or (largura > 0 and altura > 0))
);

comment on table public.prontuario_imagens is
  'Fotos de evolução do prontuário. O arquivo mora no bucket privado prontuario-imagens; aqui ficam caminho e metadados.';

comment on column public.prontuario_imagens.caminho is
  'Caminho no bucket, no formato <prontuario_id>/<uuid>.<ext>. Único: dois registros nunca apontam para o mesmo arquivo.';

comment on column public.prontuario_imagens.data_captura is
  'Quando a foto foi tirada, não quando foi enviada. É o eixo da evolução.';

comment on column public.prontuario_imagens.arquivada is
  'Tira da tela e preserva. Não confundir com eliminação por pedido da titular (LGPD art. 18), que é DELETE de verdade.';

create index prontuario_imagens_prontuario
  on public.prontuario_imagens (prontuario_id, ordem, data_captura)
  where not arquivada;

create index prontuario_imagens_captura
  on public.prontuario_imagens (prontuario_id, data_captura desc);

create index prontuario_imagens_exemplo
  on public.prontuario_imagens (id) where exemplo;

create trigger prontuario_imagens_tocar_atualizado_em
  before update on public.prontuario_imagens
  for each row execute function public.tocar_atualizado_em();

create trigger prontuario_imagens_auditoria
  after insert or update or delete on public.prontuario_imagens
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Acesso à tabela
-- ---------------------------------------------------------------------

alter table public.prontuario_imagens enable row level security;

create policy prontuario_imagens_leitura on public.prontuario_imagens
  for select to authenticated using (private.e_administradora());

create policy prontuario_imagens_insercao on public.prontuario_imagens
  for insert to authenticated with check (private.e_administradora());

create policy prontuario_imagens_edicao on public.prontuario_imagens
  for update to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

-- Ver a seção "Apagar", no fim.
create policy prontuario_imagens_eliminacao on public.prontuario_imagens
  for delete to authenticated using (private.e_administradora());

grant select, insert, update, delete on public.prontuario_imagens to authenticated;
revoke all on public.prontuario_imagens from anon;

-- ---------------------------------------------------------------------
-- Acesso ao Storage
--
-- A RLS da tabela não protege o arquivo: quem conhece o caminho fala com
-- `storage.objects`, que tem política própria. Sem o que vem abaixo, o
-- bucket ficaria legível para qualquer conta autenticada — inclusive a
-- recepção, que não pode ver conteúdo clínico.
-- ---------------------------------------------------------------------

create policy prontuario_imagens_storage_leitura on storage.objects
  for select to authenticated
  using (bucket_id = 'prontuario-imagens' and private.e_administradora());

create policy prontuario_imagens_storage_envio on storage.objects
  for insert to authenticated
  with check (bucket_id = 'prontuario-imagens' and private.e_administradora());

create policy prontuario_imagens_storage_edicao on storage.objects
  for update to authenticated
  using (bucket_id = 'prontuario-imagens' and private.e_administradora())
  with check (bucket_id = 'prontuario-imagens' and private.e_administradora());

create policy prontuario_imagens_storage_eliminacao on storage.objects
  for delete to authenticated
  using (bucket_id = 'prontuario-imagens' and private.e_administradora());

-- ---------------------------------------------------------------------
-- Apagar
--
-- Esta é a exceção deliberada à regra de que registro não se apaga, e
-- vale explicar o raciocínio para ninguém "corrigir" isso depois.
--
-- Venda e recebimento não se apagam porque são a memória contábil da
-- clínica: quem apaga, esconde. Foto do corpo de uma paciente é outra
-- coisa. A LGPD (art. 18, VI) dá a ela o direito de pedir eliminação, e
-- guardar a imagem contra a vontade dela não protege ninguém.
--
-- Por isso a tabela tem política de DELETE e o bucket também. O que
-- permanece é a auditoria: o gatilho grava tabela, id, ator e hora, com
-- o caminho e os metadados da linha removida — prova de que a imagem
-- existiu e foi eliminada, sem a imagem. É o registro que a clínica
-- precisa se a eliminação for contestada.
--
-- APAGAR A LINHA NÃO APAGA O ARQUIVO. São dois lugares: a linha aqui e
-- o objeto no bucket. Quem elimina precisa remover os dois, e nesta
-- ordem — o arquivo primeiro. Se a ordem se inverter e a remoção do
-- arquivo falhar, sobra um objeto órfão no bucket, sem nenhuma linha que
-- aponte para ele: dado de saúde sem dono e sem rastro.
--
-- A ação de servidor que fizer isso deve exigir motivo e confirmação.
-- ---------------------------------------------------------------------
