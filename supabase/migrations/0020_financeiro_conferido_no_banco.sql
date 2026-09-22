-- =====================================================================
-- Migração 0020: as regras do dinheiro passam a ser conferidas no banco
--
-- `venda_registrar` é `security invoker` e só barrava uma coisa: taxa
-- MANUAL sem ser financeiro. Todo o resto vinha pronto do cliente e era
-- gravado como veio — percentual, valor da taxa, "manual" ou não. Quem
-- chamasse a função pela API, com a sessão da recepção, podia registrar
-- uma venda no crédito em 10x com `p_taxa_manual = false` e percentual
-- zero: a clínica receberia menos do que o sistema diria, e a venda
-- apareceria como "taxa da tabela". Pela mesma porta passava taxa em
-- venda de PIX — o bug 1 do AGENTS.md §13, que a tela de alterar taxa
-- também deixava passar.
--
-- As CHECK constraints da 0007 conferem a aritmética (final − taxa =
-- líquido), não a origem dos números. Esta migração confere a origem:
--
-- 1. `private.venda_confere_taxa` — gatilho BEFORE em `vendas`, que vale
--    para a função E para INSERT/UPDATE direto pela API:
--      - forma sem cartão não tem taxa (percentual, valor, tabela, manual);
--      - só o crédito parcela;
--      - cartão sem taxa manual aponta uma linha da tabela padrão, do
--        mesmo tipo e parcelamento, e o percentual é o DELA — na venda
--        nova, a linha precisa estar ativa;
--      - taxa manual só com sessão do financeiro ou da administradora;
--      - o valor da taxa é `round(final × percentual / 100, 2)`: o mesmo
--        arredondamento único de `lib/moeda.ts`, conferido em vez de
--        recalculado — se a tela e o banco divergirem, a gravação falha
--        em vez de guardar um número diferente do que a pessoa viu.
--    O gatilho só olha as colunas da conta. Venda antiga que nunca mais
--    for alterada não é revalidada.
--
-- 2. O recebimento da venda ganha porta própria.
--    A 0019 tirou de `authenticated` a inserção direta em `recebimentos`
--    (fica só o financeiro). Mas é `venda_registrar`, com a sessão da
--    recepção, quem cria o único recebimento de cada venda — o mesmo nó
--    da 0018 com as perguntas da anamnese, com a mesma saída:
--    `private.recebimento_da_venda_criar`, `security definer`, é a
--    única forma de o recebimento de uma venda nascer para quem não é do
--    financeiro. Ela não recebe valores: lê da própria venda (valor
--    final, taxa, forma, líquido) e só age se a venda ainda não tem
--    recebimento. Chamá-la de novo não cria nada.
--
--    "Já recebido" na venda continua disponível para a recepção — o
--    pagamento no balcão, em dinheiro ou PIX, é decisão já tomada na
--    tela de venda. O que a recepção não faz mais é confirmar depois, ou
--    escrever recebimento solto.
--
-- 3. Recebimento confirmado não se reescreve.
--    A regra sempre foi "confirmado não se toca — a diferença vira
--    ajuste" (§8.4), mas o banco deixava o UPDATE. Agora
--    `private.recebimento_confirmado_imutavel` recusa mudar valores,
--    datas, forma ou situação de um recebimento `recebido` ou
--    `recebido_divergencia`. Manutenção pelo SQL do projeto (sem sessão
--    de usuário) continua possível, como na 0019.
--
-- 4. `venda_registrar` e `venda_alterar_pagamento` são recriadas com a
--    mesma assinatura. A primeira passa a validar o que é dela (datas,
--    situação inicial) e a delegar o recebimento; a segunda recusa
--    alteração de taxa em venda sem cartão com mensagem própria. As duas
--    continuam `security invoker`: a RLS de quem chama segue valendo.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A taxa da venda confere com a regra
-- ---------------------------------------------------------------------

create or replace function private.venda_confere_taxa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_taxa public.taxas_cartao%rowtype;
begin
  if new.parcelas > 1 and new.forma <> 'credito' then
    raise exception 'Só o cartão de crédito parcela.';
  end if;

  if new.forma not in ('debito', 'credito') then
    if new.taxa_manual then
      raise exception 'Venda sem cartão não tem taxa para alterar.';
    end if;
    if new.taxa_percentual <> 0 or new.taxa_valor <> 0 or new.taxa_cartao_id is not null then
      raise exception 'Forma de pagamento sem cartão não tem taxa.';
    end if;
    return new;
  end if;

  if new.taxa_manual then
    -- Sem sessão é manutenção pelo SQL do projeto.
    if auth.uid() is not null and not private.e_financeira() then
      raise exception 'Alterar a taxa é restrito ao financeiro e à administradora.';
    end if;
  else
    if new.taxa_cartao_id is null then
      raise exception 'Venda no cartão precisa da taxa da tabela padrão.';
    end if;

    select * into v_taxa from public.taxas_cartao where id = new.taxa_cartao_id;

    if not found
       or v_taxa.tipo::text <> new.forma::text
       or v_taxa.parcelas <> new.parcelas then
      raise exception 'A taxa escolhida não corresponde à forma de pagamento e ao parcelamento.';
    end if;

    if (tg_op = 'INSERT' or new.taxa_cartao_id is distinct from old.taxa_cartao_id)
       and not v_taxa.ativa then
      raise exception 'Esta taxa não está mais ativa. Escolha outra.';
    end if;

    if new.taxa_percentual <> v_taxa.percentual then
      raise exception 'O percentual não confere com a tabela padrão de taxas.';
    end if;
  end if;

  if new.taxa_valor <> round(new.valor_final * new.taxa_percentual / 100, 2) then
    raise exception 'O valor da taxa não confere com o percentual sobre o valor final.';
  end if;

  return new;
end;
$$;

revoke all on function private.venda_confere_taxa() from public, anon, authenticated;

create trigger vendas_confere_taxa
  before insert or update of forma, parcelas, taxa_cartao_id, taxa_percentual,
                             taxa_valor, taxa_manual, valor_final
  on public.vendas
  for each row execute function private.venda_confere_taxa();

-- ---------------------------------------------------------------------
-- 2. A porta do recebimento da venda
-- ---------------------------------------------------------------------

create or replace function private.recebimento_da_venda_criar(
  p_venda_id uuid,
  p_situacao public.situacao_recebimento,
  p_vencimento date,
  p_recebido_em date,
  p_descricao text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_venda public.vendas%rowtype;
begin
  if not private.tem_acesso() then
    raise exception using errcode = '42501', message = 'Seu perfil não tem acesso a esta operação.';
  end if;

  if p_situacao not in ('previsto', 'recebido') then
    raise exception 'Situação inicial precisa ser prevista ou recebida.';
  end if;

  if p_vencimento is null then
    raise exception 'Informe a data prevista do recebimento.';
  end if;

  if p_situacao = 'recebido' and p_recebido_em is null then
    raise exception 'Informe quando o valor entrou.';
  end if;

  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if exists (select 1 from public.recebimentos where venda_id = p_venda_id) then
    raise exception 'Esta venda já tem recebimento.';
  end if;

  insert into public.recebimentos (
    venda_id, paciente_id, descricao,
    valor, taxa_valor, forma, situacao,
    vencimento, recebido_em, valor_recebido, criado_por
  ) values (
    v_venda.id, v_venda.paciente_id, left(nullif(trim(p_descricao), ''), 200),
    v_venda.valor_final, v_venda.taxa_valor, v_venda.forma, p_situacao,
    p_vencimento,
    case when p_situacao = 'recebido' then p_recebido_em end,
    case when p_situacao = 'recebido' then v_venda.valor_liquido end,
    auth.uid()
  );
end;
$$;

revoke all on function private.recebimento_da_venda_criar(uuid, public.situacao_recebimento, date, date, text)
  from public, anon;
grant execute on function private.recebimento_da_venda_criar(uuid, public.situacao_recebimento, date, date, text)
  to authenticated;

comment on function private.recebimento_da_venda_criar is
  'Única porta do recebimento de uma venda para quem não é do financeiro. Lê os valores da própria venda e só age se ela ainda não tem recebimento.';

-- ---------------------------------------------------------------------
-- 3. Confirmado não se reescreve
-- ---------------------------------------------------------------------

create or replace function private.recebimento_confirmado_imutavel()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if old.situacao in ('recebido', 'recebido_divergencia')
     and (new.situacao       is distinct from old.situacao
       or new.valor          is distinct from old.valor
       or new.taxa_valor     is distinct from old.taxa_valor
       or new.valor_recebido is distinct from old.valor_recebido
       or new.recebido_em    is distinct from old.recebido_em
       or new.forma          is distinct from old.forma
       or new.paciente_id    is distinct from old.paciente_id
       or new.venda_id       is distinct from old.venda_id) then
    raise exception 'Recebimento confirmado não se altera. A diferença entra como ajuste.';
  end if;

  return new;
end;
$$;

revoke all on function private.recebimento_confirmado_imutavel() from public, anon, authenticated;

create trigger recebimentos_confirmado_imutavel
  before update on public.recebimentos
  for each row execute function private.recebimento_confirmado_imutavel();

-- ---------------------------------------------------------------------
-- 4. As duas operações de venda, recriadas
-- ---------------------------------------------------------------------

create or replace function public.venda_registrar(
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
  p_descricao text
)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_venda_id uuid;
begin
  if p_situacao_inicial not in ('previsto', 'recebido') then
    raise exception 'Situação inicial precisa ser prevista ou recebida.';
  end if;

  if p_data_venda is null then
    raise exception 'Informe a data da venda.';
  end if;

  if p_taxa_manual and not private.e_financeira() then
    raise exception 'Alterar a taxa é restrito ao financeiro e à administradora.';
  end if;

  -- Valores derivados aqui, das mesmas entradas que as CHECKs conferem; o
  -- gatilho `vendas_confere_taxa` confere a origem da taxa.
  insert into public.vendas (
    paciente_id, procedimento_id, data_venda,
    valor_original, desconto, valor_final,
    forma, parcelas,
    taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido,
    taxa_manual, taxa_justificativa, observacoes, criado_por
  ) values (
    p_paciente_id, p_procedimento_id, p_data_venda,
    p_valor_original, p_desconto, p_valor_original - p_desconto,
    p_forma, coalesce(p_parcelas, 1),
    p_taxa_cartao_id, coalesce(p_taxa_percentual, 0), coalesce(p_taxa_valor, 0),
    p_valor_original - p_desconto - coalesce(p_taxa_valor, 0),
    coalesce(p_taxa_manual, false),
    left(nullif(trim(p_taxa_justificativa), ''), 500),
    left(nullif(trim(p_observacoes), ''), 2000),
    auth.uid()
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

create or replace function public.venda_alterar_pagamento(
  p_venda_id uuid,
  p_tipo text,
  p_forma public.forma_pagamento,
  p_parcelas integer,
  p_taxa_cartao_id uuid,
  p_taxa_percentual numeric,
  p_taxa_valor numeric,
  p_taxa_manual boolean,
  p_motivo text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_venda public.vendas%rowtype;
  v_recebimento public.recebimentos%rowtype;
  v_liquido numeric;
  v_diferenca numeric;
begin
  if p_tipo not in ('forma_pagamento', 'taxa_manual') then
    raise exception 'Tipo de alteração desconhecido.';
  end if;

  if coalesce(trim(p_motivo), '') = '' then
    raise exception 'A alteração exige um motivo.';
  end if;

  if not private.e_financeira() then
    raise exception using
      errcode = '42501',
      message = 'Alterar uma venda é restrito ao financeiro e à administradora.';
  end if;

  -- Trava a venda até o fim: duas alterações simultâneas não se atropelam.
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
  end if;

  if p_tipo = 'taxa_manual' and v_venda.forma not in ('debito', 'credito') then
    raise exception 'Venda sem cartão não tem taxa para alterar.';
  end if;

  v_liquido := v_venda.valor_final - p_taxa_valor;

  -- O recebimento vivo da venda (o único não cancelado).
  select * into v_recebimento
    from public.recebimentos
   where venda_id = p_venda_id and situacao <> 'cancelado'
   order by criado_em
   limit 1
   for update;

  insert into public.venda_alteracoes (venda_id, tipo, de, para, motivo, por)
  values (
    p_venda_id,
    p_tipo,
    jsonb_build_object(
      'forma', v_venda.forma, 'parcelas', v_venda.parcelas,
      'taxa_percentual', v_venda.taxa_percentual,
      'taxa_valor', v_venda.taxa_valor, 'valor_liquido', v_venda.valor_liquido
    ),
    jsonb_build_object(
      'forma', p_forma, 'parcelas', p_parcelas,
      'taxa_percentual', p_taxa_percentual,
      'taxa_valor', p_taxa_valor, 'valor_liquido', v_liquido
    ),
    left(trim(p_motivo), 500),
    auth.uid()
  );

  update public.vendas
     set forma = p_forma,
         parcelas = p_parcelas,
         taxa_cartao_id = p_taxa_cartao_id,
         taxa_percentual = p_taxa_percentual,
         taxa_valor = p_taxa_valor,
         valor_liquido = v_liquido,
         taxa_manual = p_taxa_manual,
         taxa_justificativa = case
           when p_taxa_manual then left(trim(p_motivo), 500)
           else taxa_justificativa
         end
   where id = p_venda_id;

  if v_recebimento.id is null then
    return;
  end if;

  if v_recebimento.situacao in ('recebido', 'recebido_divergencia') then
    -- Já confirmado: o registro original fica intacto. A diferença entre
    -- o novo líquido e o que de fato entrou vira um ajuste.
    v_diferenca := v_liquido - v_recebimento.valor_recebido;
    if v_diferenca <> 0 then
      insert into public.ajustes_financeiros
        (venda_id, recebimento_id, valor, motivo, criado_por)
      values
        (p_venda_id, v_recebimento.id, v_diferenca, left(trim(p_motivo), 500), auth.uid());
    end if;
  else
    -- Ainda previsto: reescreve com os valores novos.
    update public.recebimentos
       set forma = p_forma,
           taxa_valor = p_taxa_valor
     where id = v_recebimento.id;
  end if;
end;
$$;

-- `create or replace` preserva os grants da 0008; repetidos aqui para o
-- arquivo se explicar sozinho.
revoke all on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text) from public, anon;
revoke all on function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text) from public, anon;
grant execute on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text) to authenticated;
grant execute on function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text) to authenticated;
