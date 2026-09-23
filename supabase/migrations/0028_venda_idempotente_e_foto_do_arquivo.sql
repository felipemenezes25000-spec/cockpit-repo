-- =====================================================================
-- Migração 0028: venda que não duplica no duplo envio, e foto que só se
-- registra com o arquivo no bucket
--
-- Continua a 0027 (o banco escreve o que antes quem chamava dizia) em
-- duas portas que ela deixou abertas.
--
-- 1. VENDA IDEMPOTENTE (`vendas.chave_envio`, `venda_registrar`).
--    Duplo clique, Enter repetido, o navegador reenviando o POST depois de
--    uma queda de rede, a resposta que se perde no caminho e a pessoa que
--    clica de novo: cada um virava uma segunda venda, com um segundo
--    recebimento — e dinheiro contado duas vezes no "a receber" (AGENTS.md
--    §13, "Venda duplicada por duplo envio"). A ação não tem como impedir
--    sozinha: as duas requisições chegam juntas.
--    O formulário gera uma chave (uuid) uma vez por tela aberta e a manda
--    em todo envio. `venda_registrar` ganha o parâmetro OPCIONAL
--    `p_chave` (default nulo — quem não manda continua como antes): com
--    chave, a função trava a chave (`pg_advisory_xact_lock`), procura a
--    venda que já nasceu com ela e, se for do mesmo perfil, devolve o id
--    dela sem gravar nada. Chave de outro perfil é recusada. O índice único
--    parcial é a última barreira.
--    A venda devolvida é a que já existe, mesmo que o segundo envio traga
--    outros valores: a chave identifica o ENVIO, não o conteúdo, e só uma
--    chamada direta à API mandaria a mesma chave com valores diferentes.
--    Mudar a assinatura exige drop + create (senão nasceria uma sobrecarga,
--    ambígua para o PostgREST); o corpo é o da 0023, com o bloco da chave
--    a mais, e o EXECUTE é refeito como na 0023 (só `authenticated`).
--
-- 2. FOTO SÓ COM O ARQUIVO NO BUCKET (`prontuario_imagens`).
--    A 0027 passou a escrever autor, hora e marca, e a conferir a data. Mas
--    pela API a administradora ainda gravava a linha de um arquivo que não
--    existe — "foto quebrada" na evolução, que a reconciliação (0024) só
--    acha depois — ou declarava tipo e tamanho diferentes do objeto. A
--    `registrarImagem` lê os dois de volta do Storage justamente porque
--    "uma linha que descreve um arquivo diferente do que está lá é pior do
--    que nenhuma linha" (AGENTS.md §8.5). Agora o banco faz o mesmo:
--    `private.imagem_nasce_do_arquivo`, com sessão de administradora, exige
--    o objeto em `storage.objects` no caminho exato, com os metadados que o
--    Storage grava no envio, e ESCREVE `tipo_mime` e `tamanho_bytes` a
--    partir deles; a extensão do caminho precisa bater com o tipo. A
--    conferência dos primeiros bytes (o conteúdo de fato) continua só na
--    ação — o banco não lê o arquivo.
--    SECURITY INVOKER: enxerga o bucket pela política de leitura que a
--    administradora já tem (0011), como a reconciliação da 0024. Sem sessão
--    (manutenção pelo SQL do projeto) passa, como os outros gatilhos
--    (AGENTS.md §4, regra 8). Quem não é administradora passa direto e é
--    recusado pela RLS (42501), como antes.
--
-- 3. IP E DISPOSITIVO, REGISTRADOS COMO O QUE SÃO.
--    A 0027 explica por que o banco não confere os dois: quem chama a
--    função pública do link é `anon`, com a chave pública, e o banco não
--    distingue a server action de uma chamada direta. Fechar exige um
--    segredo do servidor conferido pelo banco — decisão do dono. Enquanto
--    isso, o próprio schema diz o que as colunas são: declaradas por quem
--    chamou a função, não conferidas.
--
-- O que FICA DE FORA, de propósito: dar destino ao arquivo órfão (no bucket
-- sem linha). A eliminação da 0012 é a pedido da titular, de foto
-- registrada; apagar o que nunca virou registro — ou religá-lo a um
-- prontuário — é decisão da clínica (AGENTS.md §13, "Storage × Postgres não
-- é transacional").
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Venda idempotente
-- ---------------------------------------------------------------------

alter table public.vendas add column chave_envio uuid;

comment on column public.vendas.chave_envio is
  'Chave do envio do formulário (0028). A mesma chave do mesmo perfil devolve a venda já registrada em vez de criar outra. Nula nas vendas de antes e em quem não manda.';

create unique index vendas_chave_envio_unica
  on public.vendas (chave_envio)
  where chave_envio is not null;

drop function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text);

create function public.venda_registrar(
  p_paciente_id uuid,
  p_procedimento_id uuid,
  p_data_venda date,
  p_valor_original numeric,
  p_desconto numeric,
  p_forma public.forma_pagamento,
  p_parcelas integer,
  p_taxa_cartao_id uuid,
  p_taxa_percentual numeric,
  p_taxa_valor numeric,
  p_taxa_manual boolean,
  p_taxa_justificativa text,
  p_observacoes text,
  p_situacao_inicial public.situacao_recebimento,
  p_vencimento date,
  p_recebido_em date,
  p_descricao text,
  p_chave uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venda_id uuid;
  v_autor uuid;
begin
  -- Era a política `vendas_insercao`. Dentro de uma função DEFINER a RLS
  -- não vale; o perfil é conferido aqui, antes de qualquer gravação.
  if not private.tem_acesso() then
    raise exception using
      errcode = '42501',
      message = 'Seu perfil não tem acesso a esta operação.';
  end if;

  -- O mesmo envio chegando de novo. A trava é da chave, não da tabela: a
  -- segunda chamada espera a primeira terminar e acha a venda pronta.
  if p_chave is not null then
    perform pg_advisory_xact_lock(hashtextextended('venda_registrar:' || p_chave::text, 0));

    select id, criado_por into v_venda_id, v_autor
      from public.vendas
     where chave_envio = p_chave;

    if found then
      if v_autor is distinct from auth.uid() then
        raise exception 'Este envio já foi registrado por outra pessoa. Recarregue a página e registre de novo.';
      end if;
      return v_venda_id;
    end if;
  end if;

  if p_situacao_inicial not in ('previsto', 'recebido') then
    raise exception 'Situação inicial precisa ser prevista ou recebida.';
  end if;

  if p_data_venda is null then
    raise exception 'Informe a data da venda.';
  end if;

  if coalesce(p_taxa_manual, false) and not private.e_financeira() then
    raise exception 'Alterar a taxa é restrito ao financeiro e à administradora.';
  end if;

  -- Valores derivados aqui, das mesmas entradas que as CHECKs conferem; o
  -- gatilho `vendas_confere_taxa` confere a origem da taxa.
  insert into public.vendas (
    paciente_id, procedimento_id, data_venda,
    valor_original, desconto, valor_final,
    forma, parcelas,
    taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido,
    taxa_manual, taxa_justificativa, observacoes, criado_por, chave_envio
  ) values (
    p_paciente_id, p_procedimento_id, p_data_venda,
    p_valor_original, p_desconto, p_valor_original - p_desconto,
    p_forma, coalesce(p_parcelas, 1),
    p_taxa_cartao_id, coalesce(p_taxa_percentual, 0), coalesce(p_taxa_valor, 0),
    p_valor_original - p_desconto - coalesce(p_taxa_valor, 0),
    coalesce(p_taxa_manual, false),
    left(nullif(trim(p_taxa_justificativa), ''), 500),
    left(nullif(trim(p_observacoes), ''), 2000),
    auth.uid(),
    p_chave
  )
  returning id into v_venda_id;

  perform private.recebimento_da_venda_criar(
    v_venda_id,
    p_situacao_inicial,
    case when p_situacao_inicial = 'recebido' then coalesce(p_vencimento, p_recebido_em) else p_vencimento end,
    p_recebido_em,
    p_descricao
  );

  return v_venda_id;
end;
$$;

revoke all on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text, uuid) from public, anon;
grant execute on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text, uuid) to authenticated;

comment on function public.venda_registrar is
  'Única porta da venda: grava a venda e o seu único recebimento na mesma transação. SECURITY DEFINER desde a 0023, com o perfil conferido na entrada. Com p_chave (0028), o mesmo envio do mesmo perfil devolve a venda já registrada.';

-- ---------------------------------------------------------------------
-- 2. Foto só com o arquivo no bucket
-- ---------------------------------------------------------------------

create or replace function private.imagem_nasce_do_arquivo()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_metadados jsonb;
  v_tipo text;
  v_tamanho text;
begin
  -- Sem sessão é manutenção pelo SQL do projeto. Quem não é administradora
  -- não chega a gravar: a RLS recusa com 42501, como sempre.
  if auth.uid() is null or not private.e_administradora() then
    return new;
  end if;

  select o.metadata into v_metadados
    from storage.objects o
   where o.bucket_id = 'prontuario-imagens'
     and o.name = new.caminho;

  if not found then
    raise exception 'O arquivo da foto não está no armazenamento. Envie a foto de novo.';
  end if;

  v_tipo := v_metadados ->> 'mimetype';
  v_tamanho := v_metadados ->> 'size';

  if v_tipo is null or v_tamanho is null or v_tamanho !~ '^[0-9]{1,12}$' then
    raise exception 'O armazenamento ainda não conferiu o arquivo. Envie a foto de novo.';
  end if;

  if new.caminho !~ ('\.' || case v_tipo
                               when 'image/jpeg' then 'jpg'
                               when 'image/png' then 'png'
                               when 'image/webp' then 'webp'
                               else 'tipo-recusado'
                             end || '$') then
    raise exception 'O tipo do arquivo não é aceito ou não confere com a extensão.';
  end if;

  -- O que o Storage recebeu, não o que quem chamou declarou. O limite de
  -- tamanho continua na CHECK `prontuario_imagens_tamanho`.
  new.tipo_mime := v_tipo;
  new.tamanho_bytes := v_tamanho::bigint;
  return new;
end;
$$;

revoke all on function private.imagem_nasce_do_arquivo() from public, anon, authenticated;

comment on function private.imagem_nasce_do_arquivo is
  'Com sessão de administradora: a linha da foto só nasce com o objeto no bucket, e tipo e tamanho vêm dos metadados do Storage (0028). Sem sessão passa.';

create trigger prontuario_imagens_do_arquivo
  before insert on public.prontuario_imagens
  for each row execute function private.imagem_nasce_do_arquivo();

-- ---------------------------------------------------------------------
-- 3. IP e dispositivo da assinatura: declarados, não conferidos
-- ---------------------------------------------------------------------

comment on column public.documento_assinaturas.ip is
  'IP DECLARADO por quem chamou a função (a aplicação o lê do x-forwarded-for). O banco não confere: pelo link a chamada é anônima, com a chave pública (0027, 0028). Nulo quando não informado ou quando não é IP.';
comment on column public.documento_assinaturas.dispositivo is
  'Dispositivo (user-agent) DECLARADO por quem chamou a função. O banco não confere: pelo link a chamada é anônima, com a chave pública (0027, 0028).';
