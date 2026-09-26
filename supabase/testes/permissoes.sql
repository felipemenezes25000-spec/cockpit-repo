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

-- O banco confere "não pode estar no futuro" pelo dia de São Paulo; o
-- `current_date` dos testes precisa ser esse mesmo dia, senão entre 21h e
-- meia-noite (já amanhã em UTC) toda data de hoje vira futuro.
set local time zone 'America/Sao_Paulo';

create schema testes;
grant usage on schema testes to authenticated, anon, service_role;

create table testes.resultado (
  n serial primary key,
  nome text not null,
  ok boolean not null,
  detalhe text
);
grant select, insert on testes.resultado to authenticated, anon, service_role;
grant usage on sequence testes.resultado_n_seq to authenticated, anon, service_role;

-- Estado compartilhado entre os passos (ids criados no caminho).
create table testes.valor (chave text primary key, valor text);
grant select, insert, update on testes.valor to authenticated, anon, service_role;

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

-- A superfície anônima é a das quatro funções do link, e só ela (§9). Pega a
-- função nova criada sem `revoke ... from public` e o drop + create que
-- esquecer de refazer o EXECUTE (como o da 0027).
select testes.igual('anon executa só as quatro funções do link',
  $q$ select string_agg(n.nspname || '.' || p.proname, ',' order by n.nspname, p.proname)
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute') $q$,
  'public.documento_assinar_por_link,public.documento_link_estado,public.documento_para_assinatura,public.documento_responder_por_link');
select testes.igual('nenhuma função de gatilho é executável pela API',
  $q$ select count(*)::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prorettype = 'trigger'::regtype
       and (has_function_privilege('anon', p.oid, 'execute')
            or has_function_privilege('authenticated', p.oid, 'execute')) $q$, '0');
select testes.igual('a sessão ainda abre a via pelo link',
  $q$ select has_function_privilege('authenticated', 'public.documento_para_assinatura(text,date)', 'execute')::text $q$,
  'true');

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

-- 0027: versão de modelo pela API é conferida como a da função.
select testes.guardar('modelo_versoes', public.modelo_documento_criar(
  'termo', 'Termo de versões', '', 'Texto da versão 1.', '[]'::jsonb)::text);
select testes.falha('versão de modelo fora de sequência é recusada',
  format($q$ insert into public.modelo_documento_versoes (modelo_id, versao, corpo, motivo)
      values (%L, 99, 'Versão pulada.', 'teste de sequência') $q$, testes.lido('modelo_versoes')), 'P0001');
select testes.falha('versão de modelo com pergunta sem tipo é recusada',
  format($q$ insert into public.modelo_documento_versoes (modelo_id, versao, corpo, motivo, campos)
      values (%L, 2, 'Texto.', 'teste de pergunta', '[{"chave":"x","rotulo":"Sem tipo"}]'::jsonb) $q$,
    testes.lido('modelo_versoes')), 'P0001');
select testes.linhas('versão de modelo pela API, na sequência',
  format($q$ insert into public.modelo_documento_versoes (modelo_id, versao, corpo, motivo, criado_por, criado_em)
      values (%L, 2, 'Texto da versão 2.', 'teste de autor', null, '2000-01-01') $q$, testes.lido('modelo_versoes')), 1);
select testes.igual('autor e hora da versão são os do banco',
  format($q$ select (criado_por = auth.uid()) || ':' || (criado_em > now() - interval '1 minute')
      from public.modelo_documento_versoes where modelo_id = %L and versao = 2 $q$, testes.lido('modelo_versoes')),
  'true:true');
select testes.falha('o tipo do modelo não muda',
  format($q$ update public.modelos_documento set tipo = 'contrato' where id = %L $q$, testes.lido('modelo_anamnese')),
  '42501');
select testes.linhas('nome do modelo ainda muda',
  format($q$ update public.modelos_documento set nome = 'Termo de versões renomeado' where id = %L $q$,
    testes.lido('modelo_versoes')), 1);

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
-- Coluna que o grant alcança: a RLS (só financeiro) filtra tudo.
select testes.linhas('recepção não altera recebimento',
  $q$ update public.recebimentos set situacao = 'cancelado' $q$, 0);
-- Coluna fora do grant de UPDATE (0023): recusada antes da RLS.
select testes.falha('ninguém reescreve a descrição do recebimento pela API',
  $q$ update public.recebimentos set descricao = 'alterado' $q$, '42501');
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

-- Desde a 0023 a venda só nasce pela função: o INSERT direto é recusado
-- pelo grant (42501) antes de chegar ao gatilho da taxa.
select testes.falha('recepção não insere venda com taxa manual pela API',
  format($q$ insert into public.vendas (paciente_id, procedimento_id, data_venda, valor_original, desconto, valor_final,
        forma, parcelas, taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido, taxa_manual, taxa_justificativa)
      values ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,1000,0,1000,
        'credito',3,%L,0,0,1000,true,'sem taxa') $q$, testes.lido('taxa_credito_3x')), '42501');
select testes.falha('recepção não insere venda sem recebimento pela API (0023)',
  $q$ insert into public.vendas (paciente_id, procedimento_id, data_venda, valor_original, desconto, valor_final,
        forma, parcelas, taxa_percentual, taxa_valor, valor_liquido)
      values ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,100,0,100,
        'pix',1,0,0,100) $q$, '42501');
select testes.igual('venda pela função nasce com exatamente um recebimento',
  format($q$ select count(*)::text from public.recebimentos where venda_id = %L $q$, testes.lido('venda_pix')), '1');
select testes.igual('venda pela função guarda quem registrou',
  format($q$ select (criado_por = auth.uid())::text from public.vendas where id = %L $q$, testes.lido('venda_pix')), 'true');
select testes.falha('recepção não registra venda recebida no futuro',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        100,0,'pix',1,null,0,0,false,null,null,'recebido',null,current_date + 30,null) $q$, 'P0001');
select testes.falha('recepção não insere ajuste pela API',
  format($q$ insert into public.ajustes_financeiros (venda_id, valor, motivo) values (%L, 10, 'falso') $q$,
    testes.lido('venda_pix')), '42501');
select testes.falha('recepção não gera id de auditoria',
  $q$ select nextval('public.auditoria_id_seq') $q$, '42501');
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

-- 0027: o link foi gerado, mas a paciente assinou no balcão — a via pelo
-- link diz balcão.
select testes.guardar('contrato_balcao', public.documento_emitir(
  'c0000000-0000-4000-8000-000000000002', testes.lido('modelo_contrato')::uuid, 'Contrato no balcão', null)::text);
select public.documento_link_criar(testes.lido('contrato_balcao')::uuid,
  'tokenDoBalcaoComQuarentaETresCaracteresXYZ_', 7, '');
select public.documento_assinar(testes.lido('contrato_balcao')::uuid, 'Beatriz Nogueira', null,
  'Documento com foto conferido', null, null);

-- A data de nascimento vem do seed, não de uma constante: `dados-exemplo.sql`
-- põe o aniversário de Beatriz no dia 11 do mês em que o `db reset` rodou.
-- Com a data fixa, estes testes só passavam em setembro. Lida aqui, ainda com
-- a sessão da recepção, porque o visitante anônimo não lê `pacientes`.
select testes.guardar('nasc_beatriz', (select data_nascimento::text from public.pacientes
  where id = 'c0000000-0000-4000-8000-000000000002'));

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
  format($q$ select situacao || ':' || corpo from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', %L) $q$,
    testes.lido('nasc_beatriz')),
  'ok:Texto do contrato de teste.');
select testes.igual('assinar pelo link',
  format($q$ select public.documento_assinar_por_link('tokenDeTesteComQuarentaETresCaracteres_abcd', %L,
        'Beatriz Nogueira', null, 'isto não é um ip', 'Navegador de teste') $q$, testes.lido('nasc_beatriz')), 'ok');
select testes.igual('segunda assinatura devolve ja_assinado',
  format($q$ select public.documento_assinar_por_link('tokenDeTesteComQuarentaETresCaracteres_abcd', %L,
        'Beatriz Nogueira', null, null, null) $q$, testes.lido('nasc_beatriz')), 'ja_assinado');
select testes.igual('a via diz que a assinatura veio pelo link',
  format($q$ select situacao || ':' || assinado_canal
      from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', %L) $q$,
    testes.lido('nasc_beatriz')), 'ja_assinado:link');
select testes.igual('a via diz que a assinatura foi no balcão',
  format($q$ select situacao || ':' || assinado_canal
      from public.documento_para_assinatura('tokenDoBalcaoComQuarentaETresCaracteresXYZ_', %L) $q$,
    testes.lido('nasc_beatriz')), 'ja_assinado:balcao');

do $$
begin
  for i in 1..10 loop
    perform * from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', '2000-01-01');
  end loop;
end $$;
select testes.igual('décima tentativa errada bloqueia o link',
  $q$ select situacao from public.documento_link_estado('tokenDeTesteComQuarentaETresCaracteres_abcd') $q$, 'bloqueado');
select testes.igual('bloqueado não abre nem com a data certa',
  format($q$ select situacao from public.documento_para_assinatura('tokenDeTesteComQuarentaETresCaracteres_abcd', %L) $q$,
    testes.lido('nasc_beatriz')),
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

-- 0023: as tabelas da venda só mudam pelas funções, nem para o financeiro.
select testes.falha('financeiro não insere venda direto pela API',
  $q$ insert into public.vendas (paciente_id, procedimento_id, data_venda, valor_original, desconto, valor_final,
        forma, parcelas, taxa_percentual, taxa_valor, valor_liquido)
      values ('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,100,0,100,
        'pix',1,0,0,100) $q$, '42501');
select testes.falha('financeiro não altera venda direto pela API',
  format($q$ update public.vendas set forma = 'dinheiro' where id = %L $q$, testes.lido('venda_pix')), '42501');
select testes.falha('financeiro não insere histórico de alteração solto',
  format($q$ insert into public.venda_alteracoes (venda_id, tipo, de, para, motivo)
      values (%L, 'forma_pagamento', '{}', '{}', 'alteração que não aconteceu') $q$, testes.lido('venda_pix')), '42501');
select testes.falha('financeiro não insere ajuste solto',
  format($q$ insert into public.ajustes_financeiros (venda_id, valor, motivo) values (%L, 10, 'ajuste solto') $q$,
    testes.lido('venda_pix')), '42501');
select testes.falha('financeiro não insere segundo recebimento para a venda',
  format($q$ insert into public.recebimentos (paciente_id, venda_id, valor, vencimento, situacao)
      values ('c0000000-0000-4000-8000-000000000001', %L, 100, current_date, 'previsto') $q$, testes.lido('venda_pix')), '42501');
select testes.linhas('financeiro ainda insere recebimento solto, sem venda',
  $q$ insert into public.recebimentos (paciente_id, descricao, valor, vencimento, situacao)
      values ('c0000000-0000-4000-8000-000000000001', 'Teste solto', 100, current_date, 'previsto') $q$, 1);
select testes.falha('recebimento solto não tem taxa maior que o valor',
  $q$ insert into public.recebimentos (paciente_id, descricao, valor, taxa_valor, vencimento, situacao)
      values ('c0000000-0000-4000-8000-000000000001', 'Taxa demais', 100, 150, current_date, 'previsto') $q$, '23514');
select testes.falha('financeiro não reescreve o valor do recebimento previsto',
  format($q$ update public.recebimentos set valor = 1 where venda_id = %L $q$, testes.lido('venda_credito')), '42501');

-- 0023: a confirmação confere data e divergência como a tela.
select testes.falha('confirmação com data no futuro é recusada',
  format($q$ update public.recebimentos set situacao = 'recebido', recebido_em = current_date + 30,
        valor_recebido = valor - taxa_valor where venda_id = %L $q$, testes.lido('venda_credito')), 'P0001');
select testes.falha('valor diferente do líquido não entra como recebido',
  format($q$ update public.recebimentos set situacao = 'recebido', recebido_em = current_date,
        valor_recebido = 1 where venda_id = %L $q$, testes.lido('venda_credito')), 'P0001');
select testes.falha('valor igual ao líquido não entra como divergência',
  format($q$ update public.recebimentos set situacao = 'recebido_divergencia', recebido_em = current_date,
        valor_recebido = valor - taxa_valor where venda_id = %L $q$, testes.lido('venda_credito')), 'P0001');
select testes.linhas('financeiro confirma com divergência',
  format($q$ update public.recebimentos set situacao = 'recebido_divergencia', recebido_em = current_date,
        valor_recebido = 900 where venda_id = %L and situacao = 'previsto' $q$, testes.lido('venda_credito')), 1);

-- Alterar depois de confirmado: a função (DEFINER desde a 0023) grava o
-- histórico e o ajuste que a sessão não grava direto.
select testes.linhas('financeiro altera taxa depois da confirmação',
  format($q$ select public.venda_alterar_pagamento(%L, 'taxa_manual', 'credito', 3, %L, 4.00, 40.00, true, 'renegociado') $q$,
    testes.lido('venda_credito'), testes.lido('taxa_credito_3x')), 1);
select testes.igual('a diferença para o que entrou virou ajuste, e o confirmado ficou intacto',
  format($q$ select (select count(*) from public.venda_alteracoes where venda_id = %1$L) || ':' ||
        (select string_agg(valor::text, ',') from public.ajustes_financeiros where venda_id = %1$L) || ':' ||
        (select valor_recebido from public.recebimentos where venda_id = %1$L) $q$, testes.lido('venda_credito')),
  '2:60.01:900.00');
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

-- 0027: quem respondeu e quando são escritos pelo banco.
select testes.igual('resposta na consulta leva a autora e a hora do banco',
  format($q$ select (respondido_por = auth.uid()) || ':' || (respondido_em > now() - interval '1 minute')
      from public.documento_campos where documento_id = %L and chave = 'alergia' $q$, testes.lido('anamnese')),
  'true:true');
select testes.linhas('resposta mudada à mão, com autor e hora forjados',
  format($q$ update public.documento_campos set resposta = 'sim', respondido_por = null, respondido_em = '2000-01-01'
      where documento_id = %L and chave = 'alergia' $q$, testes.lido('anamnese')), 1);
select testes.igual('autor e hora continuam os do banco',
  format($q$ select (respondido_por = auth.uid()) || ':' || (respondido_em > now() - interval '1 minute')
      from public.documento_campos where documento_id = %L and chave = 'alergia' $q$, testes.lido('anamnese')),
  'true:true');

-- A paciente corrige pelo link o que a administradora respondeu na consulta:
-- a resposta passa a ser dela, e `respondido_por` fica nulo.
select testes.guardar('anamnese_link', public.documento_emitir(
  'c0000000-0000-4000-8000-000000000002', testes.lido('modelo_anamnese')::uuid, 'Anamnese pelo link', null)::text);
select public.documento_campos_responder(testes.lido('anamnese_link')::uuid, '{"alergia":"nao"}'::jsonb);
select public.documento_link_criar(testes.lido('anamnese_link')::uuid,
  'tokenDaAnamneseComQuarentaETresCaracteres_z', 7, '');
select testes.como(null);
select testes.igual('paciente responde pelo link',
  format($q$ select public.documento_responder_por_link('tokenDaAnamneseComQuarentaETresCaracteres_z', %L,
        '{"alergia":"sim"}'::jsonb) $q$, testes.lido('nasc_beatriz')), 'ok');
select testes.como('admin@cockpit.local');
select testes.igual('resposta pelo link fica sem autor de perfil',
  format($q$ select resposta || ':' || coalesce(respondido_por::text, 'nulo')
      from public.documento_campos where documento_id = %L and chave = 'alergia' $q$, testes.lido('anamnese_link')),
  'sim:nulo');

-- A paciente responde no tablet do balcão, com a recepção logada: a chamada
-- chega como `authenticated`, com o JWT da recepção. A resposta continua sendo
-- dela — `auth.uid()` devolveria a recepcionista; o gatilho olha `current_user`.
select testes.como('recepcao@cockpit.local');
select testes.igual('paciente responde pelo link num navegador com sessão da equipe',
  format($q$ select public.documento_responder_por_link('tokenDaAnamneseComQuarentaETresCaracteres_z', %L,
        '{"alergia":"nao"}'::jsonb) $q$, testes.lido('nasc_beatriz')), 'ok');
select testes.como('admin@cockpit.local');
select testes.igual('resposta pelo link com sessão da equipe também fica sem autor',
  format($q$ select resposta || ':' || coalesce(respondido_por::text, 'nulo')
      from public.documento_campos where documento_id = %L and chave = 'alergia' $q$, testes.lido('anamnese_link')),
  'nao:nulo');
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

-- Fotos (0024): a linha sem arquivo e o arquivo sem linha aparecem na
-- reconciliação, que não apaga nada.
select testes.guardar('foto_sem_arquivo', testes.lido('prontuario') || '/aaaaaaaa-0000-4000-8000-000000000001.jpg');
select testes.guardar('arquivo_sem_foto', testes.lido('prontuario') || '/bbbbbbbb-0000-4000-8000-000000000002.jpg');
-- Desde a 0028 a linha só nasce com o arquivo no bucket: o envio entra pelo
-- SQL do projeto, com os metadados que o Storage grava. Mais abaixo o
-- arquivo sai e a linha fica — a "linha sem arquivo" da reconciliação.
select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name, metadata)
values ('prontuario-imagens', testes.lido('foto_sem_arquivo'), '{"mimetype":"image/jpeg","size":2048}'::jsonb);
select testes.como('admin@cockpit.local');
select testes.linhas('administradora registra a linha de uma foto',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes,
        data_captura, criado_por, criado_em)
      values (%L, %L, 'foto.jpg', 'image/jpeg', 10, (now() at time zone 'America/Sao_Paulo')::date,
        null, '2000-01-01') $q$,
    testes.lido('prontuario'), testes.lido('foto_sem_arquivo')), 1);
select testes.igual('autor, hora e marca da foto são os do banco (0027)',
  format($q$ select (criado_por = auth.uid()) || ':' || (criado_em > now() - interval '1 minute') || ':' || exemplo
      from public.prontuario_imagens where caminho = %L $q$, testes.lido('foto_sem_arquivo')), 'true:true:false');
-- O arquivo está no bucket (senão a 0028 recusaria pelo arquivo, e o teste
-- não provaria nada sobre a data); sai logo depois, para não virar sobra na
-- reconciliação lá embaixo.
select testes.guardar('foto_do_futuro', testes.lido('prontuario') || '/cccccccc-0000-4000-8000-000000000003.jpg');
select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name, metadata)
values ('prontuario-imagens', testes.lido('foto_do_futuro'), '{"mimetype":"image/jpeg","size":2048}'::jsonb);
select testes.como('admin@cockpit.local');
select testes.falha('foto com data de captura no futuro é recusada (0027)',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes, data_captura)
      values (%L, %L, 'foto.jpg', 'image/jpeg', 10, current_date + 30) $q$,
    testes.lido('prontuario'), testes.lido('foto_do_futuro')), 'P0001');
select set_config('role', 'postgres', true);
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'prontuario-imagens' and name = testes.lido('foto_do_futuro');
select set_config('storage.allow_delete_query', 'false', true);
select testes.como('admin@cockpit.local');
select testes.falha('data da foto não vai para o futuro depois (0027)',
  format($q$ update public.prontuario_imagens set data_captura = current_date + 30 where caminho = %L $q$,
    testes.lido('foto_sem_arquivo')), 'P0001');
select testes.linhas('administradora muda a legenda da foto',
  format($q$ update public.prontuario_imagens set legenda = 'Antes' where caminho = %L $q$, testes.lido('foto_sem_arquivo')), 1);
select testes.falha('administradora não troca o arquivo da foto pela API',
  format($q$ update public.prontuario_imagens set caminho = %L where caminho = %L $q$,
    testes.lido('arquivo_sem_foto'), testes.lido('foto_sem_arquivo')), '42501');

-- O arquivo órfão entra pelo SQL do projeto, como um envio cuja linha
-- nunca foi gravada. E o arquivo da foto registrada sai do bucket, como na
-- eliminação que caiu entre o arquivo e a linha.
select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name) values ('prontuario-imagens', testes.lido('arquivo_sem_foto'));
select set_config('storage.allow_delete_query', 'true', true);
delete from storage.objects where bucket_id = 'prontuario-imagens' and name = testes.lido('foto_sem_arquivo');
select set_config('storage.allow_delete_query', 'false', true);
select testes.como('admin@cockpit.local');

select testes.igual('reconciliação acha a linha sem arquivo e o arquivo sem linha',
  format($q$ select string_agg(situacao || ':' || caminho, ',' order by situacao)
        from public.prontuario_imagens_reconciliar() where prontuario_id = %L $q$, testes.lido('prontuario')),
  'arquivo_sem_metadado:' || testes.lido('arquivo_sem_foto') || ',metadado_sem_arquivo:' || testes.lido('foto_sem_arquivo'));
select testes.igual('reconciliação não apaga nada',
  format($q$ select (select count(*) from public.prontuario_imagens where prontuario_id = %1$L) || ':' ||
        (select count(*) from storage.objects where bucket_id = 'prontuario-imagens' and name like %2$L) $q$,
    testes.lido('prontuario'), testes.lido('prontuario') || '/%'),
  '1:1');

select testes.como('financeiro@cockpit.local');
select testes.falha('financeiro não chama a reconciliação das fotos',
  $q$ select * from public.prontuario_imagens_reconciliar() $q$, '42501');

select testes.como(null);
select testes.falha('anon não chama a reconciliação das fotos',
  $q$ select * from public.prontuario_imagens_reconciliar() $q$, '42501');
select testes.falha('anon não gera id de sequência nenhuma',
  $q$ select nextval('public.prontuario_versoes_id_seq') $q$, '42501');

select testes.como('recepcao@cockpit.local');
select testes.linhas('recepção não vê prontuário',
  $q$ select * from public.prontuarios $q$, 0);
select testes.linhas('recepção não vê anamnese',
  format($q$ select * from public.documentos where id = %L $q$, testes.lido('anamnese')), 0);
select testes.falha('recepção não chama a reconciliação das fotos',
  $q$ select * from public.prontuario_imagens_reconciliar() $q$, '42501');

-- ---------------------------------------------------------------------
-- 0025: busca sem acento, registro de contato com origem própria,
-- teto do título do prontuário e recebimento só pela função
-- ---------------------------------------------------------------------

-- Pacientes reais só destes testes: nada aponta para o seed, e a
-- limpeza dos dados de exemplo lá embaixo não muda de resultado.
select testes.como('recepcao@cockpit.local');
with n as (
  insert into public.pacientes (nome, nome_social) values ('Maria da Conceição Ávila', 'Ção')
  returning id
) select testes.guardar('paciente_0025', id::text) from n;
with n as (
  insert into public.pacientes (nome) values ('Joana Teste Contato')
  returning id
) select testes.guardar('paciente_0025_b', id::text) from n;

select testes.igual('busca: nome e nome social sem acento e em minúsculas',
  format($q$ select busca from public.pacientes where id = %L $q$, testes.lido('paciente_0025')),
  'maria da conceicao avila cao');
select testes.igual('busca: "Conceicao" acha "Conceição"',
  format($q$ select count(*)::text from public.pacientes where id = %L and busca ilike '%%conceicao%%' $q$,
    testes.lido('paciente_0025')), '1');
select testes.falha('busca é gerada: não se escreve',
  format($q$ update public.pacientes set busca = 'x' where id = %L $q$, testes.lido('paciente_0025')), '428C9');

-- A regra de texto de antes, só para linha com forma de registro.
select set_config('role', 'postgres', true);
select testes.igual('transição: convite antigo vira contato_avaliacao',
  $q$ select private.pendencia_origem_pelo_texto('pesquisa', 'Convite para avaliação no Google enviado pela equipe',
        'resolvida', gen_random_uuid(), now())::text $q$, 'contato_avaliacao');
select testes.igual('transição: variação antiga pelo prefixo também',
  $q$ select private.pendencia_origem_pelo_texto('pesquisa', 'Convite para avaliação no Google enviado',
        'resolvida', gen_random_uuid(), now())::text $q$, 'contato_avaliacao');
select testes.igual('transição: aniversário antigo vira contato_aniversario',
  $q$ select private.pendencia_origem_pelo_texto('outro', 'Mensagem de aniversário enviada pela equipe',
        'resolvida', gen_random_uuid(), now())::text $q$, 'contato_aniversario');
select testes.igual('transição: texto de convite com tipo errado continua tarefa',
  $q$ select private.pendencia_origem_pelo_texto('outro', 'Convite para avaliação no Google enviado pela equipe',
        'resolvida', gen_random_uuid(), now())::text $q$, 'tarefa');
select testes.igual('transição: registro reaberto continua tarefa',
  $q$ select private.pendencia_origem_pelo_texto('pesquisa', 'Convite para avaliação no Google enviado pela equipe',
        'aberta', gen_random_uuid(), null)::text $q$, 'tarefa');
select testes.igual('transição: sem paciente continua tarefa',
  $q$ select private.pendencia_origem_pelo_texto('pesquisa', 'Convite para avaliação no Google enviado pela equipe',
        'resolvida', null, now())::text $q$, 'tarefa');
select testes.igual('transição: tarefa que só menciona o convite continua tarefa',
  $q$ select private.pendencia_origem_pelo_texto('pesquisa', 'Enviar convite para avaliação',
        'resolvida', gen_random_uuid(), now())::text $q$, 'tarefa');
select testes.igual('transição: nenhuma linha com forma de registro ficou como tarefa',
  $q$ select count(*)::text from public.pendencias
       where origem = 'tarefa'
         and private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em) <> 'tarefa' $q$,
  '0');
select testes.igual('um contato por dia: o índice único existe',
  $q$ select count(*)::text from pg_indexes where indexname = 'pendencias_contato_um_por_dia' $q$, '1');
select testes.igual('teto do título do prontuário validado',
  $q$ select convalidated::text from pg_constraint where conname = 'prontuarios_titulo_maximo' $q$, 'true');

-- O backfill da migração, repetido sobre um registro gravado do jeito
-- antigo (sem origem): vira contato e passa na constraint e no índice.
select testes.linhas('legado: registro antigo gravado sem origem',
  format($q$ insert into public.pendencias (tipo, paciente_id, descricao, prioridade, situacao, resolvida_em)
      values ('pesquisa', %L, 'Convite para avaliação no Google enviado pela equipe', 'baixa', 'resolvida', now()) $q$,
    testes.lido('paciente_0025')), 1);
select testes.linhas('legado: o backfill da 0025 reconhece e passa na constraint',
  $q$ update public.pendencias
        set origem = private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em)
      where origem = 'tarefa'
        and private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em) <> 'tarefa' $q$,
  1);
select testes.falha('prontuário: título acima de 160 é recusado pelo banco',
  format($q$ update public.prontuarios set titulo = repeat('x', 161) where id = %L $q$, testes.lido('prontuario')),
  '23514');

-- Pela API, como a aplicação grava.
select testes.como('recepcao@cockpit.local');
select testes.falha('um contato por dia: o segundo convite no mesmo dia é recusado',
  format($q$ insert into public.pendencias (tipo, origem, paciente_id, descricao, prioridade, situacao, resolvida_em)
      values ('pesquisa', 'contato_avaliacao', %L, 'Convite para avaliação no Google enviado pela equipe', 'baixa', 'resolvida', now()) $q$,
    testes.lido('paciente_0025')), '23505');
select testes.linhas('outra origem no mesmo dia entra',
  format($q$ insert into public.pendencias (tipo, origem, paciente_id, descricao, prioridade, situacao, resolvida_em)
      values ('outro', 'contato_aniversario', %L, 'Mensagem de aniversário enviada pela equipe', 'baixa', 'resolvida', now()) $q$,
    testes.lido('paciente_0025')), 1);
select testes.linhas('recepção registra convite com origem',
  format($q$ insert into public.pendencias (tipo, origem, paciente_id, descricao, prioridade, situacao, resolvida_em)
      values ('pesquisa', 'contato_avaliacao', %L, 'Convite para avaliação no Google enviado pela equipe', 'baixa', 'resolvida', now()) $q$,
    testes.lido('paciente_0025_b')), 1);
select testes.guardar('contato_0025',
  (select id::text from public.pendencias where paciente_id = testes.lido('paciente_0025_b')::uuid and origem = 'contato_avaliacao'));
select testes.falha('registro de contato não nasce aberto',
  format($q$ insert into public.pendencias (tipo, origem, paciente_id, descricao)
      values ('pesquisa', 'contato_avaliacao', %L, 'Convite') $q$, testes.lido('paciente_0025_b')), '23514');
select testes.falha('registro de contato não nasce sem paciente',
  $q$ insert into public.pendencias (tipo, origem, descricao, situacao, resolvida_em)
      values ('pesquisa', 'contato_avaliacao', 'Convite', 'resolvida', now()) $q$, '23514');
select testes.falha('origem e tipo precisam combinar',
  format($q$ insert into public.pendencias (tipo, origem, paciente_id, descricao, situacao, resolvida_em)
      values ('outro', 'contato_avaliacao', %L, 'Convite', 'resolvida', now()) $q$, testes.lido('paciente_0025_b')), '23514');
select testes.falha('registro de contato não se reabre',
  format($q$ update public.pendencias set situacao = 'aberta', resolvida_em = null where id = %L $q$,
    testes.lido('contato_0025')), '23514');
select testes.falha('origem não muda depois de gravada',
  format($q$ update public.pendencias set origem = 'tarefa' where id = %L $q$, testes.lido('contato_0025')), '42501');
select testes.linhas('tarefa pode ter o texto do convite',
  format($q$ insert into public.pendencias (tipo, paciente_id, descricao)
      values ('pesquisa', %L, 'Convite para avaliação no Google enviado pela equipe') $q$,
    testes.lido('paciente_0025_b')), 1);
select testes.guardar('tarefa_0025',
  (select id::text from public.pendencias
    where paciente_id = testes.lido('paciente_0025_b')::uuid and situacao = 'aberta'));
select testes.igual('tarefa com o texto do convite continua tarefa',
  format($q$ select origem::text from public.pendencias where id = %L $q$, testes.lido('tarefa_0025')),
  'tarefa');
select testes.linhas('tarefa continua concluída pela coluna do grant',
  format($q$ update public.pendencias set situacao = 'resolvida', resolvida_em = now() where id = %L $q$,
    testes.lido('tarefa_0025')), 1);

-- Recebimento: só `venda_registrar` (DEFINER) cria; a data futura é
-- recusada também quando a venda já nasce recebida.
select testes.como('financeiro@cockpit.local');
select testes.falha('financeiro não chama recebimento_da_venda_criar direto',
  format($q$ select private.recebimento_da_venda_criar(%L, 'previsto', current_date, null, null) $q$,
    testes.lido('venda_pix')), '42501');
select testes.falha('venda que nasce recebida não aceita data no futuro',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        500,0,'pix',1,null,0,0,false,null,null,'recebido',current_date,current_date + 1,null) $q$, 'P0001');

-- ---------------------------------------------------------------------
-- Funções DEFINER: sem a RLS, a checagem de perfil na entrada é a única
-- barreira para sessão autenticada sem perfil ativo
-- ---------------------------------------------------------------------

-- Sessão autenticada de alguém que não tem perfil.
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims',
  json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
select set_config('role', 'authenticated', true);
select testes.falha('sem perfil: venda_registrar recusa',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        500,0,'pix',1,null,0,0,false,null,null,'previsto',current_date,null,null) $q$, '42501');
select testes.falha('sem perfil: venda_alterar_pagamento recusa',
  format($q$ select public.venda_alterar_pagamento(%L, 'forma_pagamento', 'pix', 1, null, 0, 0, false, 'sem perfil') $q$,
    testes.lido('venda_credito')), '42501');

-- Perfil inativo: o financeiro desligado não vende nem altera.
select testes.como(null);
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);
update public.perfis set ativo = false
 where id = (select id from auth.users where email = 'financeiro@cockpit.local');
select testes.como('financeiro@cockpit.local');
select testes.falha('perfil inativo: venda_registrar recusa',
  $q$ select public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',current_date,
        500,0,'pix',1,null,0,0,false,null,null,'previsto',current_date,null,null) $q$, '42501');
select testes.falha('perfil inativo: venda_alterar_pagamento recusa',
  format($q$ select public.venda_alterar_pagamento(%L, 'forma_pagamento', 'pix', 1, null, 0, 0, false, 'perfil inativo') $q$,
    testes.lido('venda_credito')), '42501');
select testes.como(null);
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);
update public.perfis set ativo = true
 where id = (select id from auth.users where email = 'financeiro@cockpit.local');

-- ---------------------------------------------------------------------
-- 0026: a marca de exemplo não muda pela API; busca com a chave de
-- serviço; sequência nova sem setval para a sessão
-- ---------------------------------------------------------------------

select testes.como('recepcao@cockpit.local');
select testes.falha('recepção não marca paciente real como exemplo',
  format($q$ update public.pacientes set exemplo = true where id = %L $q$, testes.lido('paciente_0025')), '42501');
select testes.falha('recepção não desmarca paciente de exemplo',
  $q$ update public.pacientes set exemplo = false where id = 'c0000000-0000-4000-8000-000000000005' $q$, '42501');
select testes.falha('recepção não troca a marca de um atendimento',
  $q$ update public.atendimentos set exemplo = not exemplo
       where id = (select id from public.atendimentos order by inicio, id limit 1) $q$, '42501');
select testes.falha('recepção não cadastra paciente já marcado como exemplo',
  $q$ insert into public.pacientes (nome, exemplo) values ('Paciente Marcada', true) $q$, '42501');
select testes.falha('recepção não cria tarefa marcada como exemplo',
  $q$ insert into public.pendencias (tipo, descricao, exemplo) values ('outro', 'Tarefa marcada', true) $q$, '42501');
select testes.linhas('mesma marca no UPDATE passa (a aplicação não escreve a coluna)',
  format($q$ update public.pacientes set nome = nome, exemplo = exemplo where id = %L $q$, testes.lido('paciente_0025')), 1);
select testes.como('financeiro@cockpit.local');
select testes.falha('financeiro não marca despesa como exemplo',
  $q$ update public.despesas set exemplo = not exemplo where id = (select id from public.despesas limit 1) $q$, '42501');

-- Sem sessão (seed, dados:exemplo, dados:limpar) a marca continua livre.
select testes.como(null);
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);
select testes.linhas('sem sessão a marca muda (manutenção pelo SQL do projeto)',
  format($q$ update public.pacientes set exemplo = true where id = %L $q$, testes.lido('paciente_0025')), 1);
select testes.linhas('sem sessão a marca volta',
  format($q$ update public.pacientes set exemplo = false where id = %L $q$, testes.lido('paciente_0025')), 1);

-- A coluna gerada `pacientes.busca` chama `private.sem_acento`.
select set_config('role', 'service_role', true);
select testes.linhas('chave de serviço grava paciente (busca gerada)',
  format($q$ update public.pacientes set nome = nome where id = %L $q$, testes.lido('paciente_0025')), 1);
select set_config('role', 'postgres', true);

-- Sequência criada depois da 0026: a sessão só pede o próximo número.
create table public.teste_sequencia_nova (id bigint generated always as identity primary key);
select testes.igual('sequência nova: authenticated sem UPDATE (setval) nem SELECT, com USAGE',
  $q$ select concat_ws(':',
        has_sequence_privilege('authenticated', 'public.teste_sequencia_nova_id_seq', 'UPDATE'),
        has_sequence_privilege('authenticated', 'public.teste_sequencia_nova_id_seq', 'SELECT'),
        has_sequence_privilege('authenticated', 'public.teste_sequencia_nova_id_seq', 'USAGE')) $q$,
  'f:f:t');
drop table public.teste_sequencia_nova;

-- ---------------------------------------------------------------------
-- 0028: venda idempotente pela chave do envio; foto só com o arquivo no
-- bucket, com tipo e tamanho do Storage
-- ---------------------------------------------------------------------

select testes.como('recepcao@cockpit.local');
select testes.guardar('chave_0028', 'f0000000-0000-4000-8000-000000000028');
select testes.guardar('venda_chave', public.venda_registrar(
  'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', current_date,
  250, 0, 'pix', 1, null, 0, 0, false, null, null, 'previsto', current_date + 7, null, 'Teste chave',
  testes.lido('chave_0028')::uuid)::text);
select testes.igual('mesma chave do mesmo perfil devolve a mesma venda',
  format($q$ select (public.venda_registrar(
        'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', current_date,
        250, 0, 'pix', 1, null, 0, 0, false, null, null, 'previsto', current_date + 7, null, 'Teste chave',
        %L::uuid) = %L::uuid)::text $q$, testes.lido('chave_0028'), testes.lido('venda_chave')), 'true');
select testes.igual('duplo envio grava uma venda e um recebimento',
  format($q$ select (select count(*) from public.vendas where chave_envio = %1$L::uuid) || ':' ||
        (select count(*) from public.recebimentos where venda_id = %2$L::uuid) $q$,
    testes.lido('chave_0028'), testes.lido('venda_chave')), '1:1');
select testes.igual('a venda guarda a chave do envio',
  format($q$ select chave_envio::text from public.vendas where id = %L $q$, testes.lido('venda_chave')),
  testes.lido('chave_0028'));
select testes.falha('recepção não reescreve a chave do envio pela API',
  format($q$ update public.vendas set chave_envio = gen_random_uuid() where id = %L $q$, testes.lido('venda_chave')),
  '42501');
select testes.igual('sem chave, dois envios iguais continuam sendo duas vendas (como antes)',
  $q$ select (public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
        current_date,250,0,'pix',1,null,0,0,false,null,null,'previsto',current_date + 7,null,'Sem chave')
      <> public.venda_registrar('c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001',
        current_date,250,0,'pix',1,null,0,0,false,null,null,'previsto',current_date + 7,null,'Sem chave'))::text $q$,
  'true');

select testes.como('financeiro@cockpit.local');
select testes.falha('a chave de outro perfil é recusada',
  format($q$ select public.venda_registrar(
        'c0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', current_date,
        250, 0, 'pix', 1, null, 0, 0, false, null, null, 'previsto', current_date + 7, null, 'Outro perfil',
        %L::uuid) $q$, testes.lido('chave_0028')), 'P0001');

-- Fotos: os objetos entram pelo SQL do projeto, como o Storage os grava
-- (com `metadata`), num prontuário só destes testes.
select testes.como('admin@cockpit.local');
select testes.guardar('prontuario_0028', public.prontuario_registrar(
  'c0000000-0000-4000-8000-000000000001', null, current_date, 'Fotos da 0028',
  'Queixa de teste', '', '', '', '', '')::text);
select testes.guardar('foto_0028', testes.lido('prontuario_0028') || '/aaaaaaaa-0000-4000-8000-000000000028.jpg');
select testes.guardar('foto_0028_png', testes.lido('prontuario_0028') || '/bbbbbbbb-0000-4000-8000-000000000028.png');
select testes.guardar('foto_0028_crua', testes.lido('prontuario_0028') || '/cccccccc-0000-4000-8000-000000000028.webp');
select set_config('role', 'postgres', true);
insert into storage.objects (bucket_id, name, metadata) values
  ('prontuario-imagens', testes.lido('foto_0028'), '{"mimetype":"image/jpeg","size":3000}'::jsonb),
  ('prontuario-imagens', testes.lido('foto_0028_png'), '{"mimetype":"image/jpeg","size":3000}'::jsonb),
  ('prontuario-imagens', testes.lido('foto_0028_crua'), null);
select testes.como('admin@cockpit.local');

select testes.falha('foto sem o arquivo no bucket é recusada',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes, data_captura)
      values (%L, %L, 'foto.jpg', 'image/jpeg', 10, current_date) $q$,
    testes.lido('prontuario_0028'), testes.lido('prontuario_0028') || '/dddddddd-0000-4000-8000-000000000028.jpg'), 'P0001');
select testes.linhas('foto com o arquivo no bucket é registrada',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes, data_captura)
      values (%L, %L, 'foto.jpg', 'image/png', 1, current_date) $q$,
    testes.lido('prontuario_0028'), testes.lido('foto_0028')), 1);
select testes.igual('tipo e tamanho da foto são os do arquivo, não os declarados',
  format($q$ select tipo_mime || ':' || tamanho_bytes from public.prontuario_imagens where caminho = %L $q$,
    testes.lido('foto_0028')), 'image/jpeg:3000');
select testes.falha('extensão que não confere com o arquivo é recusada',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes, data_captura)
      values (%L, %L, 'foto.png', 'image/png', 3000, current_date) $q$,
    testes.lido('prontuario_0028'), testes.lido('foto_0028_png')), 'P0001');
select testes.falha('arquivo sem os metadados do Storage é recusado',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes, data_captura)
      values (%L, %L, 'foto.webp', 'image/webp', 3000, current_date) $q$,
    testes.lido('prontuario_0028'), testes.lido('foto_0028_crua')), 'P0001');

select testes.como('recepcao@cockpit.local');
select testes.falha('recepção não registra foto (a RLS recusa antes do arquivo)',
  format($q$ insert into public.prontuario_imagens (prontuario_id, caminho, nome_original, tipo_mime, tamanho_bytes, data_captura)
      values (%L, %L, 'foto.png', 'image/png', 3000, current_date) $q$,
    testes.lido('prontuario_0028'), testes.lido('foto_0028_png')), '42501');

-- ---------------------------------------------------------------------
-- Captação: leads, trilha de etapas e metas (0029); contatos comerciais
-- (0030) conferidos pelo banco (0031)
-- ---------------------------------------------------------------------

select testes.como(null);
select testes.falha('anon não lê leads', 'select * from public.leads', '42501');
select testes.falha('anon não lê a trilha de etapas', 'select * from public.lead_etapas', '42501');
select testes.falha('anon não lê metas comerciais', 'select * from public.metas_comerciais', '42501');
select testes.falha('anon não lê contatos comerciais', 'select * from public.lead_interacoes', '42501');
select testes.falha('anon não converte lead em paciente',
  $q$ select public.lead_converter_em_paciente('00000000-0000-4000-8000-000000000000') $q$, '42501');

-- O que a API alcança é o que os grants dizem: resumo do contato, venda,
-- autoria e hora são escritos só pelo banco.
select testes.igual('a sessão não escreve resumo do contato, venda nem autoria do lead',
  $q$ select concat_ws(':',
        has_column_privilege('authenticated', 'public.leads', 'proximo_contato', 'update')::text,
        has_column_privilege('authenticated', 'public.leads', 'ultimo_contato_em', 'update')::text,
        has_column_privilege('authenticated', 'public.leads', 'proximo_contato', 'insert')::text,
        has_column_privilege('authenticated', 'public.leads', 'venda_id', 'update')::text,
        has_column_privilege('authenticated', 'public.leads', 'criado_por', 'insert')::text,
        has_table_privilege('authenticated', 'public.leads', 'delete')::text) $q$,
  'false:false:false:false:false:false');
select testes.igual('contato comercial: a sessão só insere canal, observação e retorno',
  $q$ select concat_ws(':',
        has_column_privilege('authenticated', 'public.lead_interacoes', 'canal', 'insert')::text,
        has_column_privilege('authenticated', 'public.lead_interacoes', 'proximo_contato', 'insert')::text,
        has_column_privilege('authenticated', 'public.lead_interacoes', 'por', 'insert')::text,
        has_column_privilege('authenticated', 'public.lead_interacoes', 'em', 'insert')::text,
        has_any_column_privilege('authenticated', 'public.lead_interacoes', 'update')::text,
        has_table_privilege('authenticated', 'public.lead_interacoes', 'delete')::text) $q$,
  'true:true:false:false:false:false');
select testes.igual('sequências da Captação: a da trilha sem a sessão, a do contato só com USAGE',
  $q$ select concat_ws(':',
        has_sequence_privilege('authenticated', 'public.lead_etapas_id_seq', 'usage')::text,
        has_sequence_privilege('authenticated', 'public.lead_interacoes_id_seq', 'usage')::text,
        has_sequence_privilege('authenticated', 'public.lead_interacoes_id_seq', 'select')::text,
        has_sequence_privilege('authenticated', 'public.lead_interacoes_id_seq', 'update')::text,
        has_sequence_privilege('anon', 'public.lead_interacoes_id_seq', 'usage')::text) $q$,
  'false:true:false:false:false');

-- Recepção opera a carteira.
select testes.como('recepcao@cockpit.local');

select testes.linhas('recepção cadastra lead',
  $q$ insert into public.leads (nome, telefone, email, origem, campanha, procedimento_interesse_id)
      values ('Lead Banco Conversão', '11987650001', 'lead.conversao@teste.local', 'Instagram', 'Teste 0029',
              'b0000000-0000-4000-8000-000000000001') $q$, 1);
select testes.guardar('lead_conversao', (select id::text from public.leads where nome = 'Lead Banco Conversão'));
select testes.igual('lead nasce com autor e trilha escritos pelo banco',
  format($q$ select (l.criado_por = auth.uid())::text || ':' || count(e.id) || ':' || min(e.para::text) || ':' || bool_and(e.por = auth.uid())::text
      from public.leads l join public.lead_etapas e on e.lead_id = l.id
     where l.id = %L group by l.criado_por $q$, testes.lido('lead_conversao')),
  'true:1:novo:true');

select testes.falha('a carteira não fabrica venda concluída',
  format($q$ update public.leads set etapa = 'ganho' where id = %L $q$, testes.lido('lead_conversao')), '23514');
select testes.falha('a sessão não grava venda_id no lead',
  format($q$ update public.leads set venda_id = %L where id = %L $q$, testes.lido('venda_pix'), testes.lido('lead_conversao')), '42501');
select testes.falha('a sessão não escreve o retorno direto no lead',
  format($q$ update public.leads set proximo_contato = current_date + 3 where id = %L $q$, testes.lido('lead_conversao')), '42501');
select testes.falha('perda sem motivo é recusada',
  format($q$ update public.leads set etapa = 'perdido' where id = %L $q$, testes.lido('lead_conversao')), '23514');
select testes.falha('recepção não apaga lead',
  format($q$ delete from public.leads where id = %L $q$, testes.lido('lead_conversao')), '42501');
select testes.falha('ninguém escreve na trilha de etapas',
  format($q$ insert into public.lead_etapas (lead_id, para) values (%L, 'ganho') $q$, testes.lido('lead_conversao')), '42501');
select testes.falha('ninguém apaga a trilha de etapas', $q$ delete from public.lead_etapas $q$, '42501');
select testes.falha('recepção não cria meta comercial',
  $q$ insert into public.metas_comerciais (competencia, meta_faturamento, ticket_medio_planejado)
      values (date_trunc('month', current_date)::date, 50000, 1500) $q$, '42501');

-- Um lead para a limpeza dos dados de exemplo, lá no fim: vinculado a uma
-- paciente e interessado num procedimento que só existem como exemplo.
select testes.linhas('recepção vincula lead a paciente e procedimento de exemplo',
  $q$ insert into public.leads (nome, origem, paciente_id, procedimento_interesse_id)
      values ('Lead Banco Limpeza', 'Instagram', 'c0000000-0000-4000-8000-000000000013',
              'b0000000-0000-4000-8000-000000000009') $q$, 1);
select testes.guardar('lead_limpeza', (select id::text from public.leads where nome = 'Lead Banco Limpeza'));

-- Financeiro acompanha o funil e cuida da meta.
select testes.como('financeiro@cockpit.local');

select testes.igual('financeiro acompanha o funil',
  $q$ select (count(*) > 0)::text from public.leads $q$, 'true');
select testes.falha('financeiro não cadastra lead',
  $q$ insert into public.leads (nome, origem) values ('Lead do Financeiro', 'Outro') $q$, '42501');
select testes.linhas('financeiro não move lead',
  format($q$ update public.leads set etapa = 'qualificado' where id = %L $q$, testes.lido('lead_conversao')), 0);
select testes.falha('financeiro não converte lead',
  format($q$ select public.lead_converter_em_paciente(%L) $q$, testes.lido('lead_conversao')), '42501');
select testes.falha('financeiro não registra contato comercial',
  format($q$ insert into public.lead_interacoes (lead_id, canal) values (%L, 'telefone') $q$, testes.lido('lead_conversao')), '42501');
select testes.linhas('financeiro define a meta do mês',
  $q$ insert into public.metas_comerciais (competencia, meta_faturamento, ticket_medio_planejado)
      values (date_trunc('month', current_date)::date, 50000, 1500) $q$, 1);
select testes.linhas('financeiro ajusta a meta',
  $q$ update public.metas_comerciais set meta_faturamento = 60000
       where competencia = date_trunc('month', current_date)::date and procedimento_id is null $q$, 1);
select testes.falha('a competência da meta não muda pela API',
  $q$ update public.metas_comerciais set competencia = '2000-01-01' $q$, '42501');
select testes.falha('meta fora do primeiro dia do mês é recusada',
  $q$ insert into public.metas_comerciais (competencia, meta_faturamento, ticket_medio_planejado)
      values (date_trunc('month', current_date)::date + 5, 1000, 100) $q$, '23514');
select testes.falha('segunda meta geral no mesmo mês é recusada',
  $q$ insert into public.metas_comerciais (competencia, meta_faturamento, ticket_medio_planejado)
      values (date_trunc('month', current_date)::date, 1, 1) $q$, '23505');
-- Procedimento de exemplo com meta própria: a limpeza, lá no fim, não o apaga.
select testes.linhas('meta por procedimento convive com a geral',
  $q$ insert into public.metas_comerciais (competencia, procedimento_id, meta_faturamento, ticket_medio_planejado)
      values (date_trunc('month', current_date)::date, 'b0000000-0000-4000-8000-000000000008', 5000, 250) $q$, 1);

-- De volta à recepção: conversão, perda e reabertura.
select testes.como('recepcao@cockpit.local');

select testes.linhas('recepção não altera meta',
  $q$ update public.metas_comerciais set meta_faturamento = 1 $q$, 0);

select testes.guardar('paciente_do_lead',
  public.lead_converter_em_paciente(testes.lido('lead_conversao')::uuid)::text);
select testes.igual('conversão cria a paciente com os dados do lead e promove a etapa',
  format($q$ select p.nome || ':' || p.telefone || ':' || coalesce(p.origem, '') || ':' || l.etapa::text || ':' || p.exemplo::text
      from public.leads l join public.pacientes p on p.id = l.paciente_id where l.id = %L $q$, testes.lido('lead_conversao')),
  'Lead Banco Conversão:11987650001:Instagram:qualificado:false');
select testes.igual('conversão repetida devolve a mesma paciente, sem duplicar',
  format($q$ select (public.lead_converter_em_paciente(%L) = %L::uuid)::text || ':' ||
        (select count(*) from public.pacientes where nome = 'Lead Banco Conversão') $q$,
    testes.lido('lead_conversao'), testes.lido('paciente_do_lead')),
  'true:1');

select testes.linhas('recepção cadastra lead que vai ser perdido',
  $q$ insert into public.leads (nome, origem) values ('Lead Banco Perda', 'Indicação') $q$, 1);
select testes.guardar('lead_perda', (select id::text from public.leads where nome = 'Lead Banco Perda'));
select testes.linhas('perda com motivo',
  format($q$ update public.leads set etapa = 'perdido', motivo_perda = 'Preço acima do esperado' where id = %L $q$,
    testes.lido('lead_perda')), 1);
select testes.falha('lead perdido não vira paciente sem ser reaberto',
  format($q$ select public.lead_converter_em_paciente(%L) $q$, testes.lido('lead_perda')), 'P0001');
select testes.falha('lead perdido não recebe contato',
  format($q$ insert into public.lead_interacoes (lead_id, canal) values (%L, 'telefone') $q$, testes.lido('lead_perda')), 'P0001');
select testes.linhas('lead perdido é reaberto',
  format($q$ update public.leads set etapa = 'novo', motivo_perda = null where id = %L $q$, testes.lido('lead_perda')), 1);
select testes.linhas('e perdido de novo, com outro motivo',
  format($q$ update public.leads set etapa = 'perdido', motivo_perda = 'Sem horário disponível' where id = %L $q$,
    testes.lido('lead_perda')), 1);
select testes.igual('cada perda guarda o próprio motivo na trilha',
  format($q$ select string_agg(motivo, ' | ' order by id) from public.lead_etapas where lead_id = %L and para = 'perdido' $q$,
    testes.lido('lead_perda')),
  'Preço acima do esperado | Sem horário disponível');
select testes.igual('o lead guarda só o motivo atual',
  format($q$ select motivo_perda from public.leads where id = %L $q$, testes.lido('lead_perda')), 'Sem horário disponível');

-- Contatos comerciais (0030) e o que a 0031 passou a conferir.
select testes.linhas('recepção registra contato com retorno para hoje',
  format($q$ insert into public.lead_interacoes (lead_id, canal, observacao, proximo_contato)
      values (%L, 'whatsapp', 'Pediu os valores por mensagem.', (now() at time zone 'America/Sao_Paulo')::date) $q$,
    testes.lido('lead_conversao')), 1);
select testes.igual('contato: autor e hora escritos pelo banco',
  format($q$ select (por = auth.uid())::text || ':' || (em > now() - interval '1 minute')::text
      from public.lead_interacoes where lead_id = %L $q$, testes.lido('lead_conversao')),
  'true:true');
select testes.igual('o contato atualiza o resumo do lead',
  format($q$ select (proximo_contato = (now() at time zone 'America/Sao_Paulo')::date)::text || ':' || (ultimo_contato_em is not null)::text
      from public.leads where id = %L $q$, testes.lido('lead_conversao')),
  'true:true');
select testes.falha('contato não informa o autor',
  format($q$ insert into public.lead_interacoes (lead_id, canal, por) values (%L, 'telefone', auth.uid()) $q$,
    testes.lido('lead_conversao')), '42501');
select testes.falha('contato não informa a hora',
  format($q$ insert into public.lead_interacoes (lead_id, canal, em) values (%L, 'telefone', now() - interval '3 days') $q$,
    testes.lido('lead_conversao')), '42501');
select testes.falha('retorno no passado é recusado',
  format($q$ insert into public.lead_interacoes (lead_id, canal, proximo_contato)
      values (%L, 'telefone', (now() at time zone 'America/Sao_Paulo')::date - 1) $q$, testes.lido('lead_conversao')), 'P0001');
select testes.falha('canal fora da lista é recusado',
  format($q$ insert into public.lead_interacoes (lead_id, canal) values (%L, 'sinal de fumaça') $q$,
    testes.lido('lead_conversao')), '23514');
select testes.falha('observação acima de 1000 caracteres é recusada',
  format($q$ insert into public.lead_interacoes (lead_id, canal, observacao) values (%L, 'email', repeat('x', 1001)) $q$,
    testes.lido('lead_conversao')), '23514');
select testes.linhas('contato sem retorno',
  format($q$ insert into public.lead_interacoes (lead_id, canal, observacao) values (%L, 'telefone', 'Ligou de volta e vai pensar.') $q$,
    testes.lido('lead_conversao')), 1);
select testes.igual('o resumo segue o contato mais recente: sem retorno programado',
  format($q$ select coalesce(proximo_contato::text, 'sem retorno') from public.leads where id = %L $q$, testes.lido('lead_conversao')),
  'sem retorno');
select testes.falha('ninguém edita um contato registrado',
  format($q$ update public.lead_interacoes set observacao = 'reescrito' where lead_id = %L $q$, testes.lido('lead_conversao')), '42501');
select testes.falha('ninguém apaga um contato registrado',
  format($q$ delete from public.lead_interacoes where lead_id = %L $q$, testes.lido('lead_conversao')), '42501');

select testes.como('admin@cockpit.local');

select testes.linhas('administradora registra contato com retorno em uma semana',
  format($q$ insert into public.lead_interacoes (lead_id, canal, observacao, proximo_contato)
      values (%L, 'presencial', 'Passou na clínica para conhecer.', (now() at time zone 'America/Sao_Paulo')::date + 7) $q$,
    testes.lido('lead_conversao')), 1);
select testes.igual('contato entra na auditoria',
  format($q$ select count(*)::text from public.auditoria where tabela = 'lead_interacoes' and dados ->> 'lead_id' = %L $q$,
    testes.lido('lead_conversao')), '3');

-- Agenda e Financeiro movem o funil pelo banco.
select testes.como('recepcao@cockpit.local');

select testes.linhas('atendimento para a paciente vinda do lead',
  format($q$ insert into public.atendimentos (paciente_id, profissional_id, procedimento_id, inicio, duracao_min)
      values (%L, 'a0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000001', (current_date + 500) + time '09:00', 45) $q$,
    testes.lido('paciente_do_lead')), 1);
select testes.igual('o agendamento avança o lead',
  format($q$ select etapa::text from public.leads where id = %L $q$, testes.lido('lead_conversao')), 'agendamento');

select testes.guardar('venda_do_lead', public.venda_registrar(
  testes.lido('paciente_do_lead')::uuid, 'b0000000-0000-4000-8000-000000000001', current_date,
  1450, 0, 'pix', 1, null, 0, 0, false, null, null, 'previsto', current_date + 7, null, 'Venda do lead')::text);
select testes.igual('a venda converte o lead: ganho, com a venda real e sem retorno pendente',
  format($q$ select etapa::text || ':' || (venda_id = %L::uuid)::text || ':' || coalesce(proximo_contato::text, 'sem retorno')
      from public.leads where id = %L $q$, testes.lido('venda_do_lead'), testes.lido('lead_conversao')),
  'ganho:true:sem retorno');
select testes.igual('a trilha registra o caminho inteiro',
  format($q$ select string_agg(para::text, '>' order by id) from public.lead_etapas where lead_id = %L $q$,
    testes.lido('lead_conversao')),
  'novo>qualificado>agendamento>ganho');
select testes.falha('lead ganho não volta de etapa',
  format($q$ update public.leads set etapa = 'qualificado' where id = %L $q$, testes.lido('lead_conversao')), '23514');
select testes.falha('lead ganho não recebe contato comercial',
  format($q$ insert into public.lead_interacoes (lead_id, canal) values (%L, 'whatsapp') $q$, testes.lido('lead_conversao')), 'P0001');
select testes.igual('o histórico comercial fica depois do ganho',
  format($q$ select count(*)::text from public.lead_interacoes where lead_id = %L $q$, testes.lido('lead_conversao')), '3');

select testes.linhas('recepção cadastra lead para acompanhar',
  $q$ insert into public.leads (nome, origem) values ('Lead Banco Retorno', 'Google') $q$, 1);
select testes.guardar('lead_retorno', (select id::text from public.leads where nome = 'Lead Banco Retorno'));
select testes.linhas('contato com retorno em três dias',
  format($q$ insert into public.lead_interacoes (lead_id, canal, proximo_contato)
      values (%L, 'instagram', (now() at time zone 'America/Sao_Paulo')::date + 3) $q$, testes.lido('lead_retorno')), 1);
select testes.linhas('lead acompanhado é perdido',
  format($q$ update public.leads set etapa = 'perdido', motivo_perda = 'Escolheu outra clínica' where id = %L $q$,
    testes.lido('lead_retorno')), 1);
select testes.igual('encerrar limpa o retorno e preserva o histórico',
  format($q$ select coalesce(proximo_contato::text, 'sem retorno') || ':' || (ultimo_contato_em is not null)::text || ':' ||
        (select count(*) from public.lead_interacoes where lead_id = %1$L)
      from public.leads where id = %1$L $q$, testes.lido('lead_retorno')),
  'sem retorno:true:1');
select testes.linhas('recepção cadastra lead com retorno que vai atrasar',
  $q$ insert into public.leads (nome, origem) values ('Lead Banco Atrasado', 'WhatsApp') $q$, 1);
select testes.guardar('lead_atrasado', (select id::text from public.leads where nome = 'Lead Banco Atrasado'));

-- Manutenção pelo SQL do projeto (sem sessão): importa histórico, mas o
-- lead encerrado continua sem retorno e o resumo não volta no tempo.
select testes.como(null);
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);

select testes.igual('lead encerrado não guarda retorno nem pelo SQL do projeto',
  format($q$ with feito as (update public.leads set proximo_contato = current_date + 5 where id = %L returning proximo_contato)
      select coalesce(proximo_contato::text, 'sem retorno') from feito $q$, testes.lido('lead_retorno')),
  'sem retorno');
select testes.igual('a CHECK do lead encerrado sem retorno existe',
  $q$ select count(*)::text from pg_constraint where conname = 'leads_encerrado_sem_retorno' and contype = 'c' $q$, '1');
select testes.linhas('importação de contato antigo pelo SQL',
  format($q$ insert into public.lead_interacoes (lead_id, canal, observacao, em)
      values (%L, 'telefone', 'Contato antigo importado.', now() - interval '30 days') $q$, testes.lido('lead_retorno')), 1);
select testes.igual('o contato antigo não volta o resumo no tempo',
  format($q$ select (ultimo_contato_em = now())::text from public.leads where id = %L $q$, testes.lido('lead_retorno')), 'true');
select testes.linhas('retorno que já passou só entra sem sessão (importação)',
  format($q$ insert into public.lead_interacoes (lead_id, canal, proximo_contato)
      values (%L, 'telefone', (now() at time zone 'America/Sao_Paulo')::date - 2) $q$, testes.lido('lead_atrasado')), 1);
select testes.igual('é o retorno atrasado da carteira',
  format($q$ select ((now() at time zone 'America/Sao_Paulo')::date - proximo_contato)::text from public.leads where id = %L $q$,
    testes.lido('lead_atrasado')), '2');

-- ---------------------------------------------------------------------
-- Limpeza dos dados de exemplo (`supabase/dados-exemplo-limpar.sql`)
--
-- Por último, porque apaga o seed — e tudo volta no ROLLBACK. O
-- `npm run test:banco` injeta o script de limpeza duas vezes no lugar das
-- marcas abaixo, e roda como o SQL do projeto (sem sessão), que é como o
-- `npm run dados:limpar` roda. Até aqui os testes já deixaram dado real
-- apontando para o exemplo: vendas, documentos e o prontuário.
-- ---------------------------------------------------------------------

-- Uma tarefa real presa a um atendimento de exemplo.
select testes.como('recepcao@cockpit.local');
select testes.guardar('atendimento_exemplo_com_tarefa',
  (select id::text from public.atendimentos where exemplo order by inicio, id limit 1));
select testes.linhas('recepção cria tarefa real num atendimento de exemplo',
  format($q$ insert into public.pendencias (tipo, paciente_id, atendimento_id, descricao)
      select 'confirmacao', paciente_id, id, 'Tarefa real (teste da limpeza)' from public.atendimentos where id = %L $q$,
    testes.lido('atendimento_exemplo_com_tarefa')), 1);

select testes.como(null);
select set_config('role', 'postgres', true);
select set_config('request.jwt.claims', '', true);

-- Uma venda de exemplo inteira: venda, recebimento, histórico e ajuste.
with v as (
  insert into public.vendas (paciente_id, procedimento_id, data_venda, valor_original, desconto, valor_final,
    forma, parcelas, taxa_percentual, taxa_valor, valor_liquido, exemplo)
  values ('c0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000002', current_date,
    200, 0, 200, 'pix', 1, 0, 0, 200, true)
  returning id
), r as (
  insert into public.recebimentos (venda_id, paciente_id, valor, forma, situacao, vencimento, recebido_em, valor_recebido, exemplo)
  select id, 'c0000000-0000-4000-8000-000000000005', 200, 'pix', 'recebido', current_date, current_date, 200, true from v
  returning id, venda_id
), h as (
  insert into public.venda_alteracoes (venda_id, tipo, de, para, motivo)
  select venda_id, 'forma_pagamento', '{}', '{}', 'exemplo' from r
)
insert into public.ajustes_financeiros (venda_id, recebimento_id, valor, motivo, exemplo)
select venda_id, id, 5, 'exemplo', true from r;
select testes.guardar('venda_exemplo',
  (select id::text from public.vendas where exemplo and paciente_id = 'c0000000-0000-4000-8000-000000000005'));

create function testes.reais() returns text
language sql stable as $$
  select concat_ws(':',
    (select count(*) from public.pacientes where not exemplo),
    (select count(*) from public.atendimentos where not exemplo),
    (select count(*) from public.pendencias where not exemplo),
    (select count(*) from public.retornos where not exemplo),
    (select count(*) from public.recebimentos where not exemplo),
    (select count(*) from public.vendas where not exemplo),
    (select count(*) from public.venda_alteracoes h join public.vendas v on v.id = h.venda_id where not v.exemplo),
    (select count(*) from public.ajustes_financeiros where not exemplo),
    (select count(*) from public.despesas where not exemplo),
    (select count(*) from public.prontuarios),
    (select count(*) from public.prontuario_imagens),
    (select count(*) from public.documentos),
    (select count(*) from public.auditoria where (dados ->> 'exemplo')::boolean is not true))
$$;

create function testes.retrato() returns text
language sql stable as $$
  select concat_ws(':', testes.reais(),
    (select count(*) from public.pacientes where exemplo),
    (select count(*) from public.atendimentos where exemplo),
    (select count(*) from public.recebimentos where exemplo),
    (select count(*) from public.vendas where exemplo),
    (select count(*) from public.procedimentos where exemplo),
    (select count(*) from public.profissionais where exemplo),
    (select count(*) from public.auditoria))
$$;

select testes.guardar('reais_antes', testes.reais());

-- @@dados-exemplo-limpar.sql@@

select set_config('role', 'postgres', true);
select testes.guardar('retrato_1', testes.retrato());

-- @@dados-exemplo-limpar.sql@@

select set_config('role', 'postgres', true);

select testes.igual('limpeza: nenhum dado real sumiu',
  $q$ select testes.reais() $q$, testes.lido('reais_antes'));
select testes.igual('limpeza: rodar de novo não apaga mais nada',
  $q$ select testes.retrato() $q$, testes.lido('retrato_1'));
select testes.igual('limpeza: venda de exemplo sai com recebimento, histórico e ajuste',
  format($q$ select concat_ws(':',
        (select count(*) from public.vendas where exemplo),
        (select count(*) from public.ajustes_financeiros where exemplo),
        (select count(*) from public.venda_alteracoes where venda_id = %L),
        (select count(*) from public.despesas where exemplo),
        (select count(*) from public.pendencias where exemplo),
        (select count(*) from public.retornos where exemplo)) $q$, testes.lido('venda_exemplo')),
  '0:0:0:0:0:0');
select testes.igual('limpeza: só fica paciente de exemplo que um dado real aponta',
  $q$ select count(*)::text from public.pacientes p
       where p.exemplo
         and not exists (select 1 from public.atendimentos x where x.paciente_id = p.id)
         and not exists (select 1 from public.pendencias x where x.paciente_id = p.id)
         and not exists (select 1 from public.retornos x where x.paciente_id = p.id)
         and not exists (select 1 from public.recebimentos x where x.paciente_id = p.id)
         and not exists (select 1 from public.vendas x where x.paciente_id = p.id)
         and not exists (select 1 from public.prontuarios x where x.paciente_id = p.id)
         and not exists (select 1 from public.documentos x where x.paciente_id = p.id)
         and not exists (select 1 from public.leads x where x.paciente_id = p.id) $q$,
  '0');
select testes.igual('limpeza: lead real mantém a paciente e o procedimento de exemplo que aponta',
  format($q$ select paciente_id::text || ':' || procedimento_interesse_id::text from public.leads where id = %L $q$,
    testes.lido('lead_limpeza')),
  'c0000000-0000-4000-8000-000000000013:b0000000-0000-4000-8000-000000000009');
select testes.igual('limpeza: procedimento de exemplo com meta comercial própria fica',
  $q$ select count(*)::text from public.procedimentos where id = 'b0000000-0000-4000-8000-000000000008' $q$, '1');
select testes.igual('limpeza: paciente de exemplo com venda real fica',
  $q$ select count(*)::text from public.pacientes where id = 'c0000000-0000-4000-8000-000000000001' $q$, '1');
select testes.igual('limpeza: atendimento de exemplo com tarefa real fica',
  format($q$ select count(*)::text from public.atendimentos where id = %L $q$, testes.lido('atendimento_exemplo_com_tarefa')),
  '1');
select testes.igual('limpeza: sobra de exemplo só onde há dado real (atendimentos e profissionais)',
  $q$ select (select count(*) from public.atendimentos a where a.exemplo
               and not exists (select 1 from public.pendencias x where x.atendimento_id = a.id and not x.exemplo)
               and not exists (select 1 from public.retornos x where x.atendimento_origem_id = a.id and not x.exemplo)
               and not exists (select 1 from public.recebimentos x where x.atendimento_id = a.id and not x.exemplo)
               and not exists (select 1 from public.prontuarios x where x.atendimento_id = a.id))
          || ':' ||
          (select count(*) from public.profissionais p where p.exemplo
               and not exists (select 1 from public.atendimentos x where x.profissional_id = p.id)) $q$,
  '0:0');
select testes.igual('limpeza: auditoria de exemplo só sai com a linha',
  $q$ select (select count(*) from public.auditoria a
               where a.tabela = 'pacientes' and (a.dados ->> 'exemplo')::boolean is true
                 and not exists (select 1 from public.pacientes p where p.id::text = a.registro_id))
          || ':' ||
          ((select count(*) from public.auditoria
             where tabela = 'pacientes' and registro_id = 'c0000000-0000-4000-8000-000000000001') > 0) $q$,
  '0:true');

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
