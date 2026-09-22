-- =====================================================================
-- Migração 0018: a emissão volta a conseguir gravar as perguntas
--
-- A 0017 quebrou a emissão de todo documento com perguntas — a anamnese
-- inteira. Nem a administradora conseguia emitir: a tela dizia "seu
-- perfil não tem permissão", e o banco dizia
--
--   42501 | new row violates row-level security policy for table
--           "documento_campos"
--
-- O erro de raciocínio: `documento_campos` nasceu sem política de INSERT,
-- de propósito — pergunta não se acrescenta à mão num documento já
-- emitido. Mas quem grava as perguntas é `documento_emitir`, e ela é
-- `security invoker`: roda com os privilégios de quem clicou. Sem
-- política, a RLS recusou a própria emissão. A intenção estava certa; a
-- porta escolhida para cumpri-la, não.
--
-- Contrato, termo e orientação sem perguntas não quebravam: INSERT ...
-- SELECT de zero linhas não aciona a verificação de política, que é por
-- linha. Por isso os testes da 0013–0016 continuaram passando.
--
-- A correção mantém a intenção e troca a porta:
--
--   `private.documento_campos_criar` é `security definer` e é a ÚNICA
--   forma de uma pergunta entrar em `documento_campos`. Ela não recebe
--   perguntas por parâmetro — lê da versão do modelo que o próprio
--   documento aponta —, e só age se o documento ainda não tem nenhuma.
--   Chamá-la de novo não acrescenta nada; chamá-la com outro documento
--   só cria as perguntas que ele já devia ter.
--
--   `documento_emitir` continua `security invoker`. Dar privilégio de
--   dono à emissão inteira para resolver uma inserção seria emprestar
--   poder a tudo o que ela faz.
--
--   A tabela continua SEM política de INSERT. Ninguém insere pergunta
--   pela API.
--
-- Correção de registro sobre a 0017: o comentário dela dizia
-- `grant select, update`, como se `authenticated` só tivesse isso. Não
-- é verdade — o padrão do Supabase já concede todos os privilégios de
-- tabela a `authenticated`, e o `grant` da 0017 só repetiu dois deles.
-- O que de fato impede INSERT e DELETE em `documento_campos` é a
-- ausência de política com a RLS ligada. Isso vale para o projeto
-- inteiro, não só aqui.
-- =====================================================================

create or replace function private.documento_campos_criar(p_documento_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_documento public.documentos;
  v_campos jsonb;
begin
  -- `security definer` não tem a RLS olhando por ele. As checagens de
  -- quem pode ficam explícitas, espelhando `documento_emitir`.
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  select * into v_documento from public.documentos where id = p_documento_id;
  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_documento.tipo = 'anamnese' and not private.e_administradora() then
    raise exception 'Apenas a administradora emite anamnese';
  end if;

  -- Pergunta só entra uma vez, na emissão. Documento que já tem perguntas
  -- não ganha outras — é o que mantém "a pergunta congela" verdadeiro.
  if exists (select 1 from public.documento_campos where documento_id = p_documento_id) then
    return;
  end if;

  -- As perguntas vêm da versão exata que o documento congelou, nunca de
  -- parâmetro. Não há como pedir a esta função uma pergunta inventada.
  select v.campos into v_campos
    from public.modelo_documento_versoes v
   where v.modelo_id = v_documento.modelo_id
     and v.versao = v_documento.modelo_versao;

  if v_campos is null or jsonb_array_length(v_campos) = 0 then
    return;
  end if;

  insert into public.documento_campos
    (documento_id, ordem, chave, rotulo, tipo, obrigatorio, ajuda, opcoes)
  select
    p_documento_id,
    (ordinalidade - 1)::integer,
    campo ->> 'chave',
    btrim(campo ->> 'rotulo'),
    campo ->> 'tipo',
    coalesce((campo ->> 'obrigatorio')::boolean, false),
    left(coalesce(campo ->> 'ajuda', ''), 300),
    coalesce(campo -> 'opcoes', '[]'::jsonb)
  from jsonb_array_elements(v_campos) with ordinality as t(campo, ordinalidade);
end;
$$;

comment on function private.documento_campos_criar(uuid) is
  'Única porta de entrada de perguntas em documento_campos. Copia da versão do modelo do próprio documento, uma vez só.';

-- `private` não é publicado pelo PostgREST (0003): isto não vira endpoint.
-- `authenticated` precisa de EXECUTE porque `documento_emitir` é invoker e
-- chama esta função com os privilégios de quem clicou.
revoke all on function private.documento_campos_criar(uuid) from public, anon;
grant execute on function private.documento_campos_criar(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- A emissão passa a chamar a função em vez de inserir direto
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

  -- As perguntas entram pela única porta que existe para elas. Ver o
  -- cabeçalho: inserir aqui direto esbarrava na RLS de quem clicou.
  perform private.documento_campos_criar(v_documento_id);

  if p_documento_anterior_id is not null then
    update public.documentos
       set situacao = 'substituido'
     where id = p_documento_anterior_id
       and situacao <> 'assinado';
  end if;

  return v_documento_id;
end;
$$;
