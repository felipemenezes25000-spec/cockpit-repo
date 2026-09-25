-- =====================================================================
-- Remove os dados de exemplo
--
-- Rodar com: npm run dados:limpar
--
-- Apaga apenas o que foi marcado como exemplo. Nada cadastrado pela
-- clínica é tocado — nem quando aponta para um dado de exemplo.
--
-- Como decide, e por quê:
--
-- 1. UM COMANDO SÓ. Tudo roda num único bloco `do`, que é uma transação:
--    ou sai tudo o que pode sair, ou nada sai. Não existe mais a limpeza
--    pela metade que parava no primeiro DELETE recusado por FK.
-- 2. FILHAS ANTES DAS MÃES, em ordem fixa: ajustes → recebimentos →
--    vendas → despesas → pendências → retornos → atendimentos →
--    pacientes → procedimentos → profissionais.
-- 3. LINHA DE EXEMPLO APONTADA POR DADO REAL FICA. Uma venda de verdade
--    registrada para a paciente de exemplo, uma tarefa de contato real, um
--    prontuário, um documento: a linha de exemplo que eles apontam não é
--    apagada. Não é só para não violar FK — `pendencias` e `retornos`
--    caem em CASCADE junto com a paciente, e `retornos.atendimento_origem_id`
--    vira nulo: apagar a mãe apagaria ou mutilaria dado real em silêncio.
--    Vale também para a Captação (0029): o lead real vinculado à paciente
--    de exemplo, ou interessado num procedimento de exemplo, perderia o
--    vínculo por `on delete set null`; a venda ganha por um lead não sai
--    (sem ela o lead ficaria "ganho" sem venda, o que a CHECK recusa); e
--    procedimento com meta comercial própria não sai (`on delete restrict`).
--    O que ficou aparece no relatório do fim, por tabela.
-- 4. DADO CLÍNICO NÃO SAI POR SCRIPT. Prontuário, fotos e documentos
--    nunca são apagados aqui, mesmo marcados como exemplo: eles só
--    seguram a paciente de exemplo que apontam. Fotos têm arquivo no
--    Storage, e eliminação de dado de saúde tem caminho próprio (0012).
-- 5. A TRILHA SAI SÓ JUNTO COM A LINHA. Da auditoria, sai o registro de
--    linha de exemplo que NÃO existe mais. A trilha de uma linha de exemplo
--    que ficou (item 3) continua. O histórico de mudança da venda
--    (`venda_alteracoes`) e a trilha de situação do atendimento
--    (`atendimento_situacoes`) saem em CASCADE com a venda e o atendimento
--    de exemplo que as geraram.
--
-- Rodar de novo não apaga nada a mais: o resultado é o mesmo.
-- =====================================================================

do $$
declare
  v_tabela text;
  v_n integer;
begin
  -- Ajuste ou recebimento de exemplo pendurado numa venda REAL faz parte da
  -- conta dela: fica, para a venda real não perder o seu recebimento.
  delete from public.ajustes_financeiros a
   where a.exemplo
     and not exists (select 1 from public.vendas v where v.id = a.venda_id and not v.exemplo);

  delete from public.recebimentos r
   where r.exemplo
     and not exists (select 1 from public.ajustes_financeiros a where a.recebimento_id = r.id)
     and not exists (select 1 from public.vendas v where v.id = r.venda_id and not v.exemplo);

  delete from public.vendas v
   where v.exemplo
     and not exists (select 1 from public.recebimentos r where r.venda_id = v.id)
     and not exists (select 1 from public.ajustes_financeiros a where a.venda_id = v.id)
     and not exists (select 1 from public.leads l where l.venda_id = v.id);

  delete from public.despesas where exemplo;
  delete from public.pendencias where exemplo;
  delete from public.retornos where exemplo;

  delete from public.atendimentos t
   where t.exemplo
     and not exists (select 1 from public.retornos x where x.atendimento_origem_id = t.id)
     and not exists (select 1 from public.pendencias x where x.atendimento_id = t.id)
     and not exists (select 1 from public.recebimentos x where x.atendimento_id = t.id)
     and not exists (select 1 from public.prontuarios x where x.atendimento_id = t.id);

  delete from public.pacientes p
   where p.exemplo
     and not exists (select 1 from public.atendimentos x where x.paciente_id = p.id)
     and not exists (select 1 from public.retornos x where x.paciente_id = p.id)
     and not exists (select 1 from public.pendencias x where x.paciente_id = p.id)
     and not exists (select 1 from public.recebimentos x where x.paciente_id = p.id)
     and not exists (select 1 from public.vendas x where x.paciente_id = p.id)
     and not exists (select 1 from public.prontuarios x where x.paciente_id = p.id)
     and not exists (select 1 from public.documentos x where x.paciente_id = p.id)
     and not exists (select 1 from public.leads x where x.paciente_id = p.id);

  delete from public.procedimentos p
   where p.exemplo
     and not exists (select 1 from public.atendimentos x where x.procedimento_id = p.id)
     and not exists (select 1 from public.retornos x where x.procedimento_id = p.id)
     and not exists (select 1 from public.vendas x where x.procedimento_id = p.id)
     and not exists (select 1 from public.leads x where x.procedimento_interesse_id = p.id)
     and not exists (select 1 from public.metas_comerciais x where x.procedimento_id = p.id);

  delete from public.profissionais p
   where p.exemplo
     and not exists (select 1 from public.atendimentos x where x.profissional_id = p.id);

  -- A auditoria guarda o rastro das inserções e remoções de exemplo. Como
  -- não é registro clínico, sai junto — mas só o de linha que já não existe.
  foreach v_tabela in array array[
    'ajustes_financeiros', 'recebimentos', 'vendas', 'despesas', 'pendencias',
    'retornos', 'atendimentos', 'pacientes', 'procedimentos', 'profissionais'
  ] loop
    execute format(
      'delete from public.auditoria a
        where a.tabela = %1$L
          and (a.dados ->> ''exemplo'')::boolean is true
          and not exists (select 1 from public.%1$I t where t.id::text = a.registro_id)',
      v_tabela);
    get diagnostics v_n = row_count;
    raise notice 'auditoria de %: % linhas', v_tabela, v_n;
  end loop;
end $$;

-- O que ficou marcado como exemplo porque um dado real aponta para ele. Zero
-- em tudo é a limpeza completa.
select
  (select count(*) from public.pacientes     where exemplo) as pacientes_exemplo_mantidos,
  (select count(*) from public.atendimentos  where exemplo) as atendimentos_exemplo_mantidos,
  (select count(*) from public.recebimentos  where exemplo) as recebimentos_exemplo_mantidos,
  (select count(*) from public.vendas        where exemplo) as vendas_exemplo_mantidas,
  (select count(*) from public.procedimentos where exemplo) as procedimentos_exemplo_mantidos,
  (select count(*) from public.profissionais where exemplo) as profissionais_exemplo_mantidos,
  (select count(*) from public.pacientes)                   as pacientes_no_total,
  (select count(*) from public.atendimentos)                as atendimentos_no_total;
