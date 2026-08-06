-- =====================================================================
-- Migração 0005: marcação de dados de exemplo
--
-- Enquanto a clínica não cadastra os dados reais, é útil poder carregar um
-- conjunto fictício para demonstrar o sistema. Sem uma marca, esses
-- registros ficariam indistinguíveis dos verdadeiros.
--
-- A coluna `exemplo` resolve três coisas:
--   1. `npm run dados:limpar` apaga só o que foi semeado.
--   2. A interface avisa, de forma permanente, quando há dado fictício
--      em tela.
--   3. A semeadura se recusa a rodar se já houver dado real.
--
-- O padrão é `false`: nada cadastrado pela clínica nasce como exemplo.
-- =====================================================================

alter table public.pacientes     add column exemplo boolean not null default false;
alter table public.profissionais add column exemplo boolean not null default false;
alter table public.procedimentos add column exemplo boolean not null default false;
alter table public.atendimentos  add column exemplo boolean not null default false;
alter table public.retornos      add column exemplo boolean not null default false;
alter table public.pendencias    add column exemplo boolean not null default false;
alter table public.recebimentos  add column exemplo boolean not null default false;
alter table public.despesas      add column exemplo boolean not null default false;

comment on column public.pacientes.exemplo is
  'Registro fictício carregado para demonstração. Removido por npm run dados:limpar.';

-- Índices parciais: as consultas de rotina perguntam "existe algum exemplo?"
-- e a limpeza busca exatamente esse conjunto.
create index pacientes_exemplo     on public.pacientes (id)     where exemplo;
create index atendimentos_exemplo  on public.atendimentos (id)  where exemplo;
create index recebimentos_exemplo  on public.recebimentos (id)  where exemplo;
create index despesas_exemplo      on public.despesas (id)      where exemplo;
