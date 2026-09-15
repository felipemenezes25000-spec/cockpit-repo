-- =====================================================================
-- Migração 0016: a via da paciente
--
-- A 0014 fechava o link no instante da assinatura — "link cumprido não
-- serve mais para nada". Estava errado, e o erro é de fundo: quem assina
-- um contrato tem direito à via do que assinou, e o sistema entregava
-- uma tela de agradecimento e nada mais. A paciente saía sem cópia, e
-- voltar ao link só dizia "documento já assinado".
--
-- Duas mudanças:
--
-- 1. ASSINAR NÃO REVOGA MAIS. O link continua valendo até a data de
--    expiração, agora em modo leitura. A paciente volta quando quiser,
--    dentro do prazo, e salva a via dela.
--
-- 2. O TEXTO SAI TAMBÉM DEPOIS DE ASSINADO, junto com quem assinou e
--    quando. Antes o corpo só era devolvido enquanto havia o que
--    assinar, o que é exatamente o contrário do que a via exige.
--
-- O que NÃO muda: a data de nascimento continua sendo exigida a cada
-- abertura, a contagem de tentativas continua valendo, e a clínica
-- continua podendo revogar o link na mão. Ler a via é o mesmo grau de
-- acesso que ler antes de assinar — não é um grau novo.
--
-- Consequência assumida: o documento fica legível por quem tiver o link
-- e a data de nascimento durante toda a validade, e não só até a
-- assinatura. Quem quiser encurtar isso escolhe 7 dias na emissão, ou
-- revoga depois de a paciente confirmar que salvou.
-- =====================================================================

-- O tipo de retorno ganha duas colunas, e função que devolve tabela não
-- troca de assinatura com `create or replace`.
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
  assinado_por text
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

  -- O texto sai enquanto há o que assinar E depois de assinado: no
  -- primeiro caso para ser lido antes de aceitar, no segundo porque é a
  -- via dela. Cancelado e substituído continuam sem corpo — não há via
  -- de documento que deixou de valer.
  if situacao in ('ok', 'ja_assinado') then
    corpo := v_documento.corpo_congelado;
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

-- Assinar deixa de fechar o link: a via depende dele continuar de pé.
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
    null,
    'link',
    v_link.id
  );

  update public.documentos set situacao = 'assinado' where id = v_documento.id;

  -- O link NÃO é revogado aqui. Ver a decisão 1 no cabeçalho: é por ele
  -- que a paciente volta para buscar a via dela.

  return 'ok';
end;
$$;

-- DROP levou os privilégios junto. Reposicionar exatamente como a 0014.
revoke all on function public.documento_para_assinatura(text, date) from public, anon;
grant execute on function public.documento_para_assinatura(text, date) to anon, authenticated;

comment on function public.documento_para_assinatura(text, date) is
  'Porta pública: revela o documento mediante data de nascimento, antes e depois de assinado. Executável por anon.';
