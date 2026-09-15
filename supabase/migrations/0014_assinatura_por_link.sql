-- =====================================================================
-- Migração 0014: assinatura por link
--
-- ATENÇÃO: esta migração abre a PRIMEIRA SUPERFÍCIE ANÔNIMA do sistema.
--
-- Até aqui a postura era a da 0009 — `anon` não alcança nem a tabela,
-- recebe 401 e não 200 vazio. Isso continua verdadeiro para TODAS as
-- tabelas, inclusive as daqui. O que muda é que `anon` passa a poder
-- executar TRÊS funções, e só elas:
--
--   documento_link_estado       (o link serve? sem revelar nada)
--   documento_para_assinatura   (revela o texto, mediante nascimento)
--   documento_assinar_por_link  (assina)
--
-- Decidido em 13/09/2026 pelo dono do projeto, invertendo a decisão de
-- assinatura só no balcão. O fluxo de balcão continua existindo.
--
-- Cinco decisões contêm o risco:
--
-- 1. NENHUM GRANT DE TABELA PARA `anon`. A porta é a função, que devolve
--    campo escolhido a dedo. `anon` não faz `select` em `documentos`, em
--    `pacientes` nem em coisa nenhuma.
--
-- 2. O TOKEN NÃO É GUARDADO. A tabela guarda o SHA-256 dele. Quem obtiver
--    um dump do banco fica com hashes, que não abrem link nenhum. O token
--    em claro existe uma vez só: no retorno da criação, para virar link.
--
-- 3. DOIS FATORES FRACOS. O token (256 bits, inadivinhável) prova posse
--    do link; a data de nascimento prova que quem abriu é a paciente, e
--    não quem recebeu o encaminhamento no grupo da família. Link de
--    WhatsApp é encaminhado, fotografado e vai para backup em nuvem.
--
-- 4. A DATA DE NASCIMENTO TEM ~36 MIL COMBINAÇÕES. Sozinha, seria fraca:
--    com o token em mãos, dá para varrer. Por isso o link conta erros e
--    se fecha no décimo. E por isso a função de leitura NÃO levanta
--    exceção no erro — exceção desfaria a transação e apagaria a
--    contagem que deveria proteger.
--
-- 5. SEM DATA DE NASCIMENTO, NÃO NASCE LINK. `data_nascimento` é opcional
--    no cadastro. Emitir link para quem não tem a data significaria um
--    link protegido só pelo token — a criação recusa e manda cadastrar.
-- =====================================================================

create table public.documento_links (
  id uuid primary key default gen_random_uuid(),
  documento_id uuid not null references public.documentos (id) on delete restrict,

  -- SHA-256 hexadecimal do token. O token em claro nunca chega aqui.
  token_hash text not null unique,

  criado_em timestamptz not null default now(),
  criado_por uuid references public.perfis (id) on delete set null,
  expira_em timestamptz not null,
  revogado_em timestamptz,

  -- Como o link foi entregue. Vira evidência na assinatura: "o link foi
  -- para este número" é parte da cadeia que liga a pessoa ao ato.
  canal_envio text not null default '',

  -- Rastro de uso. `aberturas` conta as revelações bem-sucedidas.
  aberto_em timestamptz,
  aberturas integer not null default 0,

  -- Tentativas de data de nascimento erradas. Ver a decisão 4.
  tentativas integer not null default 0,

  exemplo boolean not null default false,

  constraint documento_links_hash check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint documento_links_validade check (expira_em > criado_em),
  constraint documento_links_canal check (length(canal_envio) <= 160)
);

comment on table public.documento_links is
  'Links de assinatura à distância. Guarda o hash do token, nunca o token.';

comment on column public.documento_links.tentativas is
  'Erros de data de nascimento. No décimo o link se fecha, para o token sozinho não permitir varredura.';

create index documento_links_documento
  on public.documento_links (documento_id, criado_em desc);

create trigger documento_links_auditoria
  after insert or update or delete on public.documento_links
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- Por onde a assinatura entrou
--
-- Balcão e link não têm a mesma força de prova, e o documento precisa
-- dizer qual dos dois foi. No balcão alguém conferiu documento com foto;
-- no link, o que houve foi posse do endereço e acerto da data.
-- ---------------------------------------------------------------------

alter table public.documento_assinaturas
  add column canal text not null default 'balcao',
  add column link_id uuid references public.documento_links (id) on delete set null;

alter table public.documento_assinaturas
  add constraint documento_assinaturas_canal check (canal in ('balcao', 'link'));

comment on column public.documento_assinaturas.canal is
  'balcao: conferência presencial de identidade. link: posse do endereço mais data de nascimento.';

-- ---------------------------------------------------------------------
-- Acesso à tabela de links: equipe, como o documento
--
-- `anon` NÃO entra aqui. Ele fala só com as três funções do fim deste
-- arquivo.
-- ---------------------------------------------------------------------

alter table public.documento_links enable row level security;

create policy documento_links_leitura on public.documento_links
  for select to authenticated
  using (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  );

grant select on public.documento_links to authenticated;
revoke all on public.documento_links from anon;

-- Escrita só pelas funções abaixo: criar link exige gerar hash e revogar
-- os anteriores na mesma transação, e isso não é trabalho de INSERT solto.

-- ---------------------------------------------------------------------
-- Equipe: criar e revogar
-- ---------------------------------------------------------------------

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
  -- SECURITY DEFINER: a checagem de quem é precisa ser explícita, porque
  -- a RLS não está olhando por nós aqui dentro.
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  if p_token is null or length(p_token) < 32 then
    raise exception 'Token inválido';
  end if;

  if v_dias < 1 or v_dias > 90 then
    raise exception 'Validade deve ficar entre 1 e 90 dias';
  end if;

  select * into v_documento from public.documentos where id = p_documento_id;
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

  -- Ver a decisão 5 no cabeçalho.
  if v_nascimento is null then
    raise exception 'Cadastre a data de nascimento da paciente antes de enviar o link';
  end if;

  -- No máximo um link vivo por documento. Sem isto, um link antigo
  -- esquecido em alguma conversa continuaria valendo depois de a clínica
  -- ter mandado outro.
  update public.documento_links
     set revogado_em = now()
   where documento_id = p_documento_id
     and revogado_em is null
     and expira_em > now();

  insert into public.documento_links (
    documento_id,
    token_hash,
    criado_por,
    expira_em,
    canal_envio
  )
  values (
    p_documento_id,
    encode(sha256(convert_to(p_token, 'UTF8')), 'hex'),
    auth.uid(),
    now() + make_interval(days => v_dias),
    btrim(coalesce(p_canal, ''))
  )
  returning id into v_link_id;

  return v_link_id;
end;
$$;

create or replace function public.documento_link_revogar(p_link_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  update public.documento_links
     set revogado_em = coalesce(revogado_em, now())
   where id = p_link_id
     and exists (
       select 1 from public.documentos d
       where d.id = documento_id
         and (d.tipo <> 'anamnese' or private.e_administradora())
     );
end;
$$;

-- ---------------------------------------------------------------------
-- A porta pública
--
-- Três funções, todas SECURITY DEFINER porque `anon` não tem — e não vai
-- ter — permissão em tabela nenhuma. Cada uma devolve o mínimo.
--
-- Nenhuma delas levanta exceção por link inválido ou data errada: elas
-- devolvem uma situação. Exceção desfaz a transação, e com ela a
-- contagem de tentativas que protege contra varredura.
-- ---------------------------------------------------------------------

-- Situação do link, sem revelar conteúdo. Serve para a página saber se
-- pede a data de nascimento ou se explica que o link morreu.
create or replace function public.documento_link_estado(p_token text)
returns table (situacao text, tipo text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_documento public.documentos;
begin
  situacao := 'nao_encontrado';
  tipo := null;

  if p_token is null or length(p_token) < 32 then
    return next;
    return;
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if not found then
    return next;
    return;
  end if;

  if v_link.revogado_em is not null then
    situacao := 'revogado';
    return next;
    return;
  end if;

  if v_link.expira_em <= now() then
    situacao := 'expirado';
    return next;
    return;
  end if;

  if v_link.tentativas >= 10 then
    situacao := 'bloqueado';
    return next;
    return;
  end if;

  select * into v_documento from public.documentos where id = v_link.documento_id;

  -- O tipo é a única coisa que sai antes da data de nascimento: a página
  -- precisa dizer "contrato" ou "termo" para a pessoa saber o que é.
  tipo := v_documento.tipo::text;

  if v_documento.situacao = 'assinado' then
    situacao := 'ja_assinado';
  elsif v_documento.situacao <> 'emitido' then
    situacao := 'indisponivel';
  else
    situacao := 'ok';
  end if;

  return next;
end;
$$;

-- Revela o documento, mediante data de nascimento.
create or replace function public.documento_para_assinatura(
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
  hash text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_documento public.documentos;
  v_paciente public.pacientes;
begin
  situacao := 'nao_encontrado';

  if p_token is null or length(p_token) < 32 or p_nascimento is null then
    return next;
    return;
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if not found then
    return next;
    return;
  end if;

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
    -- Erra, conta. Sem `raise`: a exceção levaria a contagem junto.
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    situacao := 'data_incorreta';
    return next;
    return;
  end if;

  if v_documento.situacao = 'assinado' then
    situacao := 'ja_assinado';
  elsif v_documento.situacao <> 'emitido' then
    situacao := 'indisponivel';
  else
    situacao := 'ok';
  end if;

  -- Acertou a data: o erro anterior não conta mais, e a abertura fica
  -- registrada como evidência de que o documento foi visto.
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

  -- O texto só sai quando ainda há o que assinar. Documento já assinado
  -- ou cancelado não precisa ser reexibido a quem tem o link.
  if situacao = 'ok' then
    corpo := v_documento.corpo_congelado;
  end if;

  return next;
end;
$$;

-- Assina. Confere tudo de novo: a página é conveniência, não guarda.
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

  if v_documento.situacao = 'assinado' then return 'ja_assinado'; end if;
  if v_documento.situacao <> 'emitido' then return 'indisponivel'; end if;

  if length(v_nome) < 3 then return 'nome_invalido'; end if;
  if v_cpf is not null and length(v_cpf) <> 11 then return 'cpf_invalido'; end if;

  -- A evidência conta a verdade sobre como a identidade foi conferida.
  -- No balcão alguém olhou um documento com foto; aqui, não.
  v_verificacao := 'Assinatura à distância: posse do link'
    || case when v_link.canal_envio <> '' then ' enviado por ' || v_link.canal_envio else '' end
    || ' e data de nascimento conferida.';

  insert into public.documento_assinaturas (
    documento_id,
    nome_informado,
    cpf_informado,
    hash_assinado,
    ip,
    dispositivo,
    verificacao_identidade,
    operador_id,
    canal,
    link_id
  )
  values (
    v_documento.id,
    v_nome,
    v_cpf,
    v_documento.corpo_hash,
    nullif(btrim(coalesce(p_ip, '')), '')::inet,
    nullif(btrim(coalesce(p_dispositivo, '')), ''),
    left(v_verificacao, 240),
    -- Não há operador: quem assinou foi a paciente, de onde estava.
    null,
    'link',
    v_link.id
  );

  update public.documentos set situacao = 'assinado' where id = v_documento.id;

  -- Link cumprido não serve mais para nada. Fecha.
  update public.documento_links set revogado_em = now() where id = v_link.id;

  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------
-- Permissões
--
-- A linha que segue é a exceção à 0009, e está sozinha de propósito:
-- estas três funções são TUDO o que `anon` alcança no sistema.
-- ---------------------------------------------------------------------

revoke all on function public.documento_link_criar(uuid, text, integer, text) from public, anon;
revoke all on function public.documento_link_revogar(uuid) from public, anon;
revoke all on function public.documento_link_estado(text) from public, anon;
revoke all on function public.documento_para_assinatura(text, date) from public, anon;
revoke all on function public.documento_assinar_por_link(text, date, text, text, text, text) from public, anon;

grant execute on function public.documento_link_criar(uuid, text, integer, text) to authenticated;
grant execute on function public.documento_link_revogar(uuid) to authenticated;

grant execute on function public.documento_link_estado(text) to anon, authenticated;
grant execute on function public.documento_para_assinatura(text, date) to anon, authenticated;
grant execute on function public.documento_assinar_por_link(text, date, text, text, text, text) to anon, authenticated;

comment on function public.documento_link_estado(text) is
  'Porta pública: diz se o link serve, sem revelar conteúdo. Executável por anon.';
comment on function public.documento_para_assinatura(text, date) is
  'Porta pública: revela o documento mediante data de nascimento. Executável por anon.';
comment on function public.documento_assinar_por_link(text, date, text, text, text, text) is
  'Porta pública: registra a assinatura à distância. Executável por anon.';
