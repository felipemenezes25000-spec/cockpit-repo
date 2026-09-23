-- =====================================================================
-- Testes do banco: permissões por perfil e regras que o banco garante
--
-- Rodar SÓ no Supabase local:   npm run test:banco
--
-- Tudo acontece numa transação que termina em ROLLBACK: nada do que os
-- testes criam fica no banco. Cada teste troca de papel como a API troca —
-- `role` = authenticated/anon e `request.jwt.claims` com o id do usuário —,
-- então `auth.uid()`, a RLS e os grants valem exatamente como valeriam
-- numa requisição de verdade.
--
-- Precisa das três contas de `supabase/usuarios-locais.json`
-- (`npm run local:usuarios`) e dos dados de exemplo (seed do `db reset`).
--
-- Se algum teste falhar, o último comando levanta exceção e a saída do
-- comando é diferente de zero.
-- =====================================================================

begin;

create schema testes;
grant usage on schema testes to authenticated, anon;

create table testes.resultado (
  n serial primary key,
  nome text not null,
  ok boolean not null,
  detalhe text
);
grant select, insert on testes.resultado to authenticated, anon;
grant usage on sequence testes.resultado_n_seq to authenticated, anon;

-- Estado compartilhado entre os passos (ids criados no caminho).
create table testes.valor (chave text primary key, valor text);
grant select, insert, update on testes.valor to authenticated, anon;

create function testes.guardar(p_chave text, p_valor text) returns void
language sql as $$
  insert into testes.valor values (p_chave, p_valor)
  on conflict (chave) do update set valor = excluded.valor;
$$;

create function testes.lido(p_chave text) returns text
language sql stable as $$ select valor from testes.valor where chave = p_chave $$;

-- Assume a identidade de uma conta (ou do visitante anônimo, com nulo).
create function testes.como(p_email text) returns void
language plpgsql as $$
declare
  v_id uuid;
begin
  perform set_config('role', 'postgres', true);
  if p_email is null then
    perform set_config('request.jwt.claims', '{"role":"anon"}', true);
    perform set_config('role', 'anon', true);
    return;
  end if;
  select id into strict v_id from auth.users where email = p_email;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function testes.registrar(p_nome text, p_ok boolean, p_detalhe text) returns void
language sql as $$ insert into testes.resultado (nome, ok, detalhe) values (p_nome, p_ok, p_detalhe) $$;

-- O comando precisa falhar — com o código dado, quando informado.
create function testes.falha(p_nome text, p_sql text, p_codigo text default null) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    perform testes.registrar(p_nome, p_codigo is null or sqlstate = p_codigo, sqlstate || ': ' || sqlerrm);
    return;
  end;
  perform testes.registrar(p_nome, false, 'passou, mas devia ter sido recusado');
end;
$$;

-- O comando precisa passar e afetar/devolver exatamente N linhas.
create function testes.linhas(p_nome text, p_sql text, p_esperado integer) returns void
language plpgsql as $$
declare
  v_n integer;
begin
  begin
    execute p_sql;
    get diagnostics v_n = row_count;
    perform testes.registrar(p_nome, v_n = p_esperado, 'linhas: ' || v_n || ', esperado: ' || p_esperado);
  exception when others then
    perform testes.registrar(p_nome, false, sqlstate || ': ' || sqlerrm);
  end;
end;
$$;

-- A expressão precisa valer o texto esperado.
create function testes.igual(p_nome text, p_sql text, p_esperado text) returns void
language plpgsql as $$
declare
  v_valor text;
begin
  begin
    execute p_sql into v_valor;
    perform testes.registrar(p_nome, v_valor is not distinct from p_esperado,
      'valor: ' || coalesce(v_valor, 'nulo') || ', esperado: ' || coalesce(p_esperado, 'nulo'));
  exception when others then
    perform testes.registrar(p_nome, false, sqlstate || ': ' || sqlerrm);
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Visitante anônimo
-- ---------------------------------------------------------------------

select testes.como(null);
select testes.falha('anon não lê pacientes', 'select * from public.pacientes', '42501');
select testes.falha('anon não lê documento_links', 'select * from public.documento_links', '42501');
select testes.falha('anon não lê vendas', 'select * from public.vendas', '42501');
select testes.igual('anon consulta estado de link inexistente',
  $q$ select situacao from public.documento_link_estado('x') $q$, 'nao_encontrado');
select testes.falha('anon não chama venda_registrar',
  $q$ select public.venda_registrar(null,null,null,0,0,'pix',1,null,0,0,false,null,null,'previsto',null,null,null) $q$, '42501');

-- ---------------------------------------------------------------------
-- Administradora prepara o que os outros testes usam
-- ---------------------------------------------------------------------

select testes.como('admin@cockpit.local');

select testes.linhas('administradora cria taxa de crédito 3x',
  $q$ insert into public.taxas_cartao (operadora, tipo, parcelas, percentual)
      values ('Teste', 'credito', 3, 6.50) $q$, 1);
select testes.guardar('taxa_credito_3x',
  (select id::text from public.taxas_cartao where operadora = 'Teste' and parcelas = 3));

select testes.falha('administradora não apaga taxa',
  $q$ delete from public.taxas_cartao where operadora = 'Teste' $q$, '42501');

select testes.guardar('modelo_contrato', public.modelo_documento_criar(
  'contrato', 'Contrato de teste', '', 'Texto do contrato de teste.', '[]'::jsonb)::text);
select testes.guardar('modelo_anamnese', public.modelo_documento_criar(
  'anamnese', 'Anamnese de teste', '', 'Responda com atenção.',
  '[{"chave":"alergia","rotulo":"Tem alergia?","tipo":"sim_nao","obrigatorio":true,"ajuda":"","opcoes":[]},
    {"chave":"quando","rotulo":"Data do último procedimento","tipo":"data","obrigatorio":false,"ajuda":"","opcoes":[]},
    {"chave":"areas","rotulo":"Áreas","tipo":"escolha_multipla","obrigatorio":false,"ajuda":"","opcoes":["Rosto","Pescoço"]}]'::jsonb)::text);

select testes.falha('modelo com pergunta sem tipo é recusado',
  $q$ select public.modelo_documento_criar('anamnese', 'Ruim', '', 'Texto.',
        '[{"chave":"x","rotulo":"Sem tipo"}]'::jsonb) $q$);
select testes.falha('modelo com alternativa que não é texto é recusado',
  $q$ select public.modelo_documento_criar('anamnese', 'Ruim', '', 'Texto.',
        '[{"chave":"x","rotulo":"R","tipo":"escolha_unica","opcoes":[1,2]}]'::jsonb) $q$);
-- O teto de perguntas é o mesmo de `validarCampos` (lib/documento.ts).
select testes.igual('modelo com 120 perguntas é aceito',
  $q$ select (public.modelo_documento_criar('anamnese', 'Longa', '', 'Texto.',
        (select jsonb_agg(jsonb_build_object('chave', 'p' || i, 'rotulo', 'Pergunta ' || i, 'tipo', 'texto'))
           from generate_series(1, 120) i)) is not null)::text $q$, 'true');
select testes.falha('modelo com 121 perguntas é recusado',
  $q$ select public.modelo_documento_criar('anamnese', 'Longa demais', '', 'Texto.',
        (select jsonb_agg(jsonb_build_object('chave', 'p' || i, 'rotulo', 'Pergunta ' || i, 'tipo', 'texto'))
           from generate_series(1, 121) i)) $q$);

-- ---------------------------------------------------------------------
-- Recepção
-- ---------------------------------------------------------------------

select testes.como('recepcao@cockpit.local');

select testes.igual('recepção lê pacientes',
  $q$ select (count(*) > 0)::text from public.pacientes $q$, 'true');
select testes.falha('recepção não apaga paciente',
  $q$ delete from public.pacientes where id = 'c0000000-0000-4000-8000-000000000001' $q$, '42501');
select testes.falha('recepção não apaga atendimento',
  $q$ delete from public.atendimentos where paciente_id = 'c0000000-0000-4000-8000-000000000001' $q$, '42501');
select testes.falha('recepção não apaga tarefa de contato',
  $q$ delete from public.pendencias $q$, '42501');
select testes.linhas('recepção não vê despesas',
  $q$ select * from public.despesas $q$, 0);
select testes.linhas('recepção não vê auditoria',
  $q$ select * from public.auditoria $q$, 0);
select testes.linhas('recepção não altera recebimento',
  $q$ update public.recebimentos set descricao = 'alterado' $q$, 0);
select testes.falha('recepção não insere recebimento solto',
  $q$ insert into public.recebimentos (paciente_id, valor, vencimento, situacao, recebido_em, valor_recebido)
      values ('c0000000-0000-4000-8000-000000000001', 100, current_date, 'recebido', current_date, 100) $q$, '42501');
select testes.falha('recepção não se desativa pela API',
  $q$ update public.perfis set ativo = false where id = auth.uid() $q$, '42501');
select testes.falha('recepção não se promove',
  $q$ update public.perfis set papel = 'administradora' where id = auth.uid() $q$, '42501');
select testes.linhas('recepção muda o próprio nome',
  $q$ update public.perfis set nome = 'Recepção Renomeada' where id = auth.uid() $q$, 1);
select testes.falha('recepção não cria taxa',
  $q$ insert into public.taxas_cartao (operadora, tipo, parcelas, percentual) values ('X', 'debito', 1, 1) $q$, '42501');

-- Venda: a origem da taxa é conferida.
select testes.guardar('venda_pix', public.venda_registrar(
  'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', current_date,
  500, 0, 'pix', 1, null, 0, 0, false, null, null, 'previsto', current_date + 7, null, 'Teste PIX')::text);
select testes.igual('venda PIX gera um recebimento previsto',
  $q$ select situacao::text || ':' || valor || ':' || taxa_valor from public.recebimentos where venda_id = testes.lido('venda_pix')::uuid $q$,
  'previsto:500.00:0.00');

select testes.falha('recepção não registra crédito sem taxa da tabela',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        1000,0,'credito',3,null,0,0,false,null,null,'previsto',current_date,null,null) $q$, 'P0001');
select testes.falha('recepção não registra crédito com percentual diferente da tabela',
  format($q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        1000,0,'credito',3,%L,0,0,false,null,null,'previsto',current_date,null,null) $q$, testes.lido('taxa_credito_3x')), 'P0001');
select testes.falha('recepção não registra taxa manual',
  format($q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        1000,0,'credito',3,%L,1,10,true,'porque sim',null,'previsto',current_date,null,null) $q$, testes.lido('taxa_credito_3x')), 'P0001');
select testes.falha('venda em PIX não aceita taxa',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        1000,0,'pix',1,null,1,10,false,null,null,'previsto',current_date,null,null) $q$, 'P0001');
select testes.falha('débito não parcela',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        1000,0,'debito',2,null,0,0,false,null,null,'previsto',current_date,null,null) $q$, 'P0001');
select testes.falha('valor da taxa que não confere é recusado',
  format($q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        1000,0,'credito',3,%L,6.50,60,false,null,null,'previsto',current_date,null,null) $q$, testes.lido('taxa_credito_3x')), 'P0001');

select testes.guardar('venda_credito', public.venda_registrar(
  'c0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000001', current_date,
  1000.01, 0, 'credito', 3, testes.lido('taxa_credito_3x')::uuid, 6.50, 65.00, false, null, null,
  'previsto', current_date + 30, null, 'Teste crédito')::text);
select testes.igual('crédito 3x a 6,5% de R$ 1.000,01: taxa R$ 65,00 e líquido R$ 935,01',
  $q$ select taxa_valor || ':' || valor_liquido from public.vendas where id = testes.lido('venda_credito')::uuid $q$,
  '65.00:935.01');

select testes.guardar('venda_balcao', public.venda_registrar(
  'c0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000002', current_date,
  300, 20, 'dinheiro', 1, null, 0, 0, false, null, null, 'recebido', null, current_date, null)::text);
select testes.igual('venda já recebida no balcão entra recebida pelo líquido',
  $q$ select situacao::text || ':' || valor_recebido from public.recebimentos where venda_id = testes.lido('venda_balcao')::uuid $q$,
  'recebido:280.00');

select testes.falha('recepção não insere venda com taxa manual pela API',
  format($q$ insert into public.vendas (paciente_id, procedimento_id, data_venda, valor_original, desconto, valor_final,
        forma, parcelas, taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido, taxa_manual, taxa_justificativa)
      values ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,1000,0,1000,
        'credito',3,%L,0,0,1000,true,'sem taxa') $q$, testes.lido('taxa_credito_3x')), 'P0001');
select testes.falha('recepção não altera venda',
  format($q$ select public.venda_alterar_pagamento(%L, 'forma_pagamento', 'pix', 1, null, 0, 0, false, 'teste') $q$,
    testes.lido('venda_credito')), '42501');

-- Agenda: choque recusado pelo banco.
select testes.guardar('prof', 'a0000000-0000-4000-8000-000000000001');
select testes.falha('choque de horário recusado pelo banco',
  $q$ insert into public.atendimentos (paciente_id, profissional_id, procedimento_id, inicio, duracao_min)
      select 'c0000000-0000-4000-8000-000000000004', profissional_id, procedimento_id, inicio + interval '10 minutes', 30
        from public.atendimentos
       where profissional_id = 'a0000000-0000-4000-8000-000000000001' and situacao not in ('cancelado','ausente')
       order by inicio limit 1 $q$, '23P01');
select testes.linhas('horário livre é marcado',
  $q$ insert into public.atendimentos (paciente_id, profissional_id, procedimento_id, inicio, duracao_min)
      values ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001',
              'b0000000-0000-4000-8000-000000000001', (current_date + 400) + time '10:00', 30) $q$, 1);
select testes.linhas('vaga de atendimento cancelado é reaproveitada',
  $q$ insert into public.atendimentos (paciente_id, profissional_id, procedimento_id, inicio, duracao_min)
      select 'c0000000-0000-4000-8000-000000000005', profissional_id, procedimento_id, inicio, duracao_min
        from public.atendimentos where situacao = 'cancelado' order by inicio limit 1 $q$, 1);
select testes.falha('reabrir cancelado com a vaga ocupada é recusado',
  $q$ update public.atendimentos set situacao = 'agendado'
       where id = (select id from public.atendimentos where situacao = 'cancelado' order by inicio limit 1) $q$, '23P01');

-- Documentos: emitir pela função; falsificar pela API não passa.
select testes.guardar('contrato', public.documento_emitir(
  'c0000000-0000-4000-8000-000000000001', testes.lido('modelo_contrato')::uuid, 'Contrato', null)::text);
select testes.falha('recepção não inventa documento pela API',
  format($q$ insert into public.documentos (paciente_id, modelo_id, modelo_versao, tipo, titulo, corpo_congelado, situacao)
      values ('c0000000-0000-4000-8000-000000000001', %L, 1, 'contrato', 'Falso', 'Texto inventado', 'assinado') $q$,
    testes.lido('modelo_contrato')), 'P0001');
select testes.falha('recepção não troca a paciente de um documento',
  format($q$ update public.documentos set paciente_id = 'c0000000-0000-4000-8000-000000000002' where id = %L $q$,
    testes.lido('contrato')), '42501');
select testes.falha('documento não passa a assinado sem assinatura',
  format($q$ update public.documentos set situacao = 'assinado' where id = %L $q$, testes.lido('contrato')), 'P0001');
select testes.falha('recepção não emite anamnese',
  format($q$ select public.documento_emitir('c0000000-0000-4000-8000-000000000001', %L, 'Anamnese', null) $q$,
    testes.lido('modelo_anamnese')), 'P0001');

-- Assinatura gravada direto: a evidência é a do banco, e o documento fecha.
select testes.linhas('assinatura pela API vira assinatura de balcão',
  format($q$ insert into public.documento_assinaturas (documento_id, nome_informado, hash_assinado, verificacao_identidade,
        canal, operador_id, assinado_em)
      values (%L, 'Aline Bastos', 'hash-falso', 'Documento com foto conferido', 'link', null, now() - interval '1 year') $q$,
    testes.lido('contrato')), 1);
select testes.igual('evidência escrita pelo banco',
  format($q$ select a.canal || ':' || (a.hash_assinado = d.corpo_hash) || ':' || (a.operador_id = auth.uid())
        || ':' || (a.assinado_em > now() - interval '1 minute') || ':' || d.situacao
      from public.documento_assinaturas a join public.documentos d on d.id = a.documento_id where d.id = %L $q$,
    testes.lido('contrato')), 'balcao:true:true:true:assinado');
select testes.falha('documento assinado não se cancela',
  format($q$ update public.documentos set situacao = 'cancelado', motivo_cancelamento = 'teste de cancelamento' where id = %L $q$,
    testes.lido('contrato')), 'P0001');

-- Link: contagem de tentativas e bloqueio.
select testes.guardar('contrato_link', public.documento_emitir(
  'c0000000-0000-4000-8000-000000000002', testes.lido('modelo_contrato')::uuid, 'Contrato por link', null)::text);
select public.documento_link_criar(testes.lido('contrato_link')::uuid,
  'tokenDeTesteComQuarentaETresCaracteres_abcd', 7, '');
select testes.falha('link não aceita token fora do formato',
  format($q$ select public.documento_link_criar(%L, 'curto', 7, '') $q$, testes.lido('contrato_link')), 'P0001');
select testes.falha('recepção não reescreve o token do link',
  $q$ update public.documento_links set token_hash = repeat('0', 64) $q$, '42501');

-- ---------------------------------------------------------------------
-- Visitante com o link
-- ---------------------------------------------------------------------

select testes.como(null);

select testes.igual('estado do link antes da data',
  $q$ select situacao || ':' || tipo from public.documento_link_estado('tokenDeTesteComQuarentaETresCaracteres_abcd') $q$,
  'ok:contrato');
select testes.igual('data errada é contada',
  $q$ select situacao from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', '2000-01-01') $q$,
  'data_incorreta');
select testes.igual('data errada não revela o texto',
  $q$ select coalesce(corpo, 'sem corpo') from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', '2000-01-02') $q$,
  'sem corpo');
select testes.igual('data certa abre o documento',
  $q$ select situacao || ':' || corpo from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', '1992-09-11') $q$,
  'ok:Texto do contrato de teste.');
select testes.igual('assinar pelo link',
  $q$ select public.documento_assinar_por_link('tokenDeTesteComQuarentaETresCaracteres_abcd', '1992-09-11',
        'Beatriz Nogueira', null, 'isto não é um ip', 'Navegador de teste') $q$, 'ok');
select testes.igual('segunda assinatura devolve ja_assinado',
  $q$ select public.documento_assinar_por_link('tokenDeTesteComQuarentaETresCaracteres_abcd', '1992-09-11',
        'Beatriz Nogueira', null, null, null) $q$, 'ja_assinado');

do $$
begin
  for i in 1..10 loop
    perform * from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', '2000-01-01');
  end loop;
end $$;
select testes.igual('décima tentativa errada bloqueia o link',
  $q$ select situacao from public.documento_link_estado('tokenDeTesteComQuarentaETresCaracteres_abcd') $q$, 'bloqueado');
select testes.igual('bloqueado não abre nem com a data certa',
  $q$ select situacao from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', '1992-09-11') $q$,
  'bloqueado');

-- ---------------------------------------------------------------------
-- Financeiro
-- ---------------------------------------------------------------------

select testes.como('financeiro@cockpit.local');

select testes.linhas('financeiro confirma recebimento previsto',
  $q$ update public.recebimentos set situacao = 'recebido', recebido_em = current_date, valor_recebido = 500
       where venda_id = testes.lido('venda_pix')::uuid and situacao = 'previsto' $q$, 1);
select testes.falha('recebimento confirmado não se reescreve',
  $q$ update public.recebimentos set valor_recebido = 1 where venda_id = testes.lido('venda_pix')::uuid $q$, 'P0001');
select testes.falha('financeiro não apaga despesa',
  $q$ delete from public.despesas $q$, '42501');
select testes.falha('financeiro não apaga recebimento',
  $q$ delete from public.recebimentos $q$, '42501');
select testes.falha('taxa manual em venda de PIX é recusada',
  format($q$ select public.venda_alterar_pagamento(%L, 'taxa_manual', 'pix', 1, null, 1, 5, true, 'teste') $q$,
    testes.lido('venda_pix')), 'P0001');
select testes.linhas('financeiro altera taxa de venda no cartão, com histórico',
  format($q$ select public.venda_alterar_pagamento(%L, 'taxa_manual', 'credito', 3, %L, 5.00, 50.00, true, 'negociado com a operadora') $q$,
    testes.lido('venda_credito'), testes.lido('taxa_credito_3x')), 1);
select testes.igual('alteração entrou no histórico e reescreveu o previsto',
  format($q$ select (select count(*) from public.venda_alteracoes where venda_id = %1$L) || ':' ||
        (select taxa_valor from public.recebimentos where venda_id = %1$L) $q$, testes.lido('venda_credito')),
  '1:50.00');
select testes.linhas('financeiro vê despesas',
  $q$ select * from public.despesas where exemplo $q$, 7);

-- ---------------------------------------------------------------------
-- Administradora: anamnese, prontuário
-- ---------------------------------------------------------------------

select testes.como('admin@cockpit.local');

select testes.guardar('anamnese', public.documento_emitir(
  'c0000000-0000-4000-8000-000000000003', testes.lido('modelo_anamnese')::uuid, 'Anamnese', null)::text);
select testes.igual('anamnese nasce com as perguntas do modelo',
  format($q$ select count(*)::text from public.documento_campos where documento_id = %L $q$, testes.lido('anamnese')), '3');
select testes.falha('pergunta congelada não muda',
  format($q$ update public.documento_campos set rotulo = 'Outra pergunta' where documento_id = %L $q$, testes.lido('anamnese')),
  '42501');
select testes.falha('resposta inválida é recusada inteira',
  format($q$ select public.documento_campos_responder(%L, '{"alergia":"sim","quando":"2026-02-31"}'::jsonb) $q$,
    testes.lido('anamnese')), 'P0001');
select testes.igual('nada da resposta inválida foi gravado',
  format($q$ select count(*)::text from public.documento_campos where documento_id = %L and resposta is not null $q$,
    testes.lido('anamnese')), '0');
select testes.linhas('resposta válida é gravada',
  format($q$ select public.documento_campos_responder(%L, '{"alergia":"nao","areas":["Rosto"]}'::jsonb) $q$,
    testes.lido('anamnese')), 1);
select testes.falha('anamnese não se assina no balcão',
  format($q$ select public.documento_assinar(%L, 'Carolina Meireles', null, 'Documento conferido', null, null) $q$,
    testes.lido('anamnese')), 'P0001');
select testes.linhas('anamnese cancelada',
  format($q$ update public.documentos set situacao = 'cancelado', motivo_cancelamento = 'emitida por engano' where id = %L $q$,
    testes.lido('anamnese')), 1);
select testes.falha('anamnese cancelada não aceita resposta',
  format($q$ select public.documento_campos_responder(%L, '{"alergia":"sim"}'::jsonb) $q$, testes.lido('anamnese')), 'P0001');
select testes.falha('documento cancelado não volta',
  format($q$ update public.documentos set situacao = 'emitido', motivo_cancelamento = '' where id = %L $q$,
    testes.lido('anamnese')), 'P0001');

select testes.guardar('prontuario', public.prontuario_registrar(
  'c0000000-0000-4000-8000-000000000001', null, current_date, 'Avaliação de teste',
  'Queixa de teste', '', '', '', '', '')::text);
select testes.falha('prontuário não troca de paciente',
  format($q$ update public.prontuarios set paciente_id = 'c0000000-0000-4000-8000-000000000002' where id = %L $q$,
    testes.lido('prontuario')), '42501');
select testes.falha('versão fora de sequência é recusada',
  format($q$ insert into public.prontuario_versoes (prontuario_id, versao, motivo, queixa) values (%L, 7, 'teste', 'x') $q$,
    testes.lido('prontuario')), 'P0001');
select testes.linhas('nova versão pela função',
  format($q$ select public.prontuario_nova_versao(%L, null, current_date, 'Avaliação de teste', 'corrigir queixa',
        'Queixa corrigida', '', '', '', '', '') $q$, testes.lido('prontuario')), 1);
select testes.falha('versão de prontuário não se altera',
  format($q$ update public.prontuario_versoes set queixa = 'reescrita' where prontuario_id = %L $q$, testes.lido('prontuario')),
  '42501');

select testes.como('recepcao@cockpit.local');
select testes.linhas('recepção não vê prontuário',
  $q$ select * from public.prontuarios $q$, 0);
select testes.linhas('recepção não vê anamnese',
  format($q$ select * from public.documentos where id = %L $q$, testes.lido('anamnese')), 0);

-- ---------------------------------------------------------------------
-- Resultado
-- ---------------------------------------------------------------------

select testes.como(null);
select set_config('role', 'postgres', true);

select n as "#", case when ok then 'ok' else 'FALHOU' end as resultado, nome, detalhe
  from testes.resultado
 order by n;

do $$
declare
  v_falhas integer;
  v_total integer;
begin
  select count(*) filter (where not ok), count(*) into v_falhas, v_total from testes.resultado;
  if v_falhas > 0 then
    raise exception '% de % testes do banco falharam.', v_falhas, v_total;
  end if;
  raise notice 'Todos os % testes do banco passaram.', v_total;
end $$;

rollback;
