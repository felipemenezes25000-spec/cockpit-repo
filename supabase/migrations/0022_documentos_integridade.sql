-- =====================================================================
-- Migração 0022: documento, assinatura e prontuário — o banco garante o
-- que a 0013–0018 prometiam
--
-- As funções da 0013 em diante fazem a coisa certa. O problema era a porta
-- ao lado delas: as políticas de INSERT e UPDATE de `documentos`,
-- `documento_assinaturas` e `documento_campos` liberavam a tabela inteira
-- a qualquer perfil ativo. Quem chamasse a API direto, sem passar pelas
-- funções, podia:
--
--   - INSERIR um documento com o texto que quisesse, "assinado", com data
--     retroativa e em nome de outra pessoa. O gatilho da 0013 calculava o
--     hash do texto inventado — e o hash atestava a mentira. É exatamente o
--     que o AGENTS.md §8.7 diz que não pode acontecer ("quem congela é o
--     banco, não a aplicação").
--   - MUDAR um contrato assinado de paciente, de título, de data; passar
--     documento a `assinado` sem assinatura nenhuma; ressuscitar um
--     cancelado (e com ele os links antigos). E a administradora podia
--     trocar o `tipo` de uma anamnese para contrato — o que abriria as
--     respostas clínicas para a recepção, porque as políticas de
--     `documento_campos` olham o tipo do documento.
--   - INSERIR evidência de assinatura: canal "link", data retroativa, hash
--     qualquer, operador de outra pessoa. E, de quebra, travar a
--     assinatura verdadeira da paciente com 23505.
--   - REESCREVER a pergunta congelada da anamnese (`rotulo`, `opcoes`) e
--     responder documento cancelado, substituído ou — para contrato com
--     perguntas — já assinado.
--
-- A correção segue o desenho da 0018 e da 0020: a função é a porta, e o
-- banco confere o que entra por qualquer porta.
--
-- 1. `documentos` nasce do modelo. Um gatilho BEFORE INSERT confere que o
--    corpo é exatamente o da versão apontada, que o tipo é o do modelo e
--    que o documento anterior é da mesma paciente — e fixa situação,
--    emissor e hora. `documento_emitir` passa sem mudança nenhuma, porque
--    já fazia isso.
-- 2. `documentos` só muda de situação. `authenticated` perde UPDATE na
--    tabela e fica com UPDATE só em `situacao` e `motivo_cancelamento`. Um
--    gatilho recusa mexer em paciente, modelo, tipo, título ou datas, e só
--    deixa a situação sair de `emitido`: para `assinado` com a assinatura
--    registrada (e nunca anamnese), para `substituido` com o documento que
--    o corrige, para `cancelado` com motivo (CHECK da 0013).
-- 3. A evidência da assinatura é escrita pelo banco. Um gatilho em
--    `documento_assinaturas` trava o documento, exige que ele esteja
--    `emitido` e não seja anamnese, e fixa o hash e a hora. Quando quem
--    grava é a sessão de um perfil (`current_user = authenticated`, o
--    balcão), fixa também canal, operador e provedor — só a função pública
--    do link, que roda como dona, grava canal `link`.
-- 4. A pergunta congela de verdade. UPDATE em `documento_campos` fica
--    restrito às colunas de resposta, e um gatilho recusa resposta em
--    documento que não esteja `emitido` e confere alternativa e data.
-- 5. O link público deixa de ter corrida. As três funções que leem o link
--    com data de nascimento travam a linha (`for update`): dez tentativas
--    são dez, não "dez mais o tamanho do pool de conexões". Assinar trava
--    o documento, grava com `on conflict do nothing` e responde
--    `ja_assinado` à segunda aba em vez de estourar 23505. Responder por
--    link valida TUDO antes de gravar qualquer coisa (resposta inválida
--    volta `respostas_invalidas`, não uma exceção crua que fazia a
--    paciente perder o envio inteiro) e só grava o que mudou — cada
--    gravação é uma linha de auditoria.
-- 6. Menores:
--      - `documento_assinar` recusa anamnese (a anamnese fica em
--        preenchimento para sempre, §8.7) e valida o nome no limite do CHECK;
--      - IP que não é IP vira nulo, como o comentário da 0013 já prometia;
--      - `documento_emitir` diz em português por que não corrige um
--        documento cancelado ou já substituído, em vez de 23514;
--      - `documento_link_criar` trava o documento (dois cliques não deixam
--        dois links vivos) e exige token no formato que a aplicação gera;
--      - `canal_envio` só aceita "WhatsApp" e o telefone — ele entra por
--        extenso no texto da evidência, e texto livre ali seria evidência
--        escrita por quem opera;
--      - `private.campos_validos` recusa pergunta sem tipo, alternativas
--        que não são texto, `obrigatorio` que não é booleano;
--      - prontuário: UPDATE só em atendimento, data e título (paciente não
--        muda sem versão); versão nova tem autor, hora e número conferidos;
--        o texto clínico ganha no banco o mesmo limite da tela;
--      - fotos: o caminho tem a forma exata `<prontuario>/<uuid>.<ext>`,
--        apagar a linha exige o motivo registrado em
--        `prontuario_imagem_eliminacoes`, e o Storage perde a política de
--        UPDATE (a aplicação nunca sobrescreve: envia com `upsert: false`).
--
-- Gatilhos que valem para sessão de usuário deixam passar quando não há
-- sessão (`auth.uid()` nulo): é a manutenção pelo SQL do projeto, que já
-- passa por cima da RLS. As transições de situação valem sempre.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Documento só nasce do texto de um modelo
-- ---------------------------------------------------------------------

create or replace function private.documento_nasce_do_modelo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_corpo text;
  v_tipo public.tipo_documento;
  v_anterior public.documentos;
begin
  if auth.uid() is null then
    return new;
  end if;

  select v.corpo, m.tipo into v_corpo, v_tipo
    from public.modelo_documento_versoes v
    join public.modelos_documento m on m.id = v.modelo_id
   where v.modelo_id = new.modelo_id
     and v.versao = new.modelo_versao;

  if not found
     or v_corpo is distinct from new.corpo_congelado
     or v_tipo is distinct from new.tipo then
    raise exception 'Documento só nasce do texto de um modelo.';
  end if;

  if new.documento_anterior_id is not null then
    select * into v_anterior from public.documentos where id = new.documento_anterior_id;
    if not found or v_anterior.paciente_id <> new.paciente_id then
      raise exception 'Documento anterior não pertence a esta paciente';
    end if;
  end if;

  new.situacao := 'emitido';
  new.motivo_cancelamento := '';
  new.emitido_em := now();
  new.emitido_por := auth.uid();
  new.exemplo := false;
  return new;
end;
$$;

revoke all on function private.documento_nasce_do_modelo() from public, anon, authenticated;

create trigger documentos_nasce_do_modelo
  before insert on public.documentos
  for each row execute function private.documento_nasce_do_modelo();

-- ---------------------------------------------------------------------
-- 2. Documento emitido só muda de situação
-- ---------------------------------------------------------------------

revoke update on public.documentos from authenticated;
grant update (situacao, motivo_cancelamento) on public.documentos to authenticated;

create or replace function private.documento_transicao_valida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.paciente_id is distinct from old.paciente_id
     or new.modelo_id is distinct from old.modelo_id
     or new.modelo_versao is distinct from old.modelo_versao
     or new.tipo is distinct from old.tipo
     or new.titulo is distinct from old.titulo
     or new.documento_anterior_id is distinct from old.documento_anterior_id
     or new.emitido_em is distinct from old.emitido_em
     or new.emitido_por is distinct from old.emitido_por then
    raise exception 'Documento emitido não muda de paciente, modelo, tipo, título nem data.';
  end if;

  if new.situacao is distinct from old.situacao then
    if old.situacao <> 'emitido' then
      raise exception 'Só documento em aberto muda de situação.';
    end if;

    if new.situacao = 'assinado' then
      if new.tipo = 'anamnese' then
        raise exception 'Anamnese não se assina: ela fica em preenchimento.';
      end if;
      if not exists (select 1 from public.documento_assinaturas where documento_id = new.id) then
        raise exception 'Documento só passa a assinado com a assinatura registrada.';
      end if;
    elsif new.situacao = 'substituido' then
      if not exists (select 1 from public.documentos where documento_anterior_id = new.id) then
        raise exception 'Documento só é substituído por outro que o corrija.';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function private.documento_transicao_valida() from public, anon, authenticated;

create trigger documentos_transicao_valida
  before update on public.documentos
  for each row execute function private.documento_transicao_valida();

-- ---------------------------------------------------------------------
-- 3. A evidência da assinatura é escrita pelo banco
-- ---------------------------------------------------------------------

-- SECURITY INVOKER de propósito: `current_user` é o que separa o balcão
-- (a sessão do perfil, `authenticated`) da função pública do link, que
-- roda como dona. Com DEFINER, as duas seriam a mesma pessoa.
create or replace function private.assinatura_confere_documento()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_documento public.documentos;
begin
  select * into v_documento
    from public.documentos
   where id = new.documento_id
   for update;

  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_documento.tipo = 'anamnese' then
    raise exception 'Anamnese não se assina: ela fica em preenchimento.';
  end if;

  if v_documento.situacao <> 'emitido' then
    raise exception 'Só documento emitido pode ser assinado';
  end if;

  new.hash_assinado := v_documento.corpo_hash;
  new.assinado_em := now();
  new.exemplo := false;

  if current_user = 'authenticated' then
    new.canal := 'balcao';
    new.link_id := null;
    new.operador_id := auth.uid();
    new.provedor := 'interno';
    new.referencia_externa := null;
    new.url_comprovante := null;
  end if;

  return new;
end;
$$;

revoke all on function private.assinatura_confere_documento() from public, anon, authenticated;

create trigger documento_assinaturas_confere
  before insert on public.documento_assinaturas
  for each row execute function private.assinatura_confere_documento();

-- Assinatura registrada fecha o documento na mesma transação. Sem isto, uma
-- assinatura gravada direto pela API — agora com a evidência que o banco
-- escreve — deixaria o documento "emitido" com assinatura: estado que não
-- existe no domínio. As funções continuam fazendo o próprio UPDATE, que
-- passa a não mudar nada.
create or replace function private.assinatura_fecha_documento()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.documentos
     set situacao = 'assinado'
   where id = new.documento_id
     and situacao = 'emitido';
  return new;
end;
$$;

revoke all on function private.assinatura_fecha_documento() from public, anon, authenticated;

create trigger documento_assinaturas_fecha_documento
  after insert on public.documento_assinaturas
  for each row execute function private.assinatura_fecha_documento();

-- ---------------------------------------------------------------------
-- 4. A pergunta congela; a resposta só vive enquanto o documento vive
-- ---------------------------------------------------------------------

revoke update on public.documento_campos from authenticated;
grant update (resposta, respostas, respondido_em, respondido_por)
  on public.documento_campos to authenticated;

create or replace function private.campo_resposta_valida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_situacao public.situacao_documento;
begin
  if new.documento_id is distinct from old.documento_id
     or new.ordem is distinct from old.ordem
     or new.chave is distinct from old.chave
     or new.rotulo is distinct from old.rotulo
     or new.tipo is distinct from old.tipo
     or new.obrigatorio is distinct from old.obrigatorio
     or new.ajuda is distinct from old.ajuda
     or new.opcoes is distinct from old.opcoes
     or new.criado_em is distinct from old.criado_em then
    raise exception 'A pergunta de um documento emitido não muda.';
  end if;

  if new.resposta is not distinct from old.resposta
     and new.respostas is not distinct from old.respostas then
    return new;
  end if;

  select situacao into v_situacao from public.documentos where id = new.documento_id;
  if v_situacao is distinct from 'emitido' then
    raise exception 'Este documento não aceita mais respostas.';
  end if;

  if new.tipo = 'escolha_multipla' and new.respostas is not null and exists (
       select 1 from unnest(new.respostas) as escolha where not (new.opcoes ? escolha)
     ) then
    raise exception 'Alternativa inválida em "%".', new.rotulo;
  end if;

  if new.tipo = 'data' and new.resposta is not null then
    begin
      perform new.resposta::date;
    exception when others then
      raise exception 'Data inválida em "%".', new.rotulo;
    end;
  end if;

  return new;
end;
$$;

revoke all on function private.campo_resposta_valida() from public, anon, authenticated;

create trigger documento_campos_resposta_valida
  before update on public.documento_campos
  for each row execute function private.campo_resposta_valida();

-- Uma resposta, conferida contra a pergunta. Devolve o texto normalizado
-- (ou a lista, em `p_lista`) e `false` quando não serve. Usada pelas duas
-- portas de resposta, para a regra ser uma só.
create or replace function private.resposta_de_campo(
  p_campo public.documento_campos,
  p_valor jsonb,
  out ok boolean,
  out texto text,
  out lista text[]
)
language plpgsql
stable
set search_path = public, pg_temp
as $$
begin
  ok := true;
  texto := null;
  lista := null;

  if p_campo.tipo = 'escolha_multipla' then
    if p_valor is null or jsonb_typeof(p_valor) = 'null' then
      return;
    end if;
    if jsonb_typeof(p_valor) <> 'array' or jsonb_array_length(p_valor) > 50 then
      ok := false; return;
    end if;
    if exists (select 1 from jsonb_array_elements(p_valor) e where jsonb_typeof(e) <> 'string') then
      ok := false; return;
    end if;
    select array_agg(distinct item) into lista from jsonb_array_elements_text(p_valor) as item;
    if lista is not null and exists (
         select 1 from unnest(lista) as escolha where not (p_campo.opcoes ? escolha)
       ) then
      ok := false; return;
    end if;
    if coalesce(array_length(lista, 1), 0) = 0 then
      lista := null;
    end if;
    return;
  end if;

  if p_valor is not null and jsonb_typeof(p_valor) not in ('null', 'string', 'number', 'boolean') then
    ok := false; return;
  end if;

  texto := nullif(btrim(coalesce(p_valor #>> '{}', '')), '');
  if texto is null then
    return;
  end if;

  if p_campo.tipo in ('texto', 'texto_longo') then
    ok := length(texto) <= 4000;
  elsif p_campo.tipo = 'sim_nao' then
    ok := texto in ('sim', 'nao');
  elsif p_campo.tipo = 'numero' then
    ok := texto ~ '^-?[0-9]+([.,][0-9]{1,4})?$' and length(texto) <= 30;
  elsif p_campo.tipo = 'escolha_unica' then
    ok := p_campo.opcoes ? texto;
  elsif p_campo.tipo = 'data' then
    if texto !~ '^\d{4}-\d{2}-\d{2}$' then
      ok := false;
    else
      begin
        perform texto::date;
      exception when others then
        ok := false;
      end;
    end if;
  else
    ok := false;
  end if;
end;
$$;

revoke all on function private.resposta_de_campo(public.documento_campos, jsonb) from public, anon;
grant execute on function private.resposta_de_campo(public.documento_campos, jsonb) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Funções recriadas
-- ---------------------------------------------------------------------

-- 5.1 Emitir: mensagem própria para anterior cancelado ou já substituído.
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
  v_anterior public.documentos;
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
    select * into v_anterior
      from public.documentos
     where id = p_documento_anterior_id and paciente_id = p_paciente_id
     for update;

    if not found then
      raise exception 'Documento anterior não pertence a esta paciente';
    end if;

    if v_anterior.situacao in ('cancelado', 'substituido') then
      raise exception 'O documento anterior já foi cancelado ou substituído. Corrija a partir do documento em vigor.';
    end if;
  end if;

  insert into public.documentos (
    paciente_id, modelo_id, modelo_versao, tipo, titulo,
    corpo_congelado, documento_anterior_id, emitido_por
  )
  values (
    p_paciente_id, p_modelo_id, v_versao.versao, v_modelo.tipo,
    case when length(v_titulo) >= 3 then left(v_titulo, 160) else v_modelo.nome end,
    v_versao.corpo, p_documento_anterior_id, auth.uid()
  )
  returning id into v_documento_id;

  perform private.documento_campos_criar(v_documento_id);

  -- Documento assinado continua assinado: a correção aponta para ele, mas
  -- não desfaz o que a paciente assinou (gatilho da 0013).
  if p_documento_anterior_id is not null and v_anterior.situacao = 'emitido' then
    update public.documentos
       set situacao = 'substituido'
     where id = p_documento_anterior_id;
  end if;

  return v_documento_id;
end;
$$;

-- 5.2 Assinar no balcão: trava, recusa anamnese, IP inválido vira nulo.
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
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_verificacao text := btrim(coalesce(p_verificacao, ''));
  v_ip inet;
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  select * into v_documento from public.documentos where id = p_documento_id for update;
  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_documento.tipo = 'anamnese' then
    raise exception 'Anamnese não se assina: ela fica em preenchimento.';
  end if;

  if v_documento.situacao <> 'emitido' then
    raise exception 'Só documento emitido pode ser assinado';
  end if;

  if length(v_nome) < 3 or length(v_nome) > 160 then
    raise exception 'Informe o nome de quem assina (3 a 160 caracteres).';
  end if;

  if length(v_verificacao) < 3 or length(v_verificacao) > 240 then
    raise exception 'Registre como a identidade foi conferida.';
  end if;

  if v_cpf is not null and length(v_cpf) <> 11 then
    raise exception 'CPF inválido';
  end if;

  begin
    v_ip := nullif(btrim(coalesce(p_ip, '')), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.documento_assinaturas (
    documento_id, nome_informado, cpf_informado, hash_assinado,
    ip, dispositivo, verificacao_identidade, operador_id
  )
  values (
    p_documento_id, v_nome, v_cpf, v_documento.corpo_hash,
    v_ip, left(nullif(btrim(coalesce(p_dispositivo, '')), ''), 400),
    v_verificacao, auth.uid()
  );

  update public.documentos
     set situacao = 'assinado'
   where id = p_documento_id
     and situacao = 'emitido';
end;
$$;

-- 5.3 Criar link: trava o documento; token no formato gerado pela aplicação.
create or replace function public.documento_link_criar(
  p_documento_id uuid,
  p_token text,
  p_dias integer,
  p_canal text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link_id uuid;
  v_documento public.documentos;
  v_nascimento date;
  v_dias integer := coalesce(p_dias, 15);
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  -- 32 bytes aleatórios em base64url: 43 caracteres. Qualquer coisa fora
  -- disso não veio de `gerarToken`.
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43,128}$' then
    raise exception 'Token inválido';
  end if;

  if v_dias < 1 or v_dias > 90 then
    raise exception 'Validade deve ficar entre 1 e 90 dias';
  end if;

  select * into v_documento from public.documentos where id = p_documento_id for update;
  if not found then
    raise exception 'Documento não encontrado';
  end if;

  if v_documento.tipo = 'anamnese' and not private.e_administradora() then
    raise exception 'Apenas a administradora envia anamnese';
  end if;

  if v_documento.situacao <> 'emitido' then
    raise exception 'Só documento aguardando assinatura pode receber link';
  end if;

  select data_nascimento into v_nascimento
    from public.pacientes where id = v_documento.paciente_id;

  if v_nascimento is null then
    raise exception 'Cadastre a data de nascimento da paciente antes de enviar o link';
  end if;

  update public.documento_links
     set revogado_em = now()
   where documento_id = p_documento_id
     and revogado_em is null
     and expira_em > now();

  insert into public.documento_links (documento_id, token_hash, criado_por, expira_em, canal_envio)
  values (
    p_documento_id,
    encode(sha256(convert_to(p_token, 'UTF8')), 'hex'),
    auth.uid(),
    now() + make_interval(days => v_dias),
    ''
  )
  returning id into v_link_id;

  return v_link_id;
end;
$$;

-- 5.4 Abrir o documento pelo link: a linha do link fica travada durante a
-- conferência da data, para a contagem de tentativas não ter corrida.
create or replace function public.documento_para_assinatura(p_token text, p_nascimento date)
returns table(
  situacao text, titulo text, corpo text, paciente text, tipo text,
  emitido_em timestamptz, hash text, assinado_em timestamptz,
  assinado_por text, campos jsonb
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

  if p_token is null or length(p_token) < 32 or length(p_token) > 128 or p_nascimento is null then
    return next; return;
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;

  if not found then return next; return; end if;
  if v_link.revogado_em is not null then situacao := 'revogado'; return next; return; end if;
  if v_link.expira_em <= now() then situacao := 'expirado'; return next; return; end if;
  if v_link.tentativas >= 10 then situacao := 'bloqueado'; return next; return; end if;

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

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'chave', c.chave, 'rotulo', c.rotulo, 'tipo', c.tipo,
          'obrigatorio', c.obrigatorio, 'ajuda', c.ajuda, 'opcoes', c.opcoes,
          'resposta', c.resposta, 'respostas', to_jsonb(c.respostas)
        ) order by c.ordem
      ),
      '[]'::jsonb
    )
    into campos
    from public.documento_campos c
    where c.documento_id = v_documento.id;
  end if;

  if situacao = 'ja_assinado' then
    select * into v_assinatura from public.documento_assinaturas where documento_id = v_documento.id;
    if found then
      assinado_em := v_assinatura.assinado_em;
      assinado_por := v_assinatura.nome_informado;
    end if;
  end if;

  return next;
end;
$$;

-- 5.5 Assinar pelo link: link e documento travados; segunda aba recebe
-- `ja_assinado`; nome no limite do CHECK; IP inválido vira nulo.
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
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_verificacao text;
  v_ip inet;
  v_assinatura_id uuid;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 or p_nascimento is null then
    return 'nao_encontrado';
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;

  if not found then return 'nao_encontrado'; end if;
  if v_link.revogado_em is not null then return 'revogado'; end if;
  if v_link.expira_em <= now() then return 'expirado'; end if;
  if v_link.tentativas >= 10 then return 'bloqueado'; end if;

  select * into v_documento from public.documentos where id = v_link.documento_id for update;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_paciente.data_nascimento is distinct from p_nascimento then
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    return 'data_incorreta';
  end if;

  if v_documento.tipo = 'anamnese' then return 'indisponivel'; end if;
  if v_documento.situacao = 'assinado' then return 'ja_assinado'; end if;
  if v_documento.situacao <> 'emitido' then return 'indisponivel'; end if;

  if length(v_nome) < 3 or length(v_nome) > 160 then return 'nome_invalido'; end if;
  if v_cpf is not null and length(v_cpf) <> 11 then return 'cpf_invalido'; end if;

  begin
    v_ip := nullif(btrim(coalesce(p_ip, '')), '')::inet;
  exception when others then
    v_ip := null;
  end;

  -- O canal entra por extenso na evidência; só o formato que a própria
  -- aplicação grava ("WhatsApp (11) 91234-5678") é aproveitado.
  v_verificacao := 'Assinatura à distância: posse do link'
    || case when v_link.canal_envio ~ '^WhatsApp[ 0-9()+.-]{0,30}$'
            then ' enviado por ' || v_link.canal_envio else '' end
    || ' e data de nascimento conferida.';

  insert into public.documento_assinaturas (
    documento_id, nome_informado, cpf_informado, hash_assinado, ip,
    dispositivo, verificacao_identidade, operador_id, canal, link_id
  )
  values (
    v_documento.id, v_nome, v_cpf, v_documento.corpo_hash, v_ip,
    left(nullif(btrim(coalesce(p_dispositivo, '')), ''), 400),
    left(v_verificacao, 240), null, 'link', v_link.id
  )
  on conflict (documento_id) do nothing
  returning id into v_assinatura_id;

  if v_assinatura_id is null then
    return 'ja_assinado';
  end if;

  update public.documentos
     set situacao = 'assinado'
   where id = v_documento.id
     and situacao = 'emitido';

  update public.documento_links set tentativas = 0 where id = v_link.id;

  return 'ok';
end;
$$;

-- 5.6 Responder pelo link: valida tudo antes de gravar; grava só o que
-- mudou; a data certa zera as tentativas, como ao abrir.
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
  v_resposta record;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 or p_nascimento is null then
    return 'nao_encontrado';
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;

  if not found then return 'nao_encontrado'; end if;
  if v_link.revogado_em is not null then return 'revogado'; end if;
  if v_link.expira_em <= now() then return 'expirado'; end if;
  if v_link.tentativas >= 10 then return 'bloqueado'; end if;

  select * into v_documento from public.documentos where id = v_link.documento_id for update;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_paciente.data_nascimento is distinct from p_nascimento then
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    return 'data_incorreta';
  end if;

  if v_documento.tipo <> 'anamnese' then return 'indisponivel'; end if;
  if v_documento.situacao <> 'emitido' then return 'indisponivel'; end if;

  if jsonb_typeof(coalesce(p_respostas, 'null'::jsonb)) <> 'object'
     or length(p_respostas::text) > 200000
     or (select count(*) from jsonb_object_keys(p_respostas)) > 200 then
    return 'respostas_invalidas';
  end if;

  -- Primeiro confere tudo; só depois grava. Resposta pela metade engana
  -- quem lê.
  for v_chave, v_valor in select * from jsonb_each(p_respostas) loop
    select * into v_campo
      from public.documento_campos
     where documento_id = v_documento.id and chave = v_chave;
    continue when not found;

    select * into v_resposta from private.resposta_de_campo(v_campo, v_valor);
    if not v_resposta.ok then
      return 'respostas_invalidas';
    end if;
  end loop;

  for v_chave, v_valor in select * from jsonb_each(p_respostas) loop
    select * into v_campo
      from public.documento_campos
     where documento_id = v_documento.id and chave = v_chave;
    continue when not found;

    select * into v_resposta from private.resposta_de_campo(v_campo, v_valor);

    -- Sem `respondido_por`: quem respondeu foi a paciente, e ela não tem
    -- perfil no sistema. Nulo aqui significa exatamente isso.
    update public.documento_campos
       set resposta = v_resposta.texto,
           respostas = v_resposta.lista,
           respondido_em = now()
     where id = v_campo.id
       and (resposta is distinct from v_resposta.texto
            or respostas is distinct from v_resposta.lista);
  end loop;

  update public.documento_links
     set tentativas = 0,
         aberturas = aberturas + 1,
         aberto_em = coalesce(aberto_em, now())
   where id = v_link.id;

  return 'ok';
end;
$$;

-- 5.7 Responder na consulta (administradora): mesma conferência, mesma
-- regra de "tudo ou nada", com mensagem em português.
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
  v_resposta record;
  v_situacao public.situacao_documento;
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  if jsonb_typeof(coalesce(p_respostas, 'null'::jsonb)) <> 'object'
     or length(p_respostas::text) > 200000
     or (select count(*) from jsonb_object_keys(p_respostas)) > 200 then
    raise exception 'Respostas inválidas';
  end if;

  select situacao into v_situacao from public.documentos where id = p_documento_id for update;
  if not found then
    raise exception 'Documento não encontrado';
  end if;
  if v_situacao <> 'emitido' then
    raise exception 'Este documento não aceita mais respostas.';
  end if;

  for v_chave, v_valor in select * from jsonb_each(p_respostas) loop
    select * into v_campo
      from public.documento_campos
     where documento_id = p_documento_id and chave = v_chave;
    continue when not found;

    select * into v_resposta from private.resposta_de_campo(v_campo, v_valor);
    if not v_resposta.ok then
      raise exception 'Resposta inválida em "%".', v_campo.rotulo;
    end if;
  end loop;

  for v_chave, v_valor in select * from jsonb_each(p_respostas) loop
    select * into v_campo
      from public.documento_campos
     where documento_id = p_documento_id and chave = v_chave;
    continue when not found;

    select * into v_resposta from private.resposta_de_campo(v_campo, v_valor);

    update public.documento_campos
       set resposta = v_resposta.texto,
           respostas = v_resposta.lista,
           respondido_em = now(),
           respondido_por = auth.uid()
     where id = v_campo.id
       and (resposta is distinct from v_resposta.texto
            or respostas is distinct from v_resposta.lista);
  end loop;
end;
$$;

-- 5.8 Perguntas do modelo: forma conferida de verdade.
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
  v_opcao jsonb;
begin
  if p_campos is null or jsonb_typeof(p_campos) <> 'array' then return false; end if;
  if jsonb_array_length(p_campos) > 100 then return false; end if;

  for v_campo in select * from jsonb_array_elements(p_campos) loop
    if jsonb_typeof(v_campo) <> 'object' then return false; end if;

    v_chave := v_campo ->> 'chave';
    v_tipo := v_campo ->> 'tipo';

    if v_chave is null or length(btrim(v_chave)) = 0 or length(v_chave) > 60 then return false; end if;
    if v_chave = any(v_chaves) then return false; end if;
    v_chaves := v_chaves || v_chave;

    if v_campo ->> 'rotulo' is null
       or length(btrim(v_campo ->> 'rotulo')) = 0
       or length(v_campo ->> 'rotulo') > 300 then
      return false;
    end if;

    if v_tipo is null or v_tipo not in ('texto', 'texto_longo', 'sim_nao', 'escolha_unica',
                                        'escolha_multipla', 'data', 'numero') then
      return false;
    end if;

    if coalesce(jsonb_typeof(v_campo -> 'obrigatorio'), 'null') not in ('boolean', 'null') then
      return false;
    end if;

    if coalesce(jsonb_typeof(v_campo -> 'ajuda'), 'null') not in ('string', 'null')
       or length(coalesce(v_campo ->> 'ajuda', '')) > 300 then
      return false;
    end if;

    if v_tipo in ('escolha_unica', 'escolha_multipla') then
      if coalesce(jsonb_typeof(v_campo -> 'opcoes'), '') <> 'array'
         or jsonb_array_length(v_campo -> 'opcoes') < 1
         or jsonb_array_length(v_campo -> 'opcoes') > 50 then
        return false;
      end if;
      for v_opcao in select * from jsonb_array_elements(v_campo -> 'opcoes') loop
        if jsonb_typeof(v_opcao) <> 'string'
           or length(btrim(v_opcao #>> '{}')) = 0
           or length(v_opcao #>> '{}') > 200 then
          return false;
        end if;
      end loop;
    end if;
  end loop;

  return true;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Canal de envio: só o formato que a aplicação grava
-- ---------------------------------------------------------------------

alter table public.documento_links
  add constraint documento_links_canal_formato
  check (canal_envio = '' or canal_envio ~ '^WhatsApp[ 0-9()+.-]{0,30}$') not valid;

do $$
begin
  if not exists (
    select 1 from public.documento_links
     where not (canal_envio = '' or canal_envio ~ '^WhatsApp[ 0-9()+.-]{0,30}$')
  ) then
    alter table public.documento_links validate constraint documento_links_canal_formato;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 7. Prontuário: cabeçalho sem troca de paciente; versão conferida
-- ---------------------------------------------------------------------

revoke update on public.prontuarios from authenticated;
grant update (atendimento_id, data_registro, titulo) on public.prontuarios to authenticated;

create or replace function private.prontuario_versao_conferida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proxima integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(max(versao), 0) + 1 into v_proxima
    from public.prontuario_versoes
   where prontuario_id = new.prontuario_id;

  if new.versao <> v_proxima then
    raise exception 'Versão fora de sequência. Recarregue o prontuário e tente de novo.';
  end if;

  new.criado_por := auth.uid();
  new.criado_em := now();
  new.exemplo := false;
  return new;
end;
$$;

revoke all on function private.prontuario_versao_conferida() from public, anon, authenticated;

create trigger prontuario_versoes_conferida
  before insert on public.prontuario_versoes
  for each row execute function private.prontuario_versao_conferida();

-- O mesmo limite da tela (`lib/prontuario.ts`): 6.000 caracteres por campo
-- clínico, 240 no motivo. NOT VALID não reavalia o passado; a validação
-- abaixo só roda se nada antigo passar do limite.
alter table public.prontuario_versoes
  add constraint prontuario_versoes_limites check (
    length(queixa) <= 6000 and length(avaliacao) <= 6000 and length(conduta) <= 6000
    and length(evolucao) <= 6000 and length(orientacoes) <= 6000
    and length(observacoes) <= 6000 and length(motivo) <= 240
  ) not valid;

do $$
begin
  if not exists (
    select 1 from public.prontuario_versoes
     where length(queixa) > 6000 or length(avaliacao) > 6000 or length(conduta) > 6000
        or length(evolucao) > 6000 or length(orientacoes) > 6000
        or length(observacoes) > 6000 or length(motivo) > 240
  ) then
    alter table public.prontuario_versoes validate constraint prontuario_versoes_limites;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 8. Fotos: caminho exato, eliminação só com motivo, Storage sem UPDATE
-- ---------------------------------------------------------------------

alter table public.prontuario_imagens
  add constraint prontuario_imagens_caminho_forma check (
    caminho ~ ('^' || prontuario_id::text
               || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
  ) not valid;

do $$
begin
  if not exists (
    select 1 from public.prontuario_imagens
     where caminho !~ ('^' || prontuario_id::text
                       || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
  ) then
    alter table public.prontuario_imagens validate constraint prontuario_imagens_caminho_forma;
  end if;
end $$;

create or replace function private.imagem_so_sai_com_motivo()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return old;
  end if;

  if not exists (
    select 1 from public.prontuario_imagem_eliminacoes where imagem_id = old.id
  ) then
    raise exception 'Foto só se elimina com o motivo registrado.';
  end if;

  return old;
end;
$$;

revoke all on function private.imagem_so_sai_com_motivo() from public, anon, authenticated;

create trigger prontuario_imagens_so_com_motivo
  before delete on public.prontuario_imagens
  for each row execute function private.imagem_so_sai_com_motivo();

drop policy if exists prontuario_imagens_storage_edicao on storage.objects;

drop policy if exists prontuario_imagens_storage_envio on storage.objects;
create policy prontuario_imagens_storage_envio on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'prontuario-imagens'
    and private.e_administradora()
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  );

-- ---------------------------------------------------------------------
-- 9. Grants das funções recriadas (create or replace preserva; repetidos
--    para o arquivo se explicar sozinho)
-- ---------------------------------------------------------------------

revoke all on function public.documento_emitir(uuid, uuid, text, uuid) from public, anon;
grant execute on function public.documento_emitir(uuid, uuid, text, uuid) to authenticated;

revoke all on function public.documento_assinar(uuid, text, text, text, text, text) from public, anon;
grant execute on function public.documento_assinar(uuid, text, text, text, text, text) to authenticated;

revoke all on function public.documento_link_criar(uuid, text, integer, text) from public, anon;
grant execute on function public.documento_link_criar(uuid, text, integer, text) to authenticated;

revoke all on function public.documento_campos_responder(uuid, jsonb) from public, anon;
grant execute on function public.documento_campos_responder(uuid, jsonb) to authenticated;

-- As três públicas continuam públicas — a allow-list da 0014/0017.
revoke all on function public.documento_para_assinatura(text, date) from public;
revoke all on function public.documento_assinar_por_link(text, date, text, text, text, text) from public;
revoke all on function public.documento_responder_por_link(text, date, jsonb) from public;
grant execute on function public.documento_para_assinatura(text, date) to anon, authenticated;
grant execute on function public.documento_assinar_por_link(text, date, text, text, text, text) to anon, authenticated;
grant execute on function public.documento_responder_por_link(text, date, jsonb) to anon, authenticated;
