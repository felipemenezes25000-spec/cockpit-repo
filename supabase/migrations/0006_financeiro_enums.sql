-- =====================================================================
-- Migração 0006: enums do módulo Financeiro
--
-- Só a cirurgia de enums. O Postgres não deixa USAR um valor novo de
-- enum na mesma transação que o cria, e cada migração roda em uma
-- transação — por isso as tabelas e políticas ficam na 0007.
-- =====================================================================

-- Formas de pagamento que a clínica aceita e ainda não existiam.
alter type public.forma_pagamento add value if not exists 'boleto';
alter type public.forma_pagamento add value if not exists 'outra';

-- Terceiro perfil de acesso: opera o financeiro sem ser administradora.
-- Registra recebimentos e despesas e altera taxa com justificativa.
alter type public.papel_usuario add value if not exists 'financeiro';

-- Situações do recebimento. "em_aberto" vira "previsto" — o rename é só
-- metadado, as linhas existentes seguem juntas. "pendente" é o previsto
-- que passou do prazo sem chegar; "recebido_divergencia" é o que chegou
-- com valor diferente do previsto.
alter type public.situacao_recebimento rename value 'em_aberto' to 'previsto';
alter type public.situacao_recebimento add value if not exists 'pendente';
alter type public.situacao_recebimento add value if not exists 'recebido_divergencia';

-- Tipo da transação de cartão na tabela de taxas.
create type public.tipo_cartao as enum ('debito', 'credito');

-- Situação da despesa. "Vencida" não é estado gravado: é uma despesa
-- pendente com vencimento no passado, derivada na leitura — estado
-- gravado envelheceria errado à meia-noite.
create type public.situacao_despesa as enum ('pendente', 'paga', 'cancelada');
