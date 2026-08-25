-- =====================================================================
-- Migração 0008: operações de venda como funções do banco
--
-- Registrar uma venda grava duas linhas (venda + recebimento); alterar a
-- forma de pagamento grava até três (venda + recebimento ou ajuste +
-- histórico). O cliente HTTP não tem transação — se a segunda escrita
-- falhasse, sobraria meia venda. Estas funções fazem tudo ou nada.
--
-- São SECURITY INVOKER de propósito: a RLS de quem chama continua
-- valendo — a recepção consegue registrar venda (política de INSERT),
-- mas a alteração esbarra na política de UPDATE, que é do financeiro.
-- E as regras de aplicação ficam reforçadas aqui dentro: taxa manual
-- sem ser financeiro é exceção, não gravação.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Registrar venda: a venda e o seu ÚNICO recebimento.
--
-- Cartão parcelado é antecipado pela operadora: a paciente parcela, a
-- clínica recebe uma vez. Por isso não existe laço de parcelas aqui —
-- e `parcela`/`total_parcelas` do recebimento ficam nulos.
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
  v_valor_final numeric := p_valor_original - p_desconto;
  v_liquido numeric := p_valor_original - p_desconto - p_taxa_valor;
  v_venda_id uuid;
begin
  if p_situacao_inicial not in ('previsto', 'recebido') then
    raise exception 'Situação inicial precisa ser previsto ou recebido.';
  end if;

  if p_taxa_manual and not private.e_financeira() then
    raise exception 'Alterar a taxa é restrito ao financeiro e à administradora.';
  end if;

  insert into public.vendas (
    paciente_id, procedimento_id, data_venda,
    valor_original, desconto, valor_final,
    forma, parcelas,
    taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido,
    taxa_manual, taxa_justificativa, observacoes, criado_por
  ) values (
    p_paciente_id, p_procedimento_id, p_data_venda,
    p_valor_original, p_desconto, v_valor_final,
    p_forma, p_parcelas,
    p_taxa_cartao_id, p_taxa_percentual, p_taxa_valor, v_liquido,
    p_taxa_manual, p_taxa_justificativa, p_observacoes, auth.uid()
  )
  returning id into v_venda_id;

  insert into public.recebimentos (
    venda_id, paciente_id, descricao,
    valor, taxa_valor, forma, situacao,
    vencimento, recebido_em, valor_recebido, criado_por
  ) values (
    v_venda_id, p_paciente_id, p_descricao,
    v_valor_final, p_taxa_valor, p_forma, p_situacao_inicial,
    p_vencimento,
    case when p_situacao_inicial = 'recebido' then p_recebido_em end,
    case when p_situacao_inicial = 'recebido' then v_liquido end,
    auth.uid()
  );

  return v_venda_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Alterar forma de pagamento ou taxa, com histórico e ajuste.
--
-- Uma função só para as duas mudanças: o mecanismo é idêntico e o que
-- muda é a fotografia gravada. Recebimento ainda não confirmado é
-- reescrito; confirmado não se toca — a diferença vira ajuste.
-- ---------------------------------------------------------------------

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

  -- Trava a venda até o fim: duas alterações simultâneas não se atropelam.
  select * into v_venda from public.vendas where id = p_venda_id for update;
  if not found then
    raise exception 'Venda não encontrada.';
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
    trim(p_motivo),
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
           when p_taxa_manual then trim(p_motivo)
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
        (p_venda_id, v_recebimento.id, v_diferenca, trim(p_motivo), auth.uid());
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

revoke all on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text) from public, anon;
revoke all on function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text) from public, anon;

grant execute on function public.venda_registrar(uuid, uuid, date, numeric, numeric, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text, text, public.situacao_recebimento, date, date, text) to authenticated;
grant execute on function public.venda_alterar_pagamento(uuid, text, public.forma_pagamento, integer, uuid, numeric, numeric, boolean, text) to authenticated;

comment on function public.venda_registrar is
  'Venda e seu único recebimento, em uma transação. Cartão parcelado gera um repasse só — a antecipação já está na taxa.';
comment on function public.venda_alterar_pagamento is
  'Mudança de forma de pagamento ou taxa: histórico sempre; recebimento previsto é reescrito, confirmado vira ajuste.';
