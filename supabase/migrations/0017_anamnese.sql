-- =====================================================================
-- Migração 0017: anamnese com campos de formulário
--
-- Fecha o módulo de Documentos com o tipo que ficou reservado na 0013.
-- A anamnese pode ser preenchida na consulta, pela administradora, ou
-- pela própria paciente, pelo link que já existe.
--
-- A DIFERENÇA DE NATUREZA É O PONTO. O AGENTS.md diz desde o começo:
-- contrato e termo, depois de assinados, não mudam; anamnese e ficha
-- clínica são conteúdo que evolui. Decidido em 15/09/2026 que a
-- anamnese NÃO tem passo de confirmação e que as respostas podem ser
-- corrigidas a qualquer momento.
--
-- Isso não abre exceção nenhuma à imutabilidade, e é por desenho:
--
--   `documentos.corpo_congelado`  o enunciado. Continua congelado, e o
--                                 gatilho da 0013 continua recusando
--                                 qualquer UPDATE nele.
--   `documento_campos.rotulo`     a pergunta, copiada do modelo na
--                                 emissão. Também congelada — mudar o
--                                 modelo não reescreve o que já foi
--                                 perguntado.
--   `documento_campos.resposta`   o que evolui. Livre.
--
-- A pergunta congela, a resposta vive. Sem isso, corrigir o modelo em
-- março mudaria retroativamente o que foi perguntado em janeiro, e a
-- resposta passaria a responder outra coisa.
--
-- O rastro de quem mudou o quê não se perde: `documento_campos` entra na
-- auditoria, então "ela declarou que não tinha alergia" continua tendo
-- data, autor e valor anterior — só que no lugar certo, que é a trilha,
-- não uma trava.
--
-- Anamnese não passa a `assinado`: ela não tem confirmação. Fica em
-- `emitido` para sempre, e "respondida" é DERIVADA da contagem de
-- obrigatórias com resposta — estado gravado envelhece, como diz a §8.4
-- sobre "vencida".
-- =====================================================================

-- ---------------------------------------------------------------------
-- As perguntas moram na versão do modelo
--
-- Em `jsonb` e não em tabela própria porque elas versionam JUNTO com o
-- texto: uma versão do modelo é um enunciado e um conjunto de perguntas,
-- e separá-los permitiria as duas coisas divergirem entre si.
-- ---------------------------------------------------------------------

alter table public.modelo_documento_versoes
  add column campos jsonb not null default '[]'::jsonb;

alter table public.modelo_documento_versoes
  add constraint modelo_documento_versoes_campos
    check (jsonb_typeof(campos) = 'array' and jsonb_array_length(campos) <= 120);

comment on column public.modelo_documento_versoes.campos is
  'Perguntas do formulário: [{chave, rotulo, tipo, obrigatorio, opcoes, ajuda}]. Versiona junto com o texto.';

-- ---------------------------------------------------------------------
-- As respostas
--
-- Uma linha por pergunta do documento emitido, com a pergunta copiada
-- dentro. `resposta` nula é pergunta não respondida — diferente de
-- respondida em branco, que não existe: campo de texto vazio volta a
-- nulo.
-- ---------------------------------------------------------------------

create table public.documento_campos (
  id bigint generated always as identity primary key,
  documento_id uuid not null references public.documentos (id) on delete restrict,

  ordem integer not null,

  -- Identificador da pergunta dentro do documento. Vem do modelo e
  -- sobrevive à reordenação — é por ele que a resposta encontra a
  -- pergunta, não pela posição.
  chave text not null,

  -- A pergunta, congelada na emissão.
  rotulo text not null,
  tipo text not null,
  obrigatorio boolean not null default false,
  ajuda text not null default '',

  -- Alternativas, para os tipos de escolha. Array de textos.
  opcoes jsonb not null default '[]'::jsonb,

  -- Valor único. Nulo = não respondida.
  resposta text,

  -- Só para `escolha_multipla`. Vazio e nulo significam a mesma coisa
  -- aqui: nada marcado.
  respostas text[],

  respondido_em timestamptz,
  respondido_por uuid references public.perfis (id) on delete set null,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  exemplo boolean not null default false,

  constraint documento_campos_unica unique (documento_id, chave),

  constraint documento_campos_tipo check (
    tipo in ('texto', 'texto_longo', 'sim_nao', 'escolha_unica',
             'escolha_multipla', 'data', 'numero')
  ),

  constraint documento_campos_rotulo check (length(btrim(rotulo)) between 1 and 300),
  constraint documento_campos_ajuda check (length(ajuda) <= 300),
  constraint documento_campos_opcoes check (jsonb_typeof(opcoes) = 'array'),

  -- Escolha sem alternativa não é escolha.
  constraint documento_campos_opcoes_necessarias check (
    tipo not in ('escolha_unica', 'escolha_multipla')
    or jsonb_array_length(opcoes) >= 1
  ),

  -- A lista só existe onde faz sentido; o valor único, idem.
  constraint documento_campos_forma check (
    (tipo = 'escolha_multipla' and resposta is null)
    or (tipo <> 'escolha_multipla' and respostas is null)
  ),

  -- Cada tipo aceita o que o seu tipo aceita. O banco recusa o que a
  -- tela deixaria passar — é a mesma regra nas duas portas.
  constraint documento_campos_resposta check (
    resposta is null
    or (tipo in ('texto', 'texto_longo') and length(resposta) <= 4000)
    or (tipo = 'sim_nao' and resposta in ('sim', 'nao'))
    or (tipo = 'data' and resposta ~ '^\d{4}-\d{2}-\d{2}$')
    or (tipo = 'numero' and resposta ~ '^-?[0-9]+([.,][0-9]{1,4})?$')
    -- `?` pergunta se o texto está entre os elementos do array jsonb.
    or (tipo = 'escolha_unica' and opcoes ? resposta)
  )
);

comment on table public.documento_campos is
  'Respostas da anamnese, com a pergunta congelada em cada linha. A pergunta não muda; a resposta, sim.';

comment on column public.documento_campos.chave is
  'Identificador da pergunta dentro do documento. Sobrevive à reordenação.';

create index documento_campos_documento
  on public.documento_campos (documento_id, ordem);

create trigger documento_campos_tocar_atualizado_em
  before update on public.documento_campos
  for each row execute function public.tocar_atualizado_em();

-- Resposta de anamnese é dado de saúde: entra na auditoria, e é ela que
-- guarda quem mudou o quê, já que a linha em si é editável.
create trigger documento_campos_auditoria
  after insert or update or delete on public.documento_campos
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Acesso
--
-- Mesma condição do documento a que pertencem, e como toda anamnese é
-- conteúdo clínico, na prática isto é "só a administradora". A condição
-- fica escrita assim mesmo assim: se um dia existir anamnese de outro
-- tipo, ela não vaza por esquecimento.
--
-- `anon` NÃO entra aqui. A paciente responde pelas funções do fim.
-- ---------------------------------------------------------------------

alter table public.documento_campos enable row level security;

create policy documento_campos_leitura on public.documento_campos
  for select to authenticated
  using (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  );

create policy documento_campos_edicao on public.documento_campos
  for update to authenticated
  using (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  )
  with check (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  );

-- Inserir é tarefa da emissão, não de gente: as linhas nascem em
-- `documento_emitir`, a partir do modelo. Sem política de INSERT e sem
-- política de DELETE — pergunta não se acrescenta nem se some de um
-- documento já emitido.

grant select, update on public.documento_campos to authenticated;
revoke all on public.documento_campos from anon;

-- ---------------------------------------------------------------------
-- Modelos: agora com perguntas
--
-- A lista de parâmetros muda, então não dá para `create or replace` —
-- ficaria uma sobrecarga, e o PostgREST não saberia qual chamar.
-- ---------------------------------------------------------------------

drop function if exists public.modelo_documento_criar(public.tipo_documento, text, text, text);
drop function if exists public.modelo_documento_nova_versao(uuid, text, text, text, text);

/*
 * Valida a forma das perguntas antes de deixá-las entrar.
 *
 * Roda na criação do modelo e não só na emissão: pergunta malformada
 * descoberta na hora de emitir seria descoberta tarde demais, com a
 * paciente esperando.
 */
create or replace function private.campos_validos(p_campos jsonb)
returns boolean
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_campo jsonb;
  v_tipo text;
  v_chaves text[] := '{}';
  v_chave text;
begin
  if jsonb_typeof(p_campos) <> 'array' then return false; end if;

  for v_campo in select * from jsonb_array_elements(p_campos) loop
    v_chave := v_campo ->> 'chave';
    v_tipo := v_campo ->> 'tipo';

    if v_chave is null or length(btrim(v_chave)) = 0 then return false; end if;
    if v_chave = any(v_chaves) then return false; end if;
    v_chaves := v_chaves || v_chave;

    if v_campo ->> 'rotulo' is null
       or length(btrim(v_campo ->> 'rotulo')) = 0
       or length(v_campo ->> 'rotulo') > 300 then
      return false;
    end if;

    if v_tipo not in ('texto', 'texto_longo', 'sim_nao', 'escolha_unica',
                      'escolha_multipla', 'data', 'numero') then
      return false;
    end if;

    if v_tipo in ('escolha_unica', 'escolha_multipla') then
      if jsonb_typeof(v_campo -> 'opcoes') <> 'array'
         or jsonb_array_length(v_campo -> 'opcoes') < 1 then
        return false;
      end if;
    end if;
  end loop;

  return true;
end;
$$;

create function public.modelo_documento_criar(
  p_tipo public.tipo_documento,
  p_nome text,
  p_descricao text,
  p_corpo text,
  p_campos jsonb
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
  v_campos jsonb := coalesce(p_campos, '[]'::jsonb);
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

  if not private.campos_validos(v_campos) then
    raise exception 'Perguntas do formulário inválidas';
  end if;

  -- Anamnese sem pergunta nenhuma é um texto com outro nome.
  if p_tipo = 'anamnese' and jsonb_array_length(v_campos) = 0 then
    raise exception 'Anamnese precisa de pelo menos uma pergunta';
  end if;

  insert into public.modelos_documento (tipo, nome, descricao, criado_por)
  values (p_tipo, v_nome, btrim(coalesce(p_descricao, '')), auth.uid())
  returning id into v_modelo_id;

  insert into public.modelo_documento_versoes
    (modelo_id, versao, corpo, campos, motivo, criado_por)
  values (v_modelo_id, 1, v_corpo, v_campos, 'Texto inicial', auth.uid());

  return v_modelo_id;
end;
$$;

create function public.modelo_documento_nova_versao(
  p_modelo_id uuid,
  p_nome text,
  p_descricao text,
  p_corpo text,
  p_campos jsonb,
  p_motivo text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_proxima integer;
  v_tipo public.tipo_documento;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_corpo text := btrim(coalesce(p_corpo, ''));
  v_motivo text := btrim(coalesce(p_motivo, ''));
  v_campos jsonb := coalesce(p_campos, '[]'::jsonb);
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

  if not private.campos_validos(v_campos) then
    raise exception 'Perguntas do formulário inválidas';
  end if;

  select tipo into v_tipo from public.modelos_documento where id = p_modelo_id;
  if not found then
    raise exception 'Modelo não encontrado';
  end if;

  if v_tipo = 'anamnese' and jsonb_array_length(v_campos) = 0 then
    raise exception 'Anamnese precisa de pelo menos uma pergunta';
  end if;

  update public.modelos_documento
     set nome = v_nome,
         descricao = btrim(coalesce(p_descricao, ''))
   where id = p_modelo_id;

  select coalesce(max(versao), 0) + 1 into v_proxima
    from public.modelo_documento_versoes
   where modelo_id = p_modelo_id;

  insert into public.modelo_documento_versoes
    (modelo_id, versao, corpo, campos, motivo, criado_por)
  values (p_modelo_id, v_proxima, v_corpo, v_campos, v_motivo, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- Emitir passa a copiar as perguntas
-- ---------------------------------------------------------------------

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

  -- As perguntas viram linhas agora, com o enunciado copiado dentro.
  -- Apontar para o modelo em vez de copiar faria a correção de março
  -- reescrever o que foi perguntado em janeiro.
  insert into public.documento_campos
    (documento_id, ordem, chave, rotulo, tipo, obrigatorio, ajuda, opcoes)
  select
    v_documento_id,
    (ordinalidade - 1)::integer,
    campo ->> 'chave',
    btrim(campo ->> 'rotulo'),
    campo ->> 'tipo',
    coalesce((campo ->> 'obrigatorio')::boolean, false),
    left(coalesce(campo ->> 'ajuda', ''), 300),
    coalesce(campo -> 'opcoes', '[]'::jsonb)
  from jsonb_array_elements(v_versao.campos) with ordinality as t(campo, ordinalidade);

  if p_documento_anterior_id is not null then
    update public.documentos
       set situacao = 'substituido'
     where id = p_documento_anterior_id
       and situacao <> 'assinado';
  end if;

  return v_documento_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Responder
--
-- `p_respostas` é um objeto chave → valor. Valor `null` limpa a
-- resposta; texto vazio também, porque "respondida em branco" não
-- existe e guardar string vazia faria parecer que existe.
--
-- Uma função só para os dois caminhos de escrita seria mais enxuta, mas
-- o caminho da paciente precisa ser `security definer` e este não — dar
-- poder de definer a quem já tem sessão seria emprestar privilégio sem
-- precisar.
-- ---------------------------------------------------------------------

create or replace function public.documento_campos_responder(
  p_documento_id uuid,
  p_respostas jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_chave text;
  v_valor jsonb;
  v_campo public.documento_campos;
  v_texto text;
  v_lista text[];
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  if jsonb_typeof(coalesce(p_respostas, 'null'::jsonb)) <> 'object' then
    raise exception 'Respostas inválidas';
  end if;

  for v_chave, v_valor in select * from jsonb_each(p_respostas) loop
    select * into v_campo
      from public.documento_campos
     where documento_id = p_documento_id and chave = v_chave;

    -- Chave que não existe neste documento é ignorada, não é erro: o
    -- modelo pode ter mudado desde que a tela foi aberta.
    continue when not found;

    if v_campo.tipo = 'escolha_multipla' then
      v_lista := case
        when jsonb_typeof(v_valor) = 'array' then
          (select array_agg(item) from jsonb_array_elements_text(v_valor) as item)
        else null
      end;

      -- Marcação fora das alternativas é recusada inteira, em vez de
      -- gravar metade: resposta pela metade engana quem lê.
      if v_lista is not null and exists (
        select 1 from unnest(v_lista) as escolha
        where not (v_campo.opcoes ? escolha)
      ) then
        raise exception 'Alternativa inválida em "%"', v_campo.rotulo;
      end if;

      update public.documento_campos
         set respostas = case when coalesce(array_length(v_lista, 1), 0) = 0
                              then null else v_lista end,
             respondido_em = now(),
             respondido_por = auth.uid()
       where id = v_campo.id;
    else
      v_texto := case when jsonb_typeof(v_valor) = 'null' then null
                      else btrim(v_valor #>> '{}') end;

      update public.documento_campos
         set resposta = nullif(coalesce(v_texto, ''), ''),
             respondido_em = now(),
             respondido_por = auth.uid()
       where id = v_campo.id;
    end if;
  end loop;
end;
$$;

-- A paciente respondendo pelo link. Confere token, validade, data de
-- nascimento e tipo, e só então grava — a página é conveniência, não
-- guarda.
create or replace function public.documento_responder_por_link(
  p_token text,
  p_nascimento date,
  p_respostas jsonb
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_documento public.documentos;
  v_paciente public.pacientes;
  v_chave text;
  v_valor jsonb;
  v_campo public.documento_campos;
  v_texto text;
  v_lista text[];
begin
  if p_token is null or length(p_token) < 32 or p_nascimento is null then
    return 'nao_encontrado';
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if not found then return 'nao_encontrado'; end if;
  if v_link.revogado_em is not null then return 'revogado'; end if;
  if v_link.expira_em <= now() then return 'expirado'; end if;
  if v_link.tentativas >= 10 then return 'bloqueado'; end if;

  select * into v_documento from public.documentos where id = v_link.documento_id;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_paciente.data_nascimento is distinct from p_nascimento then
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    return 'data_incorreta';
  end if;

  if v_documento.tipo <> 'anamnese' then return 'indisponivel'; end if;
  if v_documento.situacao <> 'emitido' then return 'indisponivel'; end if;
  if jsonb_typeof(coalesce(p_respostas, 'null'::jsonb)) <> 'object' then
    return 'respostas_invalidas';
  end if;

  for v_chave, v_valor in select * from jsonb_each(p_respostas) loop
    select * into v_campo
      from public.documento_campos
     where documento_id = v_documento.id and chave = v_chave;

    continue when not found;

    if v_campo.tipo = 'escolha_multipla' then
      v_lista := case
        when jsonb_typeof(v_valor) = 'array' then
          (select array_agg(item) from jsonb_array_elements_text(v_valor) as item)
        else null
      end;

      if v_lista is not null and exists (
        select 1 from unnest(v_lista) as escolha
        where not (v_campo.opcoes ? escolha)
      ) then
        return 'respostas_invalidas';
      end if;

      update public.documento_campos
         set respostas = case when coalesce(array_length(v_lista, 1), 0) = 0
                              then null else v_lista end,
             respondido_em = now()
       where id = v_campo.id;
    else
      v_texto := case when jsonb_typeof(v_valor) = 'null' then null
                      else btrim(v_valor #>> '{}') end;

      -- Sem `respondido_por`: quem respondeu foi a paciente, e ela não
      -- tem perfil no sistema. Nulo aqui significa exatamente isso.
      update public.documento_campos
         set resposta = nullif(coalesce(v_texto, ''), ''),
             respondido_em = now()
       where id = v_campo.id;
    end if;
  end loop;

  update public.documento_links
     set aberturas = aberturas + 1,
         aberto_em = coalesce(aberto_em, now())
   where id = v_link.id;

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- A porta pública passa a devolver as perguntas
-- ---------------------------------------------------------------------

drop function if exists public.documento_para_assinatura(text, date);

create function public.documento_para_assinatura(
  p_token text,
  p_nascimento date
)
returns table (
  situacao text,
  titulo text,
  corpo text,
  paciente text,
  tipo text,
  emitido_em timestamptz,
  hash text,
  assinado_em timestamptz,
  assinado_por text,
  campos jsonb
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_documento public.documentos;
  v_paciente public.pacientes;
  v_assinatura public.documento_assinaturas;
begin
  situacao := 'nao_encontrado';
  campos := '[]'::jsonb;

  if p_token is null or length(p_token) < 32 or p_nascimento is null then
    return next; return;
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if not found then return next; return; end if;

  if v_link.revogado_em is not null then
    situacao := 'revogado'; return next; return;
  end if;

  if v_link.expira_em <= now() then
    situacao := 'expirado'; return next; return;
  end if;

  if v_link.tentativas >= 10 then
    situacao := 'bloqueado'; return next; return;
  end if;

  select * into v_documento from public.documentos where id = v_link.documento_id;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_paciente.data_nascimento is distinct from p_nascimento then
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    situacao := 'data_incorreta';
    return next; return;
  end if;

  if v_documento.situacao = 'assinado' then
    situacao := 'ja_assinado';
  elsif v_documento.situacao <> 'emitido' then
    situacao := 'indisponivel';
  else
    situacao := 'ok';
  end if;

  update public.documento_links
     set tentativas = 0,
         aberturas = aberturas + 1,
         aberto_em = coalesce(aberto_em, now())
   where id = v_link.id;

  titulo := v_documento.titulo;
  tipo := v_documento.tipo::text;
  emitido_em := v_documento.emitido_em;
  hash := v_documento.corpo_hash;
  paciente := coalesce(nullif(btrim(v_paciente.nome_social), ''), v_paciente.nome);

  if situacao in ('ok', 'ja_assinado') then
    corpo := v_documento.corpo_congelado;

    -- As perguntas e o que já foi respondido. A paciente que voltar ao
    -- link encontra a anamnese como deixou, e corrige o que quiser.
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'chave', c.chave,
          'rotulo', c.rotulo,
          'tipo', c.tipo,
          'obrigatorio', c.obrigatorio,
          'ajuda', c.ajuda,
          'opcoes', c.opcoes,
          'resposta', c.resposta,
          'respostas', to_jsonb(c.respostas)
        ) order by c.ordem
      ),
      '[]'::jsonb
    )
    into campos
    from public.documento_campos c
    where c.documento_id = v_documento.id;
  end if;

  if situacao = 'ja_assinado' then
    select * into v_assinatura
      from public.documento_assinaturas
     where documento_id = v_documento.id;

    if found then
      assinado_em := v_assinatura.assinado_em;
      assinado_por := v_assinatura.nome_informado;
    end if;
  end if;

  return next;
end;
$$;

-- Anamnese não se assina: ela não tem passo de confirmação. A tela nunca
-- oferece, e aqui também não passa.
create or replace function public.documento_assinar_por_link(
  p_token text,
  p_nascimento date,
  p_nome text,
  p_cpf text,
  p_ip text,
  p_dispositivo text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_documento public.documentos;
  v_paciente public.pacientes;
  v_nome text := btrim(coalesce(p_nome, ''));
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_verificacao text;
begin
  if p_token is null or length(p_token) < 32 or p_nascimento is null then
    return 'nao_encontrado';
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if not found then return 'nao_encontrado'; end if;
  if v_link.revogado_em is not null then return 'revogado'; end if;
  if v_link.expira_em <= now() then return 'expirado'; end if;
  if v_link.tentativas >= 10 then return 'bloqueado'; end if;

  select * into v_documento from public.documentos where id = v_link.documento_id;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_paciente.data_nascimento is distinct from p_nascimento then
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    return 'data_incorreta';
  end if;

  if v_documento.tipo = 'anamnese' then return 'indisponivel'; end if;
  if v_documento.situacao = 'assinado' then return 'ja_assinado'; end if;
  if v_documento.situacao <> 'emitido' then return 'indisponivel'; end if;

  if length(v_nome) < 3 then return 'nome_invalido'; end if;
  if v_cpf is not null and length(v_cpf) <> 11 then return 'cpf_invalido'; end if;

  v_verificacao := 'Assinatura à distância: posse do link'
    || case when v_link.canal_envio <> '' then ' enviado por ' || v_link.canal_envio else '' end
    || ' e data de nascimento conferida.';

  insert into public.documento_assinaturas (
    documento_id, nome_informado, cpf_informado, hash_assinado, ip,
    dispositivo, verificacao_identidade, operador_id, canal, link_id
  )
  values (
    v_documento.id, v_nome, v_cpf, v_documento.corpo_hash,
    nullif(btrim(coalesce(p_ip, '')), '')::inet,
    nullif(btrim(coalesce(p_dispositivo, '')), ''),
    left(v_verificacao, 240), null, 'link', v_link.id
  );

  update public.documentos set situacao = 'assinado' where id = v_documento.id;

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- Permissões
--
-- `documento_responder_por_link` é a QUARTA função alcançável por
-- `anon`, e continua sendo só função — nenhuma tabela.
-- ---------------------------------------------------------------------

revoke all on function private.campos_validos(jsonb) from public, anon;

revoke all on function public.modelo_documento_criar(public.tipo_documento, text, text, text, jsonb) from public, anon;
revoke all on function public.modelo_documento_nova_versao(uuid, text, text, text, jsonb, text) from public, anon;
revoke all on function public.documento_campos_responder(uuid, jsonb) from public, anon;
revoke all on function public.documento_para_assinatura(text, date) from public, anon;
revoke all on function public.documento_responder_por_link(text, date, jsonb) from public, anon;

grant execute on function private.campos_validos(jsonb) to authenticated;
grant execute on function public.modelo_documento_criar(public.tipo_documento, text, text, text, jsonb) to authenticated;
grant execute on function public.modelo_documento_nova_versao(uuid, text, text, text, jsonb, text) to authenticated;
grant execute on function public.documento_campos_responder(uuid, jsonb) to authenticated;

grant execute on function public.documento_para_assinatura(text, date) to anon, authenticated;
grant execute on function public.documento_responder_por_link(text, date, jsonb) to anon, authenticated;

comment on function public.documento_responder_por_link(text, date, jsonb) is
  'Porta pública: grava as respostas da anamnese mediante data de nascimento. Executável por anon.';
comment on function public.documento_campos_responder(uuid, jsonb) is
  'Grava respostas da anamnese pela equipe. Resposta vazia volta a nulo — respondida em branco não existe.';
