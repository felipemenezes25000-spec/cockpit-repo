-- =====================================================================
-- Remove os dados de exemplo
--
-- Rodar com: npm run dados:limpar
--
-- Apaga apenas o que foi marcado como exemplo. Nada cadastrado pela
-- clínica é tocado.
-- =====================================================================

delete from public.pendencias    where exemplo;
delete from public.retornos      where exemplo;
delete from public.recebimentos  where exemplo;
delete from public.despesas      where exemplo;
delete from public.atendimentos  where exemplo;
delete from public.pacientes     where exemplo;
delete from public.procedimentos where exemplo;
delete from public.profissionais where exemplo;

-- A auditoria guarda o rastro das inserções e remoções de exemplo. Como
-- não é registro clínico, sai junto para não poluir a trilha real.
delete from public.auditoria
 where tabela in ('pacientes', 'atendimentos', 'recebimentos')
   and (dados ->> 'exemplo')::boolean is true;

select
  (select count(*) from public.pacientes    where exemplo) as pacientes_exemplo,
  (select count(*) from public.atendimentos where exemplo) as atendimentos_exemplo,
  (select count(*) from public.pacientes)                  as pacientes_no_total,
  (select count(*) from public.atendimentos)               as atendimentos_no_total;
