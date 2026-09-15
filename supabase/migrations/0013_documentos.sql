-- =====================================================================
-- Migração 0013: documentos e contratos
--
-- Contrato, termo e orientação entregues à paciente, com assinatura
-- colhida dentro do sistema.
--
-- Quatro decisões estruturam esta migração:
--
-- 1. O TEXTO CONGELA NA EMISSÃO. O documento guarda a cópia integral do
--    que a paciente leu, e o hash dela. Se o modelo mudar em março, o
--    contrato assinado em janeiro continua exibindo exatamente o que foi
--    aceito. Sem isso, "o que ela assinou" viraria uma consulta ao
--    modelo de hoje — que é justamente o que muda.
--
-- 2. QUEM CONGELA É O BANCO, NÃO A APLICAÇÃO. `documento_emitir` lê o
--    corpo da versão vigente do modelo aqui dentro. Se o texto viesse do
--    cliente, quem soubesse chamar a API congelaria o que quisesse e o
--    hash atestaria a mentira com a mesma confiança.
--
-- 3. MODELO SE VERSIONA, DOCUMENTO NÃO SE ALTERA. São naturezas
--    diferentes: o modelo é texto que se corrige — versionado, como
--    `prontuario_versoes`. O documento emitido é um fato, e correção
--    gera documento novo apontando para o anterior.
--
-- 4. ANAMNESE JÁ EXISTE NO ENUM, E NADA MAIS. Esta leva entrega
--    contrato, termo e orientação. O valor 'anamnese' entra agora porque
--    valor de enum não pode ser usado na mesma transação em que é
--    acrescentado (a lição da 0006), e as políticas já o tratam como
--    conteúdo clínico — restrito à administradora, como o prontuário.
--
-- Por que uma migração só, e não o par enum/tabelas da 0006/0007: a
-- restrição do Postgres vale para valor ACRESCENTADO a enum existente.
-- Enum criado do zero na mesma transação pode ser usado à vontade.
-- =====================================================================

create type public.tipo_documento as enum (
  'contrato',
  'termo',
  'orientacao',
  -- Reservado. Ver a decisão 4 no cabeçalho.
  'anamnese'
);

create type public.situacao_documento as enum (
  'emitido',      -- existe e aguarda assinatura
  'assinado',     -- assinado pela paciente; não muda mais
  'cancelado',    -- emitido por engano, com motivo
  'substituido'   -- corrigido por um documento posterior
);

-- ---------------------------------------------------------------------
-- Modelos
--
-- O cabeçalho é mutável (nome, se está em uso); o texto é versionado.
-- Mesmo desenho de `prontuarios` + `prontuario_versoes`, pelo mesmo
-- motivo: o que se corrige precisa guardar o que dizia antes.
-- ---------------------------------------------------------------------

create table public.modelos_documento (
  id uuid primary key default gen_random_uuid(),
  tipo public.tipo_documento not null,
  nome text not null,
  descricao text not null default '',

  -- Tira da lista de emissão sem apagar: modelo aposentado continua
  -- explicando os documentos que gerou.
  ativo boolean not null default true,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  exemplo boolean not null default false,

  constraint modelos_documento_nome check (length(btrim(nome)) between 3 and 160),
  constraint modelos_documento_descricao check (length(descricao) <= 400)
);

comment on table public.modelos_documento is
  'Texto-base de contrato, termo ou orientação. O corpo mora nas versões.';

create index modelos_documento_uso on public.modelos_documento (tipo, nome) where ativo;

create table public.modelo_documento_versoes (
  id bigint generated always as identity primary key,
  modelo_id uuid not null references public.modelos_documento (id) on delete restrict,
  versao integer not null,

  corpo text not null,

  -- Por que esta versão existe. A primeira diz "Texto inicial".
  motivo text not null,

  criado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  exemplo boolean not null default false,

  constraint modelo_documento_versoes_unica unique (modelo_id, versao),
  constraint modelo_documento_versoes_corpo
    check (length(btrim(corpo)) between 1 and 100000),
  constraint modelo_documento_versoes_motivo
    check (length(btrim(motivo)) between 3 and 240),
  constraint modelo_documento_versoes_numero check (versao >= 1)
);

comment on table public.modelo_documento_versoes is
  'Versões imutáveis do texto de um modelo. Alterar o modelo nunca altera documento já emitido.';

create index modelo_documento_versoes_ultima
  on public.modelo_documento_versoes (modelo_id, versao desc);

-- ---------------------------------------------------------------------
-- Documentos emitidos
-- ---------------------------------------------------------------------

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  paciente_id uuid not null references public.pacientes (id) on delete restrict,

  -- De onde veio. `set null` porque o documento não depende mais dele:
  -- o texto está congelado aqui dentro.
  modelo_id uuid references public.modelos_documento (id) on delete set null,
  modelo_versao integer,

  -- Cópia do tipo do modelo. Congelada junto, porque a política de
  -- acesso lê daqui e não pode depender de uma linha que some.
  tipo public.tipo_documento not null,

  titulo text not null,

  -- O que a paciente leu, palavra por palavra.
  corpo_congelado text not null,

  -- SHA-256 do corpo, em hexadecimal. Preenchido por gatilho — ver a
  -- decisão 2 no cabeçalho.
  corpo_hash text not null default '',

  situacao public.situacao_documento not null default 'emitido',

  -- Correção gera documento novo apontando para o corrigido.
  documento_anterior_id uuid references public.documentos (id) on delete restrict,

  motivo_cancelamento text not null default '',

  emitido_em timestamptz not null default now(),
  emitido_por uuid references public.perfis (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  exemplo boolean not null default false,

  constraint documentos_titulo check (length(btrim(titulo)) between 3 and 160),
  constraint documentos_corpo check (length(btrim(corpo_congelado)) >= 1),
  constraint documentos_motivo_cancelamento check (length(motivo_cancelamento) <= 400),

  -- Cancelado exige motivo; o que não foi cancelado não tem motivo.
  constraint documentos_cancelamento_coerente check (
    (situacao = 'cancelado' and length(btrim(motivo_cancelamento)) >= 5)
    or (situacao <> 'cancelado' and motivo_cancelamento = '')
  ),

  -- Um documento não corrige a si mesmo.
  constraint documentos_anterior_diferente
    check (documento_anterior_id is null or documento_anterior_id <> id)
);

comment on table public.documentos is
  'Documento emitido para uma paciente, com o texto congelado no momento da emissão e o hash dele.';

comment on column public.documentos.corpo_congelado is
  'Exatamente o que a paciente leu. Nunca muda — ver o gatilho documentos_texto_nao_muda.';

comment on column public.documentos.corpo_hash is
  'SHA-256 hexadecimal do corpo congelado, calculado pelo banco na inserção.';

create index documentos_paciente on public.documentos (paciente_id, emitido_em desc);
create index documentos_situacao on public.documentos (situacao, emitido_em desc);
create index documentos_tipo on public.documentos (tipo, emitido_em desc);

-- ---------------------------------------------------------------------
-- Assinaturas
--
-- A trilha de evidências. A Lei 14.063/2020 reconhece a assinatura
-- simples entre particulares; o que dá força a ela é o conjunto de
-- circunstâncias registrado aqui.
--
-- `provedor`, `referencia_externa` e `url_comprovante` nascem vazios e
-- existem para o dia em que a assinatura passar por Autentique, ZapSign
-- ou Clicksign: trocar é implementar um conector, não remodelar.
-- ---------------------------------------------------------------------

create table public.documento_assinaturas (
  id uuid primary key default gen_random_uuid(),

  -- Uma assinatura por documento. Colher de novo exige emitir outro.
  documento_id uuid not null unique references public.documentos (id) on delete restrict,

  nome_informado text not null,
  cpf_informado text,

  -- Cópia do hash no instante da assinatura. Se algum dia divergir do
  -- `corpo_hash` do documento, foi o documento que mudou — e o gatilho
  -- de imutabilidade deveria ter impedido.
  hash_assinado text not null,

  assinado_em timestamptz not null default now(),

  -- Circunstâncias. Nulos quando o ambiente não informa.
  ip inet,
  dispositivo text,

  -- Como a recepção conferiu quem estava assinando.
  verificacao_identidade text not null,

  -- Quem operava o sistema no balcão. Não é quem assinou.
  operador_id uuid references public.perfis (id) on delete set null,

  provedor text not null default 'interno',
  referencia_externa text,
  url_comprovante text,

  exemplo boolean not null default false,

  constraint documento_assinaturas_nome
    check (length(btrim(nome_informado)) between 3 and 160),
  constraint documento_assinaturas_cpf
    check (cpf_informado is null or cpf_informado ~ '^[0-9]{11}$'),
  constraint documento_assinaturas_verificacao
    check (length(btrim(verificacao_identidade)) between 3 and 240),
  constraint documento_assinaturas_dispositivo
    check (dispositivo is null or length(dispositivo) <= 400)
);

comment on table public.documento_assinaturas is
  'Evidência da assinatura: quem, quando, de onde, como a identidade foi conferida e o hash do que foi assinado.';

create index documento_assinaturas_quando
  on public.documento_assinaturas (assinado_em desc);

-- ---------------------------------------------------------------------
-- O texto não muda
--
-- Congelar só vale se for para valer. O gatilho recusa qualquer UPDATE
-- que toque o corpo ou o hash, e recusa mexer num documento já
-- assinado. É a diferença entre uma promessa no comentário e uma
-- garantia no banco.
-- ---------------------------------------------------------------------

create or replace function public.documento_congelar()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- `sha256` e `convert_to` são embutidos do Postgres; não depende de
  -- extensão instalada.
  new.corpo_hash := encode(sha256(convert_to(new.corpo_congelado, 'UTF8')), 'hex');
  return new;
end;
$$;

create or replace function public.documento_texto_nao_muda()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.corpo_congelado is distinct from old.corpo_congelado
     or new.corpo_hash is distinct from old.corpo_hash then
    raise exception 'O texto de um documento emitido não pode ser alterado';
  end if;

  if old.situacao = 'assinado' and new.situacao <> 'assinado' then
    raise exception 'Documento assinado não muda de situação';
  end if;

  return new;
end;
$$;

create trigger documentos_congelar
  before insert on public.documentos
  for each row execute function public.documento_congelar();

create trigger documentos_texto_nao_muda
  before update on public.documentos
  for each row execute function public.documento_texto_nao_muda();

create trigger modelos_documento_tocar_atualizado_em
  before update on public.modelos_documento
  for each row execute function public.tocar_atualizado_em();

create trigger documentos_tocar_atualizado_em
  before update on public.documentos
  for each row execute function public.tocar_atualizado_em();

-- Documento e assinatura carregam dado de paciente: entram na auditoria.
create trigger documentos_auditoria
  after insert or update or delete on public.documentos
  for each row execute function public.auditar();

create trigger documento_assinaturas_auditoria
  after insert or update or delete on public.documento_assinaturas
  for each row execute function public.auditar();

create trigger modelos_documento_auditoria
  after insert or update or delete on public.modelos_documento
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Acesso
--
-- Modelo é catálogo: todo perfil ativo lê (a recepção precisa para
-- emitir), só a administradora escreve — mesma regra da tabela de
-- procedimentos e das taxas.
--
-- Documento é trabalho de balcão, com uma exceção: anamnese é conteúdo
-- clínico e segue o alcance do prontuário. A condição aparece em toda
-- política, inclusive nas da assinatura, para não existir porta lateral.
-- ---------------------------------------------------------------------

alter table public.modelos_documento         enable row level security;
alter table public.modelo_documento_versoes  enable row level security;
alter table public.documentos                enable row level security;
alter table public.documento_assinaturas     enable row level security;

create policy modelos_documento_leitura on public.modelos_documento
  for select to authenticated using (private.tem_acesso());

create policy modelos_documento_escrita on public.modelos_documento
  for insert to authenticated with check (private.e_administradora());

create policy modelos_documento_edicao on public.modelos_documento
  for update to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

create policy modelo_documento_versoes_leitura on public.modelo_documento_versoes
  for select to authenticated using (private.tem_acesso());

create policy modelo_documento_versoes_escrita on public.modelo_documento_versoes
  for insert to authenticated with check (private.e_administradora());

create policy documentos_leitura on public.documentos
  for select to authenticated
  using (
    private.tem_acesso()
    and (tipo <> 'anamnese' or private.e_administradora())
  );

create policy documentos_escrita on public.documentos
  for insert to authenticated
  with check (
    private.tem_acesso()
    and (tipo <> 'anamnese' or private.e_administradora())
  );

create policy documentos_edicao on public.documentos
  for update to authenticated
  using (
    private.tem_acesso()
    and (tipo <> 'anamnese' or private.e_administradora())
  )
  with check (
    private.tem_acesso()
    and (tipo <> 'anamnese' or private.e_administradora())
  );

create policy documento_assinaturas_leitura on public.documento_assinaturas
  for select to authenticated
  using (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  );

create policy documento_assinaturas_escrita on public.documento_assinaturas
  for insert to authenticated
  with check (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  );

-- Nenhuma das quatro tem política de DELETE, e a assinatura também não
-- tem de UPDATE. Documento e assinatura são memória do que foi acordado:
-- quem apaga, esconde.

grant select, insert, update on public.modelos_documento        to authenticated;
grant select, insert         on public.modelo_documento_versoes to authenticated;
grant select, insert, update on public.documentos               to authenticated;
grant select, insert         on public.documento_assinaturas    to authenticated;

revoke all on public.modelos_documento        from anon;
revoke all on public.modelo_documento_versoes from anon;
revoke all on public.documentos               from anon;
revoke all on public.documento_assinaturas    from anon;

-- ---------------------------------------------------------------------
-- Operações
-- ---------------------------------------------------------------------

-- Cria o modelo e a versão 1 na mesma transação. Modelo sem texto não
-- serve para nada, e deixar as duas inserções soltas permitiria existir.
create or replace function public.modelo_documento_criar(
  p_tipo public.tipo_documento,
  p_nome text,
  p_descricao text,
  p_corpo text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_modelo_id uuid;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_corpo text := btrim(coalesce(p_corpo, ''));
begin
  if not private.e_administradora() then
    raise exception 'Apenas a administradora gerencia modelos';
  end if;

  if length(v_nome) < 3 then
    raise exception 'Nome do modelo obrigatório';
  end if;

  if length(v_corpo) = 0 then
    raise exception 'Texto do modelo obrigatório';
  end if;

  insert into public.modelos_documento (tipo, nome, descricao, criado_por)
  values (p_tipo, v_nome, btrim(coalesce(p_descricao, '')), auth.uid())
  returning id into v_modelo_id;

  insert into public.modelo_documento_versoes (modelo_id, versao, corpo, motivo, criado_por)
  values (v_modelo_id, 1, v_corpo, 'Texto inicial', auth.uid());

  return v_modelo_id;
end;
$$;

-- Nova versão do texto. A anterior fica.
create or replace function public.modelo_documento_nova_versao(
  p_modelo_id uuid,
  p_nome text,
  p_descricao text,
  p_corpo text,
  p_motivo text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_proxima integer;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_corpo text := btrim(coalesce(p_corpo, ''));
  v_motivo text := btrim(coalesce(p_motivo, ''));
begin
  if not private.e_administradora() then
    raise exception 'Apenas a administradora gerencia modelos';
  end if;

  if length(v_nome) < 3 then
    raise exception 'Nome do modelo obrigatório';
  end if;

  if length(v_corpo) = 0 then
    raise exception 'Texto do modelo obrigatório';
  end if;

  if length(v_motivo) < 3 then
    raise exception 'Motivo da nova versão obrigatório';
  end if;

  if not exists (select 1 from public.modelos_documento where id = p_modelo_id) then
    raise exception 'Modelo não encontrado';
  end if;

  update public.modelos_documento
     set nome = v_nome,
         descricao = btrim(coalesce(p_descricao, ''))
   where id = p_modelo_id;

  select coalesce(max(versao), 0) + 1 into v_proxima
    from public.modelo_documento_versoes
   where modelo_id = p_modelo_id;

  insert into public.modelo_documento_versoes (modelo_id, versao, corpo, motivo, criado_por)
  values (p_modelo_id, v_proxima, v_corpo, v_motivo, auth.uid());
end;
$$;

-- Emite o documento congelando o texto da versão vigente do modelo.
--
-- O corpo NÃO vem por parâmetro. Ver a decisão 2 no cabeçalho: se viesse,
-- quem chamasse a API escolheria o que o hash iria atestar.
create or replace function public.documento_emitir(
  p_paciente_id uuid,
  p_modelo_id uuid,
  p_titulo text,
  p_documento_anterior_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_documento_id uuid;
  v_modelo public.modelos_documento;
  v_versao public.modelo_documento_versoes;
  v_titulo text := btrim(coalesce(p_titulo, ''));
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  select * into v_modelo from public.modelos_documento where id = p_modelo_id;
  if not found then
    raise exception 'Modelo não encontrado';
  end if;

  if not v_modelo.ativo then
    raise exception 'Modelo fora de uso';
  end if;

  -- Anamnese segue o alcance do prontuário, aqui também.
  if v_modelo.tipo = 'anamnese' and not private.e_administradora() then
    raise exception 'Apenas a administradora emite anamnese';
  end if;

  if not exists (select 1 from public.pacientes where id = p_paciente_id) then
    raise exception 'Paciente não encontrada';
  end if;

  select * into v_versao
    from public.modelo_documento_versoes
   where modelo_id = p_modelo_id
   order by versao desc
   limit 1;

  if not found then
    raise exception 'Modelo sem texto';
  end if;

  if p_documento_anterior_id is not null then
    if not exists (
      select 1 from public.documentos
      where id = p_documento_anterior_id and paciente_id = p_paciente_id
    ) then
      raise exception 'Documento anterior não pertence a esta paciente';
    end if;
  end if;

  insert into public.documentos (
    paciente_id,
    modelo_id,
    modelo_versao,
    tipo,
    titulo,
    corpo_congelado,
    documento_anterior_id,
    emitido_por
  )
  values (
    p_paciente_id,
    p_modelo_id,
    v_versao.versao,
    v_modelo.tipo,
    case when length(v_titulo) >= 3 then v_titulo else v_modelo.nome end,
    v_versao.corpo,
    p_documento_anterior_id,
    auth.uid()
  )
  returning id into v_documento_id;

  -- O documento corrigido sai de circulação, sem sumir.
  if p_documento_anterior_id is not null then
    update public.documentos
       set situacao = 'substituido'
     where id = p_documento_anterior_id
       and situacao <> 'assinado';
  end if;

  return v_documento_id;
end;
$$;

-- Colhe a assinatura e muda a situação, na mesma transação. Separadas,
-- a falha entre as duas deixaria assinatura sem documento assinado, ou
-- documento assinado sem prova nenhuma.
create or replace function public.documento_assinar(
  p_documento_id uuid,
  p_nome text,
  p_cpf text,
  p_verificacao text,
  p_ip text,
  p_dispositivo text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_documento public.documentos;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_verificacao text := btrim(coalesce(p_verificacao, ''));
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  select * into v_documento from public.documentos where id = p_documento_id;
  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_documento.tipo = 'anamnese' and not private.e_administradora() then
    raise exception 'Apenas a administradora assina anamnese';
  end if;

  if v_documento.situacao <> 'emitido' then
    raise exception 'Só documento emitido pode ser assinado';
  end if;

  if length(v_nome) < 3 then
    raise exception 'Nome de quem assina obrigatório';
  end if;

  if length(v_verificacao) < 3 then
    raise exception 'Registre como a identidade foi conferida';
  end if;

  if v_cpf is not null and length(v_cpf) <> 11 then
    raise exception 'CPF inválido';
  end if;

  insert into public.documento_assinaturas (
    documento_id,
    nome_informado,
    cpf_informado,
    hash_assinado,
    ip,
    dispositivo,
    verificacao_identidade,
    operador_id
  )
  values (
    p_documento_id,
    v_nome,
    v_cpf,
    v_documento.corpo_hash,
    -- Texto vazio ou inválido vira nulo em vez de derrubar a assinatura:
    -- não saber o IP não invalida o que foi acordado no balcão.
    nullif(btrim(coalesce(p_ip, '')), '')::inet,
    nullif(btrim(coalesce(p_dispositivo, '')), ''),
    v_verificacao,
    auth.uid()
  );

  update public.documentos
     set situacao = 'assinado'
   where id = p_documento_id;
end;
$$;

revoke all on function public.modelo_documento_criar(public.tipo_documento, text, text, text) from public, anon;
revoke all on function public.modelo_documento_nova_versao(uuid, text, text, text, text) from public, anon;
revoke all on function public.documento_emitir(uuid, uuid, text, uuid) from public, anon;
revoke all on function public.documento_assinar(uuid, text, text, text, text, text) from public, anon;

grant execute on function public.modelo_documento_criar(public.tipo_documento, text, text, text) to authenticated;
grant execute on function public.modelo_documento_nova_versao(uuid, text, text, text, text) to authenticated;
grant execute on function public.documento_emitir(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.documento_assinar(uuid, text, text, text, text, text) to authenticated;

comment on function public.documento_emitir(uuid, uuid, text, uuid) is
  'Emite o documento congelando o texto da versão vigente do modelo. O corpo nunca vem do cliente.';
comment on function public.documento_assinar(uuid, text, text, text, text, text) is
  'Grava a evidência da assinatura e marca o documento como assinado, na mesma transação.';
