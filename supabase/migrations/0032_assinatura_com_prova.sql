-- =====================================================================
-- 0032 — Assinatura com prova: servidor atestado, código por e-mail,
-- rubrica, leitura, manifesto, código de verificação e carimbo de tempo
--
-- A assinatura eletrônica simples (Lei 14.063/2020) vale pelo conjunto de
-- circunstâncias que a cercam. Esta migração fortalece cada uma delas, sem
-- depender de extensão instalada (só `sha256`, `convert_to` e
-- `gen_random_uuid`, embutidos no Postgres):
--
-- 1. O SERVIDOR ATESTA O QUE INFORMA. Até a 0031, as funções públicas
--    recebiam IP e aparelho por parâmetro e eram executáveis por `anon` com a
--    chave pública: quem tivesse token e data chamava direto e gravava o IP
--    que quisesse (AGENTS.md §13, dívida conhecida). Agora toda função da
--    porta pública — e a do balcão — exige o segredo do servidor, que só a
--    aplicação tem. O banco guarda apenas o SHA-256 dele
--    (`private.segredo_do_servidor`); quem chama a API direto, sem o
--    segredo, recebe `nao_autorizado` e não grava nada.
--
-- 2. SEGUNDO FATOR: CÓDIGO POR E-MAIL. O link pode exigir, além da data de
--    nascimento, um código de 6 dígitos enviado ao e-mail da ficha
--    (`documento_links.verificacao = 'nascimento_email'`). O código nasce no
--    banco (aleatório de `gen_random_uuid`), vale 15 minutos para ser
--    digitado e, conferido, sustenta a sessão de leitura e assinatura por 60
--    minutos. Código errado conta tentativa, como data errada: dez erros
--    seguidos fecham o link. Reenvio só depois de 45 s, e no máximo 10 por
--    link.
--
-- 3. RUBRICA E LEITURA. A assinatura guarda a rubrica desenhada (só o
--    traçado, em coordenadas inteiras, validado por expressão regular — não
--    é SVG livre) ou o registro de que a pessoa preferiu não desenhar
--    (acessibilidade), e quanto tempo o texto ficou aberto e se foi rolado
--    até o fim (informados pelo navegador, e o manifesto diz isso).
--
-- 4. CPF CONFERIDO. Pelo link, CPF informado que não bate com o da ficha é
--    recusado (`cpf_nao_confere`); quando bate, vira fator.
--
-- 5. MANIFESTO E CÓDIGO DE VERIFICAÇÃO. Toda assinatura nova ganha, no
--    banco, um código público (XXXX-XXXX-XXXX, 60 bits) e um manifesto:
--    texto canônico com tudo o que foi registrado, e o SHA-256 dele. Quem
--    tem a via confere em /verificar/<código>. As assinaturas antigas ganham
--    código e manifesto nesta migração, com o que elas têm.
--
-- 6. CARIMBO DE TEMPO. O servidor pede a uma autoridade de carimbo de tempo
--    (RFC 3161) o carimbo do SHA-256 do manifesto e o grava uma única vez
--    (`documento_assinatura_carimbar`). A data e a hora deixam de depender
--    só do relógio da clínica.
--
-- A ASSINATURA NÃO SE ALTERA. Até aqui ninguém tinha UPDATE na tabela; o
-- carimbo passa a exigir uma escrita, e o gatilho
-- `documento_assinaturas_imutavel` garante que ela só preenche o carimbo —
-- uma vez — e nada mais.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Segredo do servidor
-- ---------------------------------------------------------------------

create table private.segredo_do_servidor (
  id smallint primary key default 1,
  hash text not null,
  definido_em timestamptz not null default now(),
  constraint segredo_do_servidor_unico check (id = 1),
  constraint segredo_do_servidor_hash check (hash ~ '^[0-9a-f]{64}$')
);

revoke all on private.segredo_do_servidor from public, anon, authenticated;

comment on table private.segredo_do_servidor is
  'SHA-256 do segredo que só a aplicação conhece (ASSINATURA_SEGREDO_SERVIDOR). Definido por ambiente, fora das migrações (0032).';

create or replace function private.servidor_confere(p_segredo text)
returns boolean
language sql
stable
security definer
set search_path = private, pg_temp
as $$
  select length(coalesce(p_segredo, '')) >= 32
     and exists (
       select 1
         from private.segredo_do_servidor
        where hash = encode(sha256(convert_to(p_segredo, 'UTF8')), 'hex')
     );
$$;

revoke all on function private.servidor_confere(text) from public, anon;
-- A função do balcão é INVOKER (a RLS de quem clica vale): precisa poder
-- chamar a conferência. Fora do SQL ela não é alcançável — o PostgREST só
-- expõe o schema public.
grant execute on function private.servidor_confere(text) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Link: modo de verificação e código por e-mail
-- ---------------------------------------------------------------------

alter table public.documento_links
  add column verificacao text not null default 'nascimento',
  add column email_destino text,
  add column codigo_hash text,
  add column codigo_expira_em timestamptz,
  add column codigo_enviado_em timestamptz,
  add column codigo_envios integer not null default 0,
  add column codigo_conferido_em timestamptz;

alter table public.documento_links
  add constraint documento_links_verificacao
    check (verificacao in ('nascimento', 'nascimento_email')),
  add constraint documento_links_email_destino
    check (
      (verificacao = 'nascimento' and email_destino is null)
      or (verificacao = 'nascimento_email'
          and email_destino ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
          and length(email_destino) <= 254)
    ),
  add constraint documento_links_codigo_hash
    check (codigo_hash is null or codigo_hash ~ '^[0-9a-f]{64}$'),
  add constraint documento_links_codigo_envios
    check (codigo_envios between 0 and 10);

comment on column public.documento_links.verificacao is
  'nascimento: posse do link + data de nascimento. nascimento_email: mais um código de 6 dígitos enviado ao e-mail da ficha (0032).';
comment on column public.documento_links.codigo_hash is
  'SHA-256 de "<id do link>:<código>". O código em claro sai uma vez, para o e-mail (0032).';

-- ---------------------------------------------------------------------
-- 3. Assinatura: rubrica, leitura, fatores, manifesto, verificação, carimbo
-- ---------------------------------------------------------------------

alter table public.documento_assinaturas
  add column rubrica text,
  add column rubrica_dispensada boolean not null default false,
  add column leitura_segundos integer,
  add column leitura_completa boolean,
  add column localizacao text,
  add column fatores text[] not null default '{}',
  add column codigo_verificacao text,
  add column manifesto text,
  add column manifesto_hash text,
  add column carimbo_token text,
  add column carimbo_em timestamptz,
  add column carimbo_autoridade text;

-- Traçado da rubrica: "M x y L x y ..." em coordenadas inteiras de 0 a 9999,
-- vários traços separados por espaço. Só esses caracteres — é desenhado
-- dentro de um <path> da própria aplicação, nunca como SVG vindo de fora.
create or replace function private.rubrica_valida(p_rubrica text)
returns boolean
language sql
immutable
set search_path = pg_temp
as $$
  select p_rubrica is null
      or (length(p_rubrica) between 12 and 40000
          and p_rubrica ~ '^M[0-9]{1,4} [0-9]{1,4}( ?[ML][0-9]{1,4} [0-9]{1,4})*$');
$$;

revoke all on function private.rubrica_valida(text) from public, anon;
grant execute on function private.rubrica_valida(text) to authenticated;

alter table public.documento_assinaturas
  add constraint documento_assinaturas_rubrica
    check (private.rubrica_valida(rubrica)),
  add constraint documento_assinaturas_leitura
    check (leitura_segundos is null or leitura_segundos between 0 and 86400),
  add constraint documento_assinaturas_localizacao
    check (localizacao is null or length(localizacao) <= 160),
  add constraint documento_assinaturas_codigo_verificacao
    check (codigo_verificacao is null or codigo_verificacao ~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  add constraint documento_assinaturas_manifesto_hash
    check (manifesto_hash is null or manifesto_hash ~ '^[0-9a-f]{64}$'),
  add constraint documento_assinaturas_carimbo
    check (
      (carimbo_token is null and carimbo_em is null and carimbo_autoridade is null)
      or (carimbo_token is not null and carimbo_em is not null and carimbo_autoridade is not null
          and length(carimbo_token) <= 24000 and length(carimbo_autoridade) <= 120)
    );

create unique index documento_assinaturas_codigo_verificacao_unico
  on public.documento_assinaturas (codigo_verificacao)
  where codigo_verificacao is not null;

comment on column public.documento_assinaturas.fatores is
  'Como a identidade foi sustentada: posse_do_link, data_de_nascimento, codigo_por_email, cpf_conferido, documento_com_foto (balcão) (0032).';
comment on column public.documento_assinaturas.manifesto is
  'Texto canônico com tudo o que foi registrado na assinatura. manifesto_hash é o SHA-256 dele, e é o que o carimbo de tempo atesta (0032).';

-- Código público de verificação: 12 símbolos de um alfabeto sem letras e
-- números que se confundem (I, O, 0, 1), 5 bits cada — 60 bits. Os bytes
-- vêm de `gen_random_uuid` (gerador forte do Postgres), pulando os que o
-- UUID v4 reserva para versão e variante.
create or replace function private.codigo_de_verificacao()
returns text
language plpgsql
volatile
set search_path = pg_temp
as $$
declare
  v_alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_bytes bytea := decode(replace(gen_random_uuid()::text, '-', ''), 'hex');
  v_posicoes constant integer[] := array[0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13, 14];
  v_codigo text := '';
  i integer;
begin
  for i in 1..12 loop
    v_codigo := v_codigo || substr(v_alfabeto, (get_byte(v_bytes, v_posicoes[i]) % 32) + 1, 1);
    if i in (4, 8) then
      v_codigo := v_codigo || '-';
    end if;
  end loop;
  return v_codigo;
end;
$$;

revoke all on function private.codigo_de_verificacao() from public, anon, authenticated;

-- O manifesto: tudo o que a assinatura registrou, numa forma fixa, uma
-- informação por linha. Quem tiver o texto recalcula o SHA-256 e compara com
-- o que está na via e no carimbo de tempo.
create or replace function private.manifesto_da_assinatura(
  a public.documento_assinaturas,
  d public.documentos
)
returns text
language sql
stable
set search_path = public, pg_temp
as $$
  select concat_ws(E'\n',
    'Manifesto de assinatura eletrônica — Cockpit (v1)',
    'codigo_de_verificacao: ' || coalesce(a.codigo_verificacao, '-'),
    'documento: ' || d.id::text,
    'tipo: ' || d.tipo::text,
    'emitido_em: ' || to_char(d.emitido_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'texto_sha256: ' || a.hash_assinado,
    'assinado_em: ' || to_char(a.assinado_em at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'assinante: ' || a.nome_informado,
    'cpf: ' || coalesce(a.cpf_informado, '-'),
    'canal: ' || coalesce(a.canal, '-'),
    'fatores: ' || coalesce(nullif(array_to_string(a.fatores, ', '), ''), '-'),
    'identidade: ' || a.verificacao_identidade,
    'ip: ' || coalesce(host(a.ip), '-'),
    'localizacao: ' || coalesce(a.localizacao, '-'),
    'dispositivo: ' || coalesce(a.dispositivo, '-'),
    'leitura: ' || case
      when a.leitura_segundos is null and a.leitura_completa is null then '-'
      else coalesce(a.leitura_segundos::text || ' s', '? s')
        || case when a.leitura_completa then ', até o fim' when a.leitura_completa = false then ', sem chegar ao fim' else '' end
        || ' (informado pelo navegador)'
    end,
    'rubrica_sha256: ' || case
      when a.rubrica is not null then encode(sha256(convert_to(a.rubrica, 'UTF8')), 'hex')
      when a.rubrica_dispensada then 'dispensada (assinatura pelo nome digitado)'
      else '-'
    end
  );
$$;

revoke all on function private.manifesto_da_assinatura(public.documento_assinaturas, public.documentos)
  from public, anon, authenticated;

-- Depois de `documento_assinaturas_confere` (ordem alfabética dos gatilhos
-- BEFORE): o hash, a hora e o canal já estão escritos pelo banco.
create or replace function private.assinatura_manifesto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_documento public.documentos;
begin
  select * into v_documento from public.documentos where id = new.documento_id;

  if not private.rubrica_valida(new.rubrica) then
    raise exception 'Rubrica inválida';
  end if;

  if new.rubrica is not null then
    new.rubrica_dispensada := false;
  end if;

  new.localizacao := left(nullif(btrim(coalesce(new.localizacao, '')), ''), 160);
  new.fatores := coalesce(new.fatores, '{}');
  new.codigo_verificacao := private.codigo_de_verificacao();
  new.carimbo_token := null;
  new.carimbo_em := null;
  new.carimbo_autoridade := null;
  new.manifesto := private.manifesto_da_assinatura(new, v_documento);
  new.manifesto_hash := encode(sha256(convert_to(new.manifesto, 'UTF8')), 'hex');
  return new;
end;
$$;

revoke all on function private.assinatura_manifesto() from public, anon, authenticated;

-- As assinaturas anteriores ganham código e manifesto com o que têm. Antes
-- do gatilho de imutabilidade, que é o que as protege daqui para frente.
do $$
declare
  v record;
  v_codigo text;
  v_manifesto text;
begin
  for v in
    select a.id, a.documento_id, a.canal, a.verificacao_identidade
      from public.documento_assinaturas a
     where a.codigo_verificacao is null
  loop
    loop
      v_codigo := private.codigo_de_verificacao();
      exit when not exists (
        select 1 from public.documento_assinaturas where codigo_verificacao = v_codigo
      );
    end loop;

    update public.documento_assinaturas
       set codigo_verificacao = v_codigo,
           fatores = case
             when v.canal = 'link' then array['posse_do_link', 'data_de_nascimento']
             else array['conferencia_presencial']
           end
     where id = v.id;

    select private.manifesto_da_assinatura(a, d) into v_manifesto
      from public.documento_assinaturas a
      join public.documentos d on d.id = a.documento_id
     where a.id = v.id;

    update public.documento_assinaturas
       set manifesto = v_manifesto,
           manifesto_hash = encode(sha256(convert_to(v_manifesto, 'UTF8')), 'hex')
     where id = v.id;
  end loop;
end;
$$;

create trigger documento_assinaturas_manifesto
  before insert on public.documento_assinaturas
  for each row execute function private.assinatura_manifesto();

create or replace function private.assinatura_imutavel()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if (to_jsonb(new) - array['carimbo_token', 'carimbo_em', 'carimbo_autoridade'])
     is distinct from
     (to_jsonb(old) - array['carimbo_token', 'carimbo_em', 'carimbo_autoridade']) then
    raise exception 'Assinatura registrada não se altera.';
  end if;

  if old.carimbo_token is not null
     and (new.carimbo_token is distinct from old.carimbo_token
          or new.carimbo_em is distinct from old.carimbo_em
          or new.carimbo_autoridade is distinct from old.carimbo_autoridade) then
    raise exception 'O carimbo de tempo já foi registrado.';
  end if;

  return new;
end;
$$;

revoke all on function private.assinatura_imutavel() from public, anon, authenticated;

create trigger documento_assinaturas_imutavel
  before update on public.documento_assinaturas
  for each row execute function private.assinatura_imutavel();

-- ---------------------------------------------------------------------
-- 4. A porta do link, num lugar só
-- ---------------------------------------------------------------------

create or replace function private.email_mascarado(p_email text)
returns text
language sql
immutable
set search_path = pg_temp
as $$
  select case
    when p_email is null or position('@' in p_email) < 2 then null
    else left(split_part(p_email, '@', 1), 1)
      || repeat('•', greatest(2, least(6, length(split_part(p_email, '@', 1)) - 2)))
      || case when length(split_part(p_email, '@', 1)) > 2 then right(split_part(p_email, '@', 1), 1) else '' end
      || '@' || split_part(p_email, '@', 2)
  end;
$$;

revoke all on function private.email_mascarado(text) from public, anon, authenticated;

-- Confere token, validade, bloqueio, data de nascimento e — quando o link
-- exige e `p_exige_codigo` — o código por e-mail. Conta a tentativa errada.
-- Devolve situação, nunca exceção: exceção desfaria a transação e apagaria a
-- contagem que protege o link (AGENTS.md §8.7). A linha do link fica travada
-- (`for update`) até o fim da transação de quem chamou.
create or replace function private.porta_do_link(
  p_token text,
  p_nascimento date,
  p_codigo text,
  p_exige_codigo boolean
)
returns table (situacao text, link_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_nascimento date;
  v_codigo text := nullif(regexp_replace(coalesce(p_codigo, ''), '[^0-9]', '', 'g'), '');
begin
  situacao := 'nao_encontrado';
  link_id := null;

  if p_token is null or length(p_token) < 32 or length(p_token) > 128 or p_nascimento is null then
    return next; return;
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
   for update;

  if not found then return next; return; end if;
  link_id := v_link.id;

  if v_link.revogado_em is not null then situacao := 'revogado'; return next; return; end if;
  if v_link.expira_em <= now() then situacao := 'expirado'; return next; return; end if;
  if v_link.tentativas >= 10 then situacao := 'bloqueado'; return next; return; end if;

  select p.data_nascimento into v_nascimento
    from public.documentos d
    join public.pacientes p on p.id = d.paciente_id
   where d.id = v_link.documento_id;

  if v_nascimento is distinct from p_nascimento then
    update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
    situacao := 'data_incorreta';
    return next; return;
  end if;

  if p_exige_codigo and v_link.verificacao = 'nascimento_email' then
    if v_codigo is null then
      situacao := 'codigo_necessario';
      return next; return;
    end if;

    if v_link.codigo_hash is null
       or not (v_link.codigo_expira_em > now()
               or v_link.codigo_conferido_em > now() - interval '60 minutes') then
      situacao := 'codigo_expirado';
      return next; return;
    end if;

    if v_link.codigo_hash <> encode(sha256(convert_to(v_link.id::text || ':' || v_codigo, 'UTF8')), 'hex') then
      update public.documento_links set tentativas = tentativas + 1 where id = v_link.id;
      situacao := 'codigo_incorreto';
      return next; return;
    end if;

    update public.documento_links
       set codigo_conferido_em = coalesce(codigo_conferido_em, now())
     where id = v_link.id;
  end if;

  situacao := 'ok';
  return next;
end;
$$;

revoke all on function private.porta_do_link(text, date, text, boolean) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Funções públicas, agora com o segredo do servidor
-- ---------------------------------------------------------------------
-- As assinaturas mudam: drop + create, e o EXECUTE é refeito no fim.

drop function if exists public.documento_link_estado(text);
drop function if exists public.documento_para_assinatura(text, date);
drop function if exists public.documento_assinar_por_link(text, date, text, text, text, text);
drop function if exists public.documento_responder_por_link(text, date, jsonb);
drop function if exists public.documento_assinar(uuid, text, text, text, text, text);
drop function if exists public.documento_link_criar(uuid, text, integer, text);

-- O link serve? Sem revelar conteúdo: situação, tipo e o modo de verificação
-- (a tela avisa antes que vai pedir um código por e-mail).
create function public.documento_link_estado(p_token text, p_servidor text)
returns table (situacao text, tipo text, verificacao text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link public.documento_links;
  v_documento public.documentos;
begin
  situacao := 'nao_encontrado';

  if not private.servidor_confere(p_servidor) then
    situacao := 'nao_autorizado';
    return next; return;
  end if;

  if p_token is null or length(p_token) < 32 or length(p_token) > 128 then
    return next; return;
  end if;

  select * into v_link
    from public.documento_links
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');

  if not found then return next; return; end if;
  if v_link.revogado_em is not null then situacao := 'revogado'; return next; return; end if;
  if v_link.expira_em <= now() then situacao := 'expirado'; return next; return; end if;
  if v_link.tentativas >= 10 then situacao := 'bloqueado'; return next; return; end if;

  select * into v_documento from public.documentos where id = v_link.documento_id;

  tipo := v_documento.tipo::text;
  verificacao := v_link.verificacao;

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

-- Envia (gera) o código do segundo fator. Devolve o código em claro UMA vez,
-- para a aplicação mandar por e-mail — a tabela guarda só o hash.
create function public.documento_link_codigo_enviar(
  p_token text,
  p_nascimento date,
  p_servidor text
)
returns table (situacao text, email text, email_mascarado text, codigo text, reenviar_em timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_porta record;
  v_link public.documento_links;
  v_documento public.documentos;
  v_codigo text;
begin
  if not private.servidor_confere(p_servidor) then
    situacao := 'nao_autorizado';
    return next; return;
  end if;

  select * into v_porta from private.porta_do_link(p_token, p_nascimento, null, false);
  situacao := v_porta.situacao;
  if situacao <> 'ok' then return next; return; end if;

  select * into v_link from public.documento_links where id = v_porta.link_id;
  select * into v_documento from public.documentos where id = v_link.documento_id;

  if v_link.verificacao <> 'nascimento_email' then
    situacao := 'indisponivel';
    return next; return;
  end if;

  if v_documento.situacao not in ('emitido', 'assinado') then
    situacao := 'indisponivel';
    return next; return;
  end if;

  email_mascarado := private.email_mascarado(v_link.email_destino);

  if v_link.codigo_enviado_em > now() - interval '45 seconds' then
    situacao := 'aguarde';
    reenviar_em := v_link.codigo_enviado_em + interval '45 seconds';
    return next; return;
  end if;

  if v_link.codigo_envios >= 10 then
    situacao := 'limite_de_envios';
    return next; return;
  end if;

  -- 28 bits aleatórios (sempre positivos) → 6 dígitos.
  v_codigo := lpad(
    ((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 7))::bit(28)::integer) % 1000000)::text,
    6, '0'
  );

  update public.documento_links
     set codigo_hash = encode(sha256(convert_to(id::text || ':' || v_codigo, 'UTF8')), 'hex'),
         codigo_expira_em = now() + interval '15 minutes',
         codigo_enviado_em = now(),
         codigo_envios = codigo_envios + 1,
         codigo_conferido_em = null
   where id = v_link.id;

  situacao := 'ok';
  email := v_link.email_destino;
  codigo := v_codigo;
  reenviar_em := now() + interval '45 seconds';
  return next;
end;
$$;

-- Revela o documento (antes e depois de assinado) mediante data de
-- nascimento e, quando o link exige, o código por e-mail.
create function public.documento_para_assinatura(
  p_token text,
  p_nascimento date,
  p_codigo text,
  p_servidor text
)
returns table (
  situacao text, titulo text, corpo text, paciente text, tipo text,
  emitido_em timestamptz, hash text, assinado_em timestamptz,
  assinado_por text, campos jsonb, assinado_canal text,
  verificacao text, email_mascarado text,
  codigo_verificacao text, manifesto_hash text, fatores text[],
  rubrica text, rubrica_dispensada boolean,
  carimbo_em timestamptz, carimbo_autoridade text,
  ip text, localizacao text, dispositivo text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_porta record;
  v_link public.documento_links;
  v_documento public.documentos;
  v_paciente public.pacientes;
  v_assinatura public.documento_assinaturas;
begin
  situacao := 'nao_encontrado';
  campos := '[]'::jsonb;

  if not private.servidor_confere(p_servidor) then
    situacao := 'nao_autorizado';
    return next; return;
  end if;

  select * into v_porta from private.porta_do_link(p_token, p_nascimento, p_codigo, true);
  situacao := v_porta.situacao;

  if v_porta.link_id is not null and situacao in ('codigo_necessario', 'codigo_expirado', 'codigo_incorreto') then
    select * into v_link from public.documento_links where id = v_porta.link_id;
    verificacao := v_link.verificacao;
    email_mascarado := private.email_mascarado(v_link.email_destino);
  end if;

  if situacao <> 'ok' then return next; return; end if;

  select * into v_link from public.documento_links where id = v_porta.link_id;
  select * into v_documento from public.documentos where id = v_link.documento_id;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  verificacao := v_link.verificacao;
  email_mascarado := private.email_mascarado(v_link.email_destino);

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
      assinado_canal := v_assinatura.canal;
      codigo_verificacao := v_assinatura.codigo_verificacao;
      manifesto_hash := v_assinatura.manifesto_hash;
      fatores := v_assinatura.fatores;
      rubrica := v_assinatura.rubrica;
      rubrica_dispensada := v_assinatura.rubrica_dispensada;
      carimbo_em := v_assinatura.carimbo_em;
      carimbo_autoridade := v_assinatura.carimbo_autoridade;
      ip := host(v_assinatura.ip);
      localizacao := v_assinatura.localizacao;
      dispositivo := v_assinatura.dispositivo;
    end if;
  end if;

  return next;
end;
$$;

-- Assina pelo link. Devolve a situação e, no sucesso, o código de verificação.
create function public.documento_assinar_por_link(
  p_token text,
  p_nascimento date,
  p_codigo text,
  p_nome text,
  p_cpf text,
  p_rubrica text,
  p_rubrica_dispensada boolean,
  p_leitura_segundos integer,
  p_leitura_completa boolean,
  p_ip text,
  p_dispositivo text,
  p_localizacao text,
  p_servidor text
)
returns table (situacao text, codigo_verificacao text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_porta record;
  v_link public.documento_links;
  v_documento public.documentos;
  v_paciente public.pacientes;
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_cpf_ficha text;
  v_rubrica text := nullif(btrim(coalesce(p_rubrica, '')), '');
  v_fatores text[] := array['posse_do_link', 'data_de_nascimento'];
  v_verificacao text;
  v_ip inet;
  v_id uuid;
begin
  if not private.servidor_confere(p_servidor) then
    situacao := 'nao_autorizado';
    return next; return;
  end if;

  select * into v_porta from private.porta_do_link(p_token, p_nascimento, p_codigo, true);
  situacao := v_porta.situacao;
  if situacao <> 'ok' then return next; return; end if;

  select * into v_link from public.documento_links where id = v_porta.link_id;
  select * into v_documento from public.documentos where id = v_link.documento_id for update;
  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_documento.tipo = 'anamnese' then situacao := 'indisponivel'; return next; return; end if;
  if v_documento.situacao = 'assinado' then situacao := 'ja_assinado'; return next; return; end if;
  if v_documento.situacao <> 'emitido' then situacao := 'indisponivel'; return next; return; end if;

  if length(v_nome) < 3 or length(v_nome) > 160 then situacao := 'nome_invalido'; return next; return; end if;
  if v_cpf is not null and length(v_cpf) <> 11 then situacao := 'cpf_invalido'; return next; return; end if;

  v_cpf_ficha := nullif(regexp_replace(coalesce(v_paciente.cpf, ''), '[^0-9]', '', 'g'), '');
  if v_cpf is not null and v_cpf_ficha is not null and v_cpf <> v_cpf_ficha then
    situacao := 'cpf_nao_confere';
    return next; return;
  end if;

  if v_rubrica is null and not coalesce(p_rubrica_dispensada, false) then
    situacao := 'rubrica_necessaria';
    return next; return;
  end if;
  if not private.rubrica_valida(v_rubrica) then
    situacao := 'rubrica_invalida';
    return next; return;
  end if;

  if v_link.verificacao = 'nascimento_email' then
    v_fatores := array_append(v_fatores, 'codigo_por_email');
  end if;
  if v_cpf is not null and v_cpf = v_cpf_ficha then
    v_fatores := array_append(v_fatores, 'cpf_conferido');
  end if;

  begin
    v_ip := nullif(btrim(coalesce(p_ip, '')), '')::inet;
  exception when others then
    v_ip := null;
  end;

  -- O banco escreve como a identidade foi conferida, a partir do que ele
  -- mesmo conferiu (canal gravado no envio, fatores desta chamada).
  v_verificacao := 'Assinatura à distância: posse do link'
    || case when v_link.canal_envio ~ '^WhatsApp[ 0-9()+.-]{0,30}$'
            then ' enviado por ' || v_link.canal_envio else '' end
    || ', data de nascimento conferida'
    || case when v_link.verificacao = 'nascimento_email'
            then ', código enviado a ' || private.email_mascarado(v_link.email_destino) || ' confirmado'
            else '' end
    || case when 'cpf_conferido' = any(v_fatores) then ', CPF igual ao da ficha' else '' end
    || '.';

  insert into public.documento_assinaturas (
    documento_id, nome_informado, cpf_informado, hash_assinado, ip,
    dispositivo, verificacao_identidade, operador_id, canal, link_id,
    rubrica, rubrica_dispensada, leitura_segundos, leitura_completa,
    localizacao, fatores
  )
  values (
    v_documento.id, v_nome, v_cpf, v_documento.corpo_hash, v_ip,
    left(nullif(btrim(coalesce(p_dispositivo, '')), ''), 400),
    left(v_verificacao, 240), null, 'link', v_link.id,
    v_rubrica, v_rubrica is null,
    case when p_leitura_segundos between 0 and 86400 then p_leitura_segundos end,
    p_leitura_completa,
    left(nullif(btrim(coalesce(p_localizacao, '')), ''), 160),
    v_fatores
  )
  on conflict (documento_id) do nothing
  returning id into v_id;

  if v_id is null then
    situacao := 'ja_assinado';
    return next; return;
  end if;

  update public.documento_links set tentativas = 0 where id = v_link.id;

  select a.codigo_verificacao into codigo_verificacao
    from public.documento_assinaturas a where a.id = v_id;

  situacao := 'ok';
  return next;
end;
$$;

-- A paciente respondendo a anamnese pelo link: mesma porta, com o código
-- quando o link exige.
create function public.documento_responder_por_link(
  p_token text,
  p_nascimento date,
  p_respostas jsonb,
  p_codigo text,
  p_servidor text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_porta record;
  v_link public.documento_links;
  v_documento public.documentos;
  v_chave text;
  v_valor jsonb;
  v_campo public.documento_campos;
  v_resposta record;
begin
  if not private.servidor_confere(p_servidor) then
    return 'nao_autorizado';
  end if;

  select * into v_porta from private.porta_do_link(p_token, p_nascimento, p_codigo, true);
  if v_porta.situacao <> 'ok' then
    return v_porta.situacao;
  end if;

  select * into v_link from public.documento_links where id = v_porta.link_id;
  select * into v_documento from public.documentos where id = v_link.documento_id for update;

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

-- Assinatura no balcão: INVOKER (a RLS de quem clica vale), agora com
-- rubrica, localização e o segredo do servidor — IP e aparelho também são
-- atestados pela aplicação aqui. Devolve o código de verificação.
create function public.documento_assinar(
  p_documento_id uuid,
  p_nome text,
  p_cpf text,
  p_verificacao text,
  p_rubrica text,
  p_rubrica_dispensada boolean,
  p_ip text,
  p_dispositivo text,
  p_localizacao text,
  p_servidor text
)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_documento public.documentos;
  v_nome text := btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g'));
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_cpf_ficha text;
  v_verificacao text := btrim(coalesce(p_verificacao, ''));
  v_rubrica text := nullif(btrim(coalesce(p_rubrica, '')), '');
  v_fatores text[] := array['conferencia_presencial'];
  v_ip inet;
  v_codigo text;
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  if not private.servidor_confere(p_servidor) then
    raise exception 'Assinatura só pelo sistema da clínica.';
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

  if v_rubrica is null and not coalesce(p_rubrica_dispensada, false) then
    raise exception 'Peça à paciente para rubricar no quadro, ou marque que ela assina só pelo nome.';
  end if;

  if not private.rubrica_valida(v_rubrica) then
    raise exception 'Rubrica inválida';
  end if;

  select nullif(regexp_replace(coalesce(p.cpf, ''), '[^0-9]', '', 'g'), '') into v_cpf_ficha
    from public.pacientes p where p.id = v_documento.paciente_id;
  if v_cpf is not null and v_cpf_ficha is not null and v_cpf = v_cpf_ficha then
    v_fatores := array_append(v_fatores, 'cpf_conferido');
  end if;
  if v_verificacao ~* 'documento' then
    v_fatores := array_append(v_fatores, 'documento_com_foto');
  end if;

  begin
    v_ip := nullif(btrim(coalesce(p_ip, '')), '')::inet;
  exception when others then
    v_ip := null;
  end;

  insert into public.documento_assinaturas (
    documento_id, nome_informado, cpf_informado, hash_assinado,
    ip, dispositivo, verificacao_identidade, operador_id,
    rubrica, rubrica_dispensada, localizacao, fatores
  )
  values (
    p_documento_id, v_nome, v_cpf, v_documento.corpo_hash,
    v_ip, left(nullif(btrim(coalesce(p_dispositivo, '')), ''), 400),
    v_verificacao, auth.uid(),
    v_rubrica, v_rubrica is null,
    left(nullif(btrim(coalesce(p_localizacao, '')), ''), 160),
    v_fatores
  )
  returning codigo_verificacao into v_codigo;

  update public.documentos
     set situacao = 'assinado'
   where id = p_documento_id
     and situacao = 'emitido';

  return v_codigo;
end;
$$;

-- Link novo, agora com o modo de verificação. Com código por e-mail, o
-- e-mail da ficha é copiado para o link: trocar o e-mail da paciente depois
-- não redireciona um link já enviado.
create function public.documento_link_criar(
  p_documento_id uuid,
  p_token text,
  p_dias integer,
  p_canal text,
  p_verificacao text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_link_id uuid;
  v_documento public.documentos;
  v_paciente public.pacientes;
  v_dias integer := coalesce(p_dias, 15);
  v_verificacao text := coalesce(nullif(btrim(p_verificacao), ''), 'nascimento');
  v_email text;
begin
  if not private.tem_acesso() then
    raise exception 'Acesso negado';
  end if;

  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{43,128}$' then
    raise exception 'Token inválido';
  end if;

  if v_dias < 1 or v_dias > 90 then
    raise exception 'Validade deve ficar entre 1 e 90 dias';
  end if;

  if v_verificacao not in ('nascimento', 'nascimento_email') then
    raise exception 'Modo de verificação inválido';
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

  select * into v_paciente from public.pacientes where id = v_documento.paciente_id;

  if v_paciente.data_nascimento is null then
    raise exception 'Cadastre a data de nascimento da paciente antes de enviar o link';
  end if;

  if v_verificacao = 'nascimento_email' then
    v_email := lower(btrim(coalesce(v_paciente.email, '')));
    if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'Cadastre o e-mail da paciente para enviar o código de verificação';
    end if;
  end if;

  update public.documento_links
     set revogado_em = now()
   where documento_id = p_documento_id
     and revogado_em is null
     and expira_em > now();

  insert into public.documento_links (
    documento_id, token_hash, criado_por, expira_em, canal_envio, verificacao, email_destino
  )
  values (
    p_documento_id,
    encode(sha256(convert_to(p_token, 'UTF8')), 'hex'),
    auth.uid(),
    now() + make_interval(days => v_dias),
    '',
    v_verificacao,
    v_email
  )
  returning id into v_link_id;

  return v_link_id;
end;
$$;

-- O carimbo de tempo (RFC 3161) do manifesto, uma vez. Quem pede e confere a
-- resposta da autoridade é a aplicação; o banco só aceita do servidor, e só
-- uma vez, e só com a data plausível (não antes da assinatura, não no futuro).
create function public.documento_assinatura_carimbar(
  p_codigo_verificacao text,
  p_token_base64 text,
  p_carimbo_em timestamptz,
  p_autoridade text,
  p_servidor text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assinatura public.documento_assinaturas;
begin
  if not private.servidor_confere(p_servidor) then
    return 'nao_autorizado';
  end if;

  select * into v_assinatura
    from public.documento_assinaturas
   where codigo_verificacao = upper(btrim(coalesce(p_codigo_verificacao, '')))
   for update;

  if not found then return 'nao_encontrado'; end if;
  if v_assinatura.carimbo_token is not null then return 'ja_carimbado'; end if;

  if p_token_base64 is null or p_token_base64 !~ '^[A-Za-z0-9+/]+={0,2}$'
     or length(p_token_base64) > 24000
     or p_autoridade is null or length(btrim(p_autoridade)) not between 3 and 120
     or p_carimbo_em is null
     or p_carimbo_em < v_assinatura.assinado_em - interval '5 minutes'
     or p_carimbo_em > now() + interval '5 minutes' then
    return 'invalido';
  end if;

  update public.documento_assinaturas
     set carimbo_token = p_token_base64,
         carimbo_em = p_carimbo_em,
         carimbo_autoridade = btrim(p_autoridade)
   where id = v_assinatura.id;

  return 'ok';
end;
$$;

-- Verificação pública: quem tem o código da via confere se a assinatura
-- existe e vale. Sem título (pode revelar procedimento — dado de saúde), sem
-- nome completo, sem CPF, sem texto: iniciais, datas, hashes e carimbo.
create function public.documento_verificar(p_codigo text, p_servidor text)
returns table (
  situacao text, tipo text, emitido_em timestamptz, assinado_em timestamptz,
  iniciais text, canal text, fatores text[], texto_hash text, manifesto_hash text,
  carimbo_em timestamptz, carimbo_autoridade text, rubrica boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_assinatura public.documento_assinaturas;
  v_documento public.documentos;
  v_codigo text := upper(regexp_replace(coalesce(p_codigo, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  situacao := 'nao_encontrado';

  if not private.servidor_confere(p_servidor) then
    situacao := 'nao_autorizado';
    return next; return;
  end if;

  if length(v_codigo) <> 12 then return next; return; end if;
  v_codigo := substr(v_codigo, 1, 4) || '-' || substr(v_codigo, 5, 4) || '-' || substr(v_codigo, 9, 4);

  select * into v_assinatura from public.documento_assinaturas where codigo_verificacao = v_codigo;
  if not found then return next; return; end if;

  select * into v_documento from public.documentos where id = v_assinatura.documento_id;

  situacao := case v_documento.situacao::text
    when 'assinado' then 'valido'
    when 'cancelado' then 'cancelado'
    when 'substituido' then 'substituido'
    else 'valido'
  end;
  tipo := v_documento.tipo::text;
  emitido_em := v_documento.emitido_em;
  assinado_em := v_assinatura.assinado_em;
  iniciais := (
    select string_agg(left(parte, 1) || '.', ' ' order by ordem)
      from (
        select parte, ordem
          from regexp_split_to_table(btrim(v_assinatura.nome_informado), '\s+') with ordinality as t(parte, ordem)
         where length(parte) > 2 or ordem = 1
      ) partes
  );
  canal := v_assinatura.canal;
  fatores := v_assinatura.fatores;
  texto_hash := v_assinatura.hash_assinado;
  manifesto_hash := v_assinatura.manifesto_hash;
  carimbo_em := v_assinatura.carimbo_em;
  carimbo_autoridade := v_assinatura.carimbo_autoridade;
  rubrica := v_assinatura.rubrica is not null;
  return next;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. EXECUTE: a porta pública continua sendo só função, e toda ela exige
-- o segredo do servidor
-- ---------------------------------------------------------------------

revoke all on function public.documento_link_estado(text, text) from public;
revoke all on function public.documento_link_codigo_enviar(text, date, text) from public;
revoke all on function public.documento_para_assinatura(text, date, text, text) from public;
revoke all on function public.documento_assinar_por_link(text, date, text, text, text, text, boolean, integer, boolean, text, text, text, text) from public;
revoke all on function public.documento_responder_por_link(text, date, jsonb, text, text) from public;
revoke all on function public.documento_assinatura_carimbar(text, text, timestamptz, text, text) from public;
revoke all on function public.documento_verificar(text, text) from public;
revoke all on function public.documento_assinar(uuid, text, text, text, text, boolean, text, text, text, text) from public;
revoke all on function public.documento_link_criar(uuid, text, integer, text, text) from public;

grant execute on function public.documento_link_estado(text, text) to anon, authenticated;
grant execute on function public.documento_link_codigo_enviar(text, date, text) to anon, authenticated;
grant execute on function public.documento_para_assinatura(text, date, text, text) to anon, authenticated;
grant execute on function public.documento_assinar_por_link(text, date, text, text, text, text, boolean, integer, boolean, text, text, text, text) to anon, authenticated;
grant execute on function public.documento_responder_por_link(text, date, jsonb, text, text) to anon, authenticated;
grant execute on function public.documento_assinatura_carimbar(text, text, timestamptz, text, text) to anon, authenticated;
grant execute on function public.documento_verificar(text, text) to anon, authenticated;
grant execute on function public.documento_assinar(uuid, text, text, text, text, boolean, text, text, text, text) to authenticated;
grant execute on function public.documento_link_criar(uuid, text, integer, text, text) to authenticated;

comment on function public.documento_link_estado(text, text) is
  'Porta pública (segredo do servidor): o link serve? Situação, tipo e modo de verificação, sem conteúdo (0032).';
comment on function public.documento_link_codigo_enviar(text, date, text) is
  'Porta pública (segredo do servidor): gera o código do segundo fator e o devolve uma vez para o e-mail (0032).';
comment on function public.documento_para_assinatura(text, date, text, text) is
  'Porta pública (segredo do servidor): revela o documento mediante data de nascimento e, se exigido, código por e-mail; devolve as evidências da via (0032).';
comment on function public.documento_assinar_por_link(text, date, text, text, text, text, boolean, integer, boolean, text, text, text, text) is
  'Porta pública (segredo do servidor): assina com rubrica, leitura, CPF conferido e fatores; devolve o código de verificação (0032).';
comment on function public.documento_verificar(text, text) is
  'Porta pública (segredo do servidor): verificação de autenticidade por código, sem dado de saúde (0032).';
comment on function public.documento_assinatura_carimbar(text, text, timestamptz, text, text) is
  'Porta pública (segredo do servidor): grava uma vez o carimbo de tempo RFC 3161 do manifesto (0032).';
