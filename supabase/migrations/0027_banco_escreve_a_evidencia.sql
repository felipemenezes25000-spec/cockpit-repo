-- =====================================================================
-- Migração 0027: o banco escreve o que antes quem chamava dizia — autor e
-- número da versão de modelo, autor da resposta, autor e data da foto,
-- canal da via — e o recebimento avulso não tem taxa maior que o valor
--
-- Achados da auditoria de 23/09/2026 que só o banco fecha. Mesmo desenho da
-- 0022: a função continua sendo a porta, e o banco confere o que entra por
-- qualquer porta — inclusive a API direta, com a chave pública e a sessão
-- de quem já tem acesso.
--
-- 1. VERSÃO DE MODELO CONFERIDA (`modelo_documento_versoes`).
--    A política de INSERT só exigia a administradora. Pela API ela gravava
--    versão com autor de outra pessoa, data retroativa, número fora de
--    sequência (uma "versão 999" vira a vigente, porque `documento_emitir`
--    lê a de maior número) e perguntas que não passaram por
--    `private.campos_validos` — que depois quebram toda emissão do modelo.
--    O AGENTS.md §4 deixa esta tabela fora da auditoria porque "cada versão
--    já guarda autor e data"; agora isso é verdade por qualquer porta.
--    `private.modelo_versao_conferida`, no molde de
--    `prontuario_versao_conferida` (0022): com sessão, exige a próxima da
--    sequência e perguntas válidas (anamnese com pelo menos uma), e o banco
--    escreve autor, hora e `exemplo = false`.
--    E o UPDATE em `modelos_documento` vira grant de coluna (nome,
--    descricao, ativo): trocar o `tipo` transformava contrato em anamnese
--    sem pergunta nenhuma, ou anamnese em contrato — pergunta clínica
--    visível à recepção.
--
-- 2. QUEM RESPONDEU, ESCRITO PELO BANCO (`documento_campos`).
--    `documento_responder_por_link` não zerava `respondido_por`: a resposta
--    que a paciente corrigia pelo link ficava atribuída a quem tinha
--    respondido antes na consulta. E o grant de coluna da 0022 deixava a
--    sessão escrever `respondido_por` e `respondido_em` à mão.
--    `private.campo_resposta_autor`: quando a resposta muda,
--    `respondido_em = now()` e `respondido_por` = quem está na sessão, mas só
--    quando o UPDATE roda como `authenticated` (a consulta, a API). Pelo link
--    a função é DEFINER e roda como dona: nulo — a paciente não tem perfil,
--    como promete o AGENTS.md §8.7 —, mesmo que a chamada tenha chegado com a
--    sessão de alguém da equipe logado no mesmo navegador (o `auth.uid()`
--    lê o JWT e devolveria essa pessoa). É o critério de
--    `assinatura_confere_documento` (0022). Nulo também na manutenção por SQL.
--    Sem mudar a resposta, as duas colunas ficam como estavam.
--
-- 3. FOTO COM AUTOR E DATA DO BANCO (`prontuario_imagens`).
--    O INSERT aceitava `criado_por`, `criado_em`, `exemplo` e
--    `data_captura` quaisquer. `private.imagem_registrada_conferida`: com
--    sessão, o banco escreve autor, hora e `exemplo = false`, e recusa data
--    de captura depois de hoje no relógio da clínica — no INSERT e no UPDATE
--    da data. Era regra só da aplicação (`motivoDataInvalida`).
--
-- 4. A VIA DIZ POR ONDE FOI ASSINADA.
--    `documento_para_assinatura` passa a devolver `assinado_canal`. A via
--    impressa dizia "à distância" mesmo quando a paciente assinou no balcão
--    e abriu o link depois só para guardar a cópia. Mudar as colunas de
--    retorno exige drop + create; o corpo é o da 0022, com uma linha a
--    mais, e o EXECUTE é refeito como na 0022 (anon e authenticated).
--
-- 5. RECEBIMENTO SEM TAXA MAIOR QUE O VALOR.
--    O recebimento avulso (sem venda, que o financeiro insere desde a 0023)
--    aceitava `taxa_valor > valor`, e `valor_liquido` — coluna gerada —
--    saía negativo, puxando o "a receber" para baixo. CHECK nova, NOT VALID
--    e validada só se nada antigo a violar (mesmo padrão da 0022).
--
-- FICA DE FORA, de propósito: IP e dispositivo da assinatura. As funções
-- do balcão e do link recebem os dois por parâmetro, e pelo link quem chama
-- é `anon`, com a chave pública. O banco não distingue a server action de
-- uma chamada direta, e o IP que o PostgREST enxerga, na chamada da
-- aplicação, é o do servidor da Vercel. Fechar exige um segredo só do
-- servidor conferido pelo banco — decisão do dono do projeto (AGENTS.md
-- §13, Dívidas conhecidas).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Versão de modelo
-- ---------------------------------------------------------------------

create or replace function private.modelo_versao_conferida()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proxima integer;
  v_tipo public.tipo_documento;
begin
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(max(versao), 0) + 1 into v_proxima
    from public.modelo_documento_versoes
   where modelo_id = new.modelo_id;

  if new.versao is distinct from v_proxima then
    raise exception 'Versão fora de sequência. Recarregue o modelo e tente de novo.';
  end if;

  if not private.campos_validos(new.campos) then
    raise exception 'Perguntas do formulário inválidas';
  end if;

  select tipo into v_tipo from public.modelos_documento where id = new.modelo_id;
  if v_tipo = 'anamnese' and jsonb_array_length(new.campos) = 0 then
    raise exception 'Anamnese precisa de pelo menos uma pergunta';
  end if;

  new.criado_por := auth.uid();
  new.criado_em := now();
  new.exemplo := false;
  return new;
end;
$$;

revoke all on function private.modelo_versao_conferida() from public, anon, authenticated;

comment on function private.modelo_versao_conferida is
  'Com sessão: versão de modelo na sequência, perguntas válidas, autor e hora escritos pelo banco (0027). Sem sessão passa.';

create trigger modelo_documento_versoes_conferida
  before insert on public.modelo_documento_versoes
  for each row execute function private.modelo_versao_conferida();

-- `tipo` fica de fora: define quem lê os documentos do modelo (anamnese é só
-- da administradora) e se a emissão exige perguntas.
revoke update on public.modelos_documento from authenticated;
grant update (nome, descricao, ativo) on public.modelos_documento to authenticated;

-- ---------------------------------------------------------------------
-- 2. Autor da resposta
-- ---------------------------------------------------------------------

create or replace function private.campo_resposta_autor()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.resposta is not distinct from old.resposta
     and new.respostas is not distinct from old.respostas then
    new.respondido_em := old.respondido_em;
    new.respondido_por := old.respondido_por;
    return new;
  end if;

  -- Pelo link, quem respondeu foi a paciente, que não tem perfil: nulo. O
  -- critério é `current_user`, não `auth.uid()`: dentro da função do link
  -- (DEFINER) o usuário é a dona da função, mesmo que a chamada tenha
  -- chegado com a sessão de alguém da equipe logado no mesmo navegador —
  -- e `auth.uid()`, que lê o JWT, devolveria essa pessoa. Mesmo critério de
  -- `assinatura_confere_documento` (0022), por isso esta função é INVOKER.
  new.respondido_em := now();
  new.respondido_por := case when current_user = 'authenticated' then auth.uid() end;
  return new;
end;
$$;

revoke all on function private.campo_resposta_autor() from public, anon, authenticated;

comment on function private.campo_resposta_autor is
  'Quando a resposta muda, respondido_em = now() e respondido_por = auth.uid() só como authenticated (nulo pelo link, mesmo com sessão no navegador). Sem mudança, as duas ficam (0027).';

create trigger documento_campos_resposta_autor
  before update on public.documento_campos
  for each row execute function private.campo_resposta_autor();

-- ---------------------------------------------------------------------
-- 3. Foto de evolução
-- ---------------------------------------------------------------------

create or replace function private.imagem_registrada_conferida()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  -- "Hoje" é o dia da clínica, não o do servidor (AGENTS.md §7.2).
  if new.data_captura > (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A data da foto não pode estar no futuro.';
  end if;

  if tg_op = 'INSERT' then
    new.criado_por := auth.uid();
    new.criado_em := now();
    new.exemplo := false;
  end if;

  return new;
end;
$$;

revoke all on function private.imagem_registrada_conferida() from public, anon, authenticated;

comment on function private.imagem_registrada_conferida is
  'Com sessão: data de captura não futura (INSERT e UPDATE da data); no INSERT, autor, hora e exemplo = false escritos pelo banco (0027). Sem sessão passa.';

create trigger prontuario_imagens_conferida
  before insert or update of data_captura on public.prontuario_imagens
  for each row execute function private.imagem_registrada_conferida();

-- ---------------------------------------------------------------------
-- 4. A via com o canal da assinatura
-- ---------------------------------------------------------------------

drop function public.documento_para_assinatura(text, date);

create function public.documento_para_assinatura(p_token text, p_nascimento date)
returns table(
  situacao text, titulo text, corpo text, paciente text, tipo text,
  emitido_em timestamptz, hash text, assinado_em timestamptz,
  assinado_por text, campos jsonb, assinado_canal text
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
      -- `balcao` ou `link`: a via impressa diz por onde a assinatura entrou.
      assinado_canal := v_assinatura.canal;
    end if;
  end if;

  return next;
end;
$$;

revoke all on function public.documento_para_assinatura(text, date) from public;
grant execute on function public.documento_para_assinatura(text, date) to anon, authenticated;

comment on function public.documento_para_assinatura(text, date) is
  'Porta pública: revela o documento mediante data de nascimento, antes e depois de assinado, com o canal da assinatura (0027). Executável por anon.';

-- ---------------------------------------------------------------------
-- 5. Recebimento avulso sem taxa maior que o valor
-- ---------------------------------------------------------------------

alter table public.recebimentos
  add constraint recebimentos_taxa_ate_o_valor check (taxa_valor <= valor) not valid;

do $$
begin
  if not exists (select 1 from public.recebimentos where taxa_valor > valor) then
    alter table public.recebimentos validate constraint recebimentos_taxa_ate_o_valor;
  end if;
end $$;
