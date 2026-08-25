-- =====================================================================
-- Dados de exemplo — TODOS FICTÍCIOS
--
-- Rodar com:  npm run dados:exemplo
-- Remover com: npm run dados:limpar
--
-- Nomes, telefones, valores e datas são inventados. Nenhum dado real da
-- clínica é usado aqui.
--
-- As datas são relativas a hoje, então a demonstração continua coerente
-- em qualquer dia que for carregada.
-- =====================================================================

do $$
declare
  ha_dado_real boolean;
begin
  select exists (
    select 1 from public.pacientes where not exemplo
    union all
    select 1 from public.atendimentos where not exemplo
    union all
    select 1 from public.recebimentos where not exemplo
  ) into ha_dado_real;

  if ha_dado_real then
    raise exception
      'A base já tem dados reais. Os dados de exemplo não foram carregados, para não misturar com o cadastro da clínica.';
  end if;
end $$;

-- "Hoje" é o dia no relógio da clínica. O banco roda em UTC, então perto da
-- meia-noite o dia do servidor e o de São Paulo divergem.
create or replace function pg_temp.hoje_sp() returns date
  language sql stable as $fn$ select (now() at time zone 'America/Sao_Paulo')::date $fn$;

-- Recarregar é idempotente: limpa o exemplo anterior antes de semear.
delete from public.pendencias    where exemplo;
delete from public.retornos      where exemplo;
delete from public.recebimentos  where exemplo;
delete from public.despesas      where exemplo;
delete from public.atendimentos  where exemplo;
delete from public.pacientes     where exemplo;
delete from public.procedimentos where exemplo;
delete from public.profissionais where exemplo;

-- ---------------------------------------------------------------------
-- Equipe
-- ---------------------------------------------------------------------

insert into public.profissionais (id, nome, especialidade, registro_conselho, exemplo) values
  ('a0000000-0000-4000-8000-000000000001','Dra. Érika Passos','Estética avançada','CRBM 00000', true),
  ('a0000000-0000-4000-8000-000000000002','Dra. Marina Rocha','Harmonização facial','CRBM 00001', true),
  ('a0000000-0000-4000-8000-000000000003','Camila Duarte','Estética corporal', null, true);

-- ---------------------------------------------------------------------
-- Catálogo. Valores e intervalos são demonstrativos, não a tabela real.
-- ---------------------------------------------------------------------

insert into public.procedimentos (id, nome, duracao_min, valor_padrao, retorno_sugerido_dias, exemplo) values
  ('b0000000-0000-4000-8000-000000000001','Toxina botulínica',        45, 1450, 150, true),
  ('b0000000-0000-4000-8000-000000000002','Preenchimento labial',     60, 2100, 300, true),
  ('b0000000-0000-4000-8000-000000000003','Skinbooster',              50, 1200, 120, true),
  ('b0000000-0000-4000-8000-000000000004','Limpeza de pele profunda', 60,  320,  45, true),
  ('b0000000-0000-4000-8000-000000000005','Microagulhamento',         50,  680,  30, true),
  ('b0000000-0000-4000-8000-000000000006','Peeling químico',          40,  540,  30, true),
  ('b0000000-0000-4000-8000-000000000007','Bioestimulador de colágeno',60,2600, 180, true),
  ('b0000000-0000-4000-8000-000000000008','Avaliação inicial',        30,    0,  15, true),
  ('b0000000-0000-4000-8000-000000000009','Drenagem linfática',       50,  260,  14, true);

-- ---------------------------------------------------------------------
-- Pacientes. Cinco fazem aniversário no mês corrente, para a tela ter
-- sempre o que mostrar.
-- ---------------------------------------------------------------------

insert into public.pacientes (id, nome, data_nascimento, telefone, exemplo) values
  ('c0000000-0000-4000-8000-000000000001','Aline Bastos',
     make_date(1988, extract(month from pg_temp.hoje_sp())::int, 4),  '(11) 90000-0001', true),
  ('c0000000-0000-4000-8000-000000000002','Beatriz Nogueira',
     make_date(1992, extract(month from pg_temp.hoje_sp())::int, 11), '(11) 90000-0002', true),
  ('c0000000-0000-4000-8000-000000000003','Carolina Meireles',
     make_date(1985, extract(month from pg_temp.hoje_sp())::int, 17), '(11) 90000-0003', true),
  ('c0000000-0000-4000-8000-000000000004','Daniela Prado',
     make_date(1990, extract(month from pg_temp.hoje_sp())::int, 23), '(11) 90000-0004', true),
  ('c0000000-0000-4000-8000-000000000005','Eduarda Lins',
     make_date(1979, extract(month from pg_temp.hoje_sp())::int, 28), '(11) 90000-0005', true),
  ('c0000000-0000-4000-8000-000000000006','Fernanda Quintela', date '1983-02-09','(11) 90000-0006', true),
  ('c0000000-0000-4000-8000-000000000007','Gabriela Sarmento', date '1995-03-14','(11) 90000-0007', true),
  ('c0000000-0000-4000-8000-000000000008','Helena Vasques',    date '1987-05-02','(11) 90000-0008', true),
  ('c0000000-0000-4000-8000-000000000009','Isabela Moretti',   date '1991-06-26','(11) 90000-0009', true),
  ('c0000000-0000-4000-8000-000000000010','Juliana Peçanha',   date '1998-08-30','(11) 90000-0010', true),
  ('c0000000-0000-4000-8000-000000000011','Larissa Andrade',   date '1986-09-06','(11) 90000-0011', true),
  ('c0000000-0000-4000-8000-000000000012','Mariana Coutinho',  date '1993-10-19','(11) 90000-0012', true),
  ('c0000000-0000-4000-8000-000000000013','Natália Ribas',     date '1989-11-12','(11) 90000-0013', true),
  ('c0000000-0000-4000-8000-000000000014','Otávia Bezerra',    date '1994-12-03','(11) 90000-0014', true),
  ('c0000000-0000-4000-8000-000000000015','Priscila Tavares',  date '1982-01-21','(11) 90000-0015', true),
  ('c0000000-0000-4000-8000-000000000016','Renata Vilaça',     date '1996-04-08','(11) 90000-0016', true);

-- ---------------------------------------------------------------------
-- Agenda de hoje. Cobre as sete situações previstas.
-- ---------------------------------------------------------------------

insert into public.atendimentos
  (paciente_id, profissional_id, procedimento_id, inicio, duracao_min, situacao, valor, exemplo)
values
  ('c0000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000008', ((pg_temp.hoje_sp() + time '08:30') at time zone 'America/Sao_Paulo'), 30, 'concluido',              0, true),
  ('c0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000004', ((pg_temp.hoje_sp() + time '09:30') at time zone 'America/Sao_Paulo'), 60, 'concluido',            320, true),
  ('c0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000007', ((pg_temp.hoje_sp() + time '10:45') at time zone 'America/Sao_Paulo'), 60, 'em_atendimento',      2600, true),
  ('c0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000003', ((pg_temp.hoje_sp() + time '12:00') at time zone 'America/Sao_Paulo'), 50, 'confirmado',          1200, true),
  ('c0000000-0000-4000-8000-000000000016','a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000006', ((pg_temp.hoje_sp() + time '13:30') at time zone 'America/Sao_Paulo'), 40, 'ausente',              540, true),
  ('c0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001', ((pg_temp.hoje_sp() + time '14:30') at time zone 'America/Sao_Paulo'), 45, 'confirmado',          1450, true),
  ('c0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000005', ((pg_temp.hoje_sp() + time '15:30') at time zone 'America/Sao_Paulo'), 50, 'aguardando_confirmacao', 680, true),
  ('c0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000009', ((pg_temp.hoje_sp() + time '16:30') at time zone 'America/Sao_Paulo'), 50, 'cancelado',            260, true),
  ('c0000000-0000-4000-8000-000000000014','a0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002', ((pg_temp.hoje_sp() + time '17:15') at time zone 'America/Sao_Paulo'), 60, 'aguardando_confirmacao',2100, true),
  ('c0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001', ((pg_temp.hoje_sp() + time '18:30') at time zone 'America/Sao_Paulo'), 45, 'agendado',            1450, true);

-- Alguns atendimentos passados, para a linha do tempo de cada paciente.
insert into public.atendimentos
  (paciente_id, profissional_id, procedimento_id, inicio, duracao_min, situacao, valor, exemplo)
select p.id,
       'a0000000-0000-4000-8000-000000000001',
       'b0000000-0000-4000-8000-000000000001',
       ((pg_temp.hoje_sp() - d.dias) + time '10:00') at time zone 'America/Sao_Paulo',
       45, 'concluido', 1450, true
  from (values
    ('c0000000-0000-4000-8000-000000000015'::uuid, 210),
    ('c0000000-0000-4000-8000-000000000007'::uuid, 190),
    ('c0000000-0000-4000-8000-000000000003'::uuid, 165),
    ('c0000000-0000-4000-8000-000000000009'::uuid, 133),
    ('c0000000-0000-4000-8000-000000000013'::uuid,  96),
    ('c0000000-0000-4000-8000-000000000005'::uuid,  52),
    ('c0000000-0000-4000-8000-000000000011'::uuid,  47)
  ) as d(paciente, dias)
  join public.pacientes p on p.id = d.paciente;

-- ---------------------------------------------------------------------
-- Retornos sugeridos. Prazos demonstrativos, não recomendação clínica.
-- ---------------------------------------------------------------------

insert into public.retornos (paciente_id, procedimento_id, sugerido_para, situacao, exemplo) values
  ('c0000000-0000-4000-8000-000000000015','b0000000-0000-4000-8000-000000000007', pg_temp.hoje_sp() -  30, 'nao_iniciado',        true),
  ('c0000000-0000-4000-8000-000000000007','b0000000-0000-4000-8000-000000000002', pg_temp.hoje_sp() + 110, 'aguardando_resposta', true),
  ('c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001', pg_temp.hoje_sp() -  15, 'em_contato',          true),
  ('c0000000-0000-4000-8000-000000000009','b0000000-0000-4000-8000-000000000003', pg_temp.hoje_sp() -  13, 'nao_iniciado',        true),
  ('c0000000-0000-4000-8000-000000000013','b0000000-0000-4000-8000-000000000001', pg_temp.hoje_sp() +  54, 'nao_iniciado',        true),
  ('c0000000-0000-4000-8000-000000000005','b0000000-0000-4000-8000-000000000005', pg_temp.hoje_sp() -  22, 'nao_iniciado',        true),
  ('c0000000-0000-4000-8000-000000000011','b0000000-0000-4000-8000-000000000009', pg_temp.hoje_sp() -  33, 'aguardando_resposta', true);

-- ---------------------------------------------------------------------
-- Pendências
-- ---------------------------------------------------------------------

insert into public.pendencias (tipo, paciente_id, descricao, prazo, prioridade, exemplo) values
  ('termo',       'c0000000-0000-4000-8000-000000000008','Termo de consentimento do bioestimulador aguardando assinatura', pg_temp.hoje_sp(),     'alta',  true),
  ('confirmacao', 'c0000000-0000-4000-8000-000000000012','Atendimento de hoje às 15:30 ainda sem confirmação',             pg_temp.hoje_sp(),'alta',  true),
  ('anamnese',    'c0000000-0000-4000-8000-000000000014','Anamnese não preenchida para o preenchimento labial',            pg_temp.hoje_sp(),'alta',  true),
  ('pagamento',   'c0000000-0000-4000-8000-000000000016','Parcela do peeling químico em aberto',                           pg_temp.hoje_sp() - 3, 'alta',  true),
  ('confirmacao', 'c0000000-0000-4000-8000-000000000011','Confirmar atendimento de amanhã às 18:30',                       pg_temp.hoje_sp() + 1, 'media', true),
  ('retorno',     'c0000000-0000-4000-8000-000000000003','Retorno da toxina botulínica precisa ser agendado',              pg_temp.hoje_sp() + 2, 'media', true),
  ('pagamento',   'c0000000-0000-4000-8000-000000000005','Saldo do microagulhamento combinado para esta semana',           pg_temp.hoje_sp() + 4, 'media', true),
  ('pesquisa',    'c0000000-0000-4000-8000-000000000004','Pesquisa de satisfação do skinbooster ainda não respondida',     pg_temp.hoje_sp() + 5, 'baixa', true),
  ('termo',       'c0000000-0000-4000-8000-000000000002','Orientações pós-procedimento não entregues',                     pg_temp.hoje_sp() + 7, 'baixa', true),
  ('pesquisa',    'c0000000-0000-4000-8000-000000000010','Pesquisa de satisfação da avaliação inicial',                    pg_temp.hoje_sp() + 9, 'baixa', true);

-- ---------------------------------------------------------------------
-- Financeiro do mês corrente. Os recebimentos quitados se espalham entre
-- o dia 1º e hoje, para o mês ter movimento em qualquer dia que rodar.
-- ---------------------------------------------------------------------

insert into public.recebimentos
  (paciente_id, descricao, valor, valor_recebido, forma, situacao, vencimento, recebido_em, exemplo)
select d.paciente, d.descricao, d.valor, d.valor, d.forma::public.forma_pagamento, 'recebido',
       greatest(date_trunc('month', pg_temp.hoje_sp())::date,
                pg_temp.hoje_sp() - (d.ordem * (extract(day from pg_temp.hoje_sp())::int - 1) / 13)),
       greatest(date_trunc('month', pg_temp.hoje_sp())::date,
                pg_temp.hoje_sp() - (d.ordem * (extract(day from pg_temp.hoje_sp())::int - 1) / 13)),
       true
  from (values
    ('c0000000-0000-4000-8000-000000000002'::uuid,'Limpeza de pele profunda',  320.00,'pix',      0),
    ('c0000000-0000-4000-8000-000000000004'::uuid,'Skinbooster',              1200.00,'credito',  1),
    ('c0000000-0000-4000-8000-000000000008'::uuid,'Bioestimulador',           2600.00,'credito',  2),
    ('c0000000-0000-4000-8000-000000000001'::uuid,'Toxina botulínica',        1450.00,'pix',      3),
    ('c0000000-0000-4000-8000-000000000006'::uuid,'Peeling químico',           540.00,'debito',   4),
    ('c0000000-0000-4000-8000-000000000013'::uuid,'Toxina botulínica',        1450.00,'credito',  5),
    ('c0000000-0000-4000-8000-000000000009'::uuid,'Skinbooster',              1200.00,'pix',      6),
    ('c0000000-0000-4000-8000-000000000014'::uuid,'Limpeza de pele profunda',  320.00,'dinheiro', 7),
    ('c0000000-0000-4000-8000-000000000011'::uuid,'Drenagem linfática',        260.00,'pix',      8),
    ('c0000000-0000-4000-8000-000000000012'::uuid,'Microagulhamento',          680.00,'credito',  9),
    ('c0000000-0000-4000-8000-000000000016'::uuid,'Peeling químico',           540.00,'pix',     10),
    ('c0000000-0000-4000-8000-000000000005'::uuid,'Microagulhamento',          680.00,'debito',  11),
    ('c0000000-0000-4000-8000-000000000007'::uuid,'Preenchimento labial',     2100.00,'credito', 12)
  ) as d(paciente, descricao, valor, forma, ordem);

insert into public.recebimentos
  (paciente_id, descricao, valor, forma, situacao, vencimento, exemplo) values
  ('c0000000-0000-4000-8000-000000000016','Peeling químico — 2ª parcela',      270.00,'pix',    'previsto', pg_temp.hoje_sp() - 3,  true),
  ('c0000000-0000-4000-8000-000000000005','Microagulhamento — saldo',          340.00,'pix',    'previsto', pg_temp.hoje_sp() + 4,  true),
  ('c0000000-0000-4000-8000-000000000003','Toxina botulínica — 2ª parcela',    725.00,'credito','previsto', pg_temp.hoje_sp() + 9,  true),
  ('c0000000-0000-4000-8000-000000000015','Bioestimulador — 2ª parcela',      1300.00,'credito','previsto', pg_temp.hoje_sp() + 14, true),
  ('c0000000-0000-4000-8000-000000000001','Toxina botulínica — 2ª parcela',    725.00,'credito','previsto', pg_temp.hoje_sp() + 21, true);

insert into public.despesas (descricao, categoria, valor, competencia, vencimento, pago_em, situacao, exemplo)
select d.descricao, d.categoria::public.categoria_despesa, d.valor,
       date_trunc('month', pg_temp.hoje_sp())::date,
       date_trunc('month', pg_temp.hoje_sp())::date + d.vence_dia,
       case when d.paga then date_trunc('month', pg_temp.hoje_sp())::date + d.vence_dia else null end,
       case when d.paga then 'paga' else 'pendente' end::public.situacao_despesa,
       true
  from (values
    -- Uma pendente com vencimento passado aparece como vencida — de propósito,
    -- para a tela de despesas mostrar os três estados.
    ('Reposição de toxina e preenchedores', 'produtos',  4820.00, 0,  true),
    ('Aluguel da sala',                     'estrutura', 3200.00, 4,  true),
    ('Equipe de apoio',                     'equipe',    2900.00, 4,  true),
    ('Descartáveis e higienização',         'produtos',   760.00, 2,  false),
    ('Gestão de redes sociais',             'marketing', 1100.00, 9,  true),
    ('Energia, água e internet',            'estrutura',  690.00, 24, false),
    ('Impostos do mês',                     'impostos',  1840.00, 19, false)
  ) as d(descricao, categoria, valor, vence_dia, paga);

-- Recebimentos dos cinco meses anteriores, para o gráfico ter história.
insert into public.recebimentos
  (paciente_id, descricao, valor, valor_recebido, forma, situacao, vencimento, recebido_em, exemplo)
select 'c0000000-0000-4000-8000-000000000001', 'Faturamento do mês (exemplo)',
       h.valor, h.valor, 'pix', 'recebido',
       (date_trunc('month', pg_temp.hoje_sp()) - (h.meses || ' months')::interval)::date + 14,
       (date_trunc('month', pg_temp.hoje_sp()) - (h.meses || ' months')::interval)::date + 14,
       true
  from (values (5, 21400.00), (4, 24950.00), (3, 19800.00), (2, 27300.00), (1, 25150.00))
    as h(meses, valor);

select
  (select count(*) from public.pacientes    where exemplo) as pacientes,
  (select count(*) from public.atendimentos where exemplo) as atendimentos,
  (select count(*) from public.pendencias   where exemplo) as pendencias,
  (select count(*) from public.retornos     where exemplo) as retornos,
  (select count(*) from public.recebimentos where exemplo) as recebimentos,
  (select count(*) from public.despesas     where exemplo) as despesas;
