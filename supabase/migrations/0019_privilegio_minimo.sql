-- =====================================================================
-- Migração 0019: privilégio mínimo, declarado — e o "não se apaga"
-- passando a valer no banco
--
-- Três problemas de fundo, todos confirmados contra o schema efetivo
-- (as 18 migrações aplicadas em ordem num banco limpo):
--
-- 1. OS GRANTS DEPENDIAM DO PROJETO, NÃO DAS MIGRAÇÕES.
--    As tabelas da 0007 (vendas, venda_alteracoes, ajustes_financeiros,
--    taxas_cartao) nunca receberam GRANT explícito. Funcionavam porque o
--    projeto de produção concede tudo a `authenticated` por padrão. Num
--    projeto novo do Supabase o padrão mudou — `authenticated` só recebe
--    REFERENCES, TRIGGER e TRUNCATE —, e o Financeiro inteiro respondia
--    "permission denied" em qualquer leitura. Migração que só funciona no
--    banco em que nasceu não reconstrói o sistema num desastre.
--
--    E o padrão de produção concede demais: TRUNCATE não passa pela RLS.
--    Hoje o PostgREST não o expõe, mas a garantia não pode depender de
--    qual servidor HTTP está na frente.
--
--    Daqui em diante cada tabela declara exatamente o que `authenticated`
--    faz nela. O resto é revogado, e o default para as tabelas futuras
--    também deixa de conceder — tabela nova declara seus grants, como as
--    da 0010 em diante já faziam.
--
-- 2. O "NÃO SE APAGA" ERA REGRA SÓ DE APLICAÇÃO.
--    `recebimentos`, `despesas`, `taxas_cartao`, `pacientes`,
--    `atendimentos`, `retornos`, `pendencias`, `procedimentos` e
--    `profissionais` tinham política `for all` — que inclui DELETE. A
--    interface nunca apaga, mas quem chamasse a API apagava: despesa sem
--    rastro nenhum, atendimento com a trilha junto (cascade), tarefa de
--    contato que é o histórico do relacionamento.
--
--    As políticas `for all` viram uma por operação, sem DELETE. A única
--    tabela que continua podendo apagar é `prontuario_imagens`, pela
--    LGPD (ver 0011 e 0012) — exceção deliberada, não esquecimento.
--
--    E confirmar recebimento, que o AGENTS.md listava como "só na ação de
--    servidor", passa a ser do financeiro também no banco: UPDATE em
--    `recebimentos` exige `e_financeira()`. A inserção do recebimento de
--    uma venda muda de porta na 0020, junto com o resto do Financeiro.
--
-- 3. AUDITORIA COM BURACOS.
--    `retornos` e `pendencias` guardam dado de paciente e não tinham
--    gatilho de auditoria — a regra 4 das migrações. `despesas` sumiria
--    sem rastro. `taxas_cartao`, `procedimentos` e `profissionais` mudam
--    o padrão de dinheiro e de agenda. E `perfis` — quem ganhou ou perdeu
--    acesso, e quando — não deixava marca nenhuma.
--
-- De quebra, duas dívidas do AGENTS.md §13:
--
--   - `perfis_atualiza_proprio_nome` fixava o papel, mas deixava a pessoa
--     mexer em `ativo` e no resto da própria linha. Um gatilho recusa, para
--     quem não é administradora, qualquer mudança que não seja o nome.
--   - As funções de gatilho da 0013 (`documento_congelar` e
--     `documento_texto_nao_muda`) nasceram executáveis por `anon` e por
--     `authenticated`, contra a regra 7. Chamá-las fora de gatilho falha,
--     mas função de gatilho não tem por que aparecer para ninguém.
--
-- O que NÃO muda: nenhuma leitura muda de alcance. Quem lia continua
-- lendo exatamente as mesmas linhas.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Grants: tudo revogado, depois só o necessário
-- ---------------------------------------------------------------------

revoke all on all tables in schema public from anon, public;
revoke all on all tables in schema public from authenticated;

grant select, update                 on public.perfis                        to authenticated;
grant select, insert, update         on public.profissionais                 to authenticated;
grant select, insert, update         on public.procedimentos                 to authenticated;
grant select, insert, update         on public.pacientes                     to authenticated;
grant select, insert, update         on public.atendimentos                  to authenticated;
grant select                         on public.atendimento_situacoes         to authenticated;
grant select, insert, update         on public.retornos                      to authenticated;
grant select, insert, update         on public.pendencias                    to authenticated;
grant select, insert, update         on public.recebimentos                  to authenticated;
grant select, insert, update         on public.despesas                      to authenticated;
grant select                         on public.auditoria                     to authenticated;
grant select, insert, update         on public.taxas_cartao                  to authenticated;
grant select, insert, update         on public.vendas                        to authenticated;
grant select, insert                 on public.venda_alteracoes              to authenticated;
grant select, insert                 on public.ajustes_financeiros           to authenticated;
grant select, insert, update         on public.prontuarios                   to authenticated;
grant select, insert                 on public.prontuario_versoes            to authenticated;
grant select, insert, update, delete on public.prontuario_imagens            to authenticated;
grant select, insert                 on public.prontuario_imagem_eliminacoes to authenticated;
grant select, insert, update         on public.modelos_documento             to authenticated;
grant select, insert                 on public.modelo_documento_versoes      to authenticated;
grant select, insert, update         on public.documentos                    to authenticated;
grant select, insert                 on public.documento_assinaturas         to authenticated;
grant select                         on public.documento_links               to authenticated;
grant select, update                 on public.documento_campos              to authenticated;

-- O grant de coluna da 0015 sai junto com o `revoke all` da tabela. Volta
-- igual: só o canal, no clique do envio.
grant update (canal_envio) on public.documento_links to authenticated;

-- Tabelas futuras nascem sem privilégio nenhum para `authenticated`. Quem
-- cria a tabela declara o que ela precisa, no mesmo arquivo.
alter default privileges in schema public revoke all on tables from authenticated;

-- ---------------------------------------------------------------------
-- 2. Políticas: uma por operação, sem DELETE
-- ---------------------------------------------------------------------

-- Pacientes, agenda, retornos e pendências: trabalho de todo perfil ativo.
drop policy if exists pacientes_operacao on public.pacientes;
create policy pacientes_leitura on public.pacientes
  for select to authenticated using (private.tem_acesso());
create policy pacientes_insercao on public.pacientes
  for insert to authenticated with check (private.tem_acesso());
create policy pacientes_edicao on public.pacientes
  for update to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists atendimentos_operacao on public.atendimentos;
create policy atendimentos_leitura on public.atendimentos
  for select to authenticated using (private.tem_acesso());
create policy atendimentos_insercao on public.atendimentos
  for insert to authenticated with check (private.tem_acesso());
create policy atendimentos_edicao on public.atendimentos
  for update to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists retornos_operacao on public.retornos;
create policy retornos_leitura on public.retornos
  for select to authenticated using (private.tem_acesso());
create policy retornos_insercao on public.retornos
  for insert to authenticated with check (private.tem_acesso());
create policy retornos_edicao on public.retornos
  for update to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

drop policy if exists pendencias_operacao on public.pendencias;
create policy pendencias_leitura on public.pendencias
  for select to authenticated using (private.tem_acesso());
create policy pendencias_insercao on public.pendencias
  for insert to authenticated with check (private.tem_acesso());
create policy pendencias_edicao on public.pendencias
  for update to authenticated
  using (private.tem_acesso()) with check (private.tem_acesso());

-- Catálogo e equipe: todos leem, só a administradora escreve.
drop policy if exists procedimentos_escrita on public.procedimentos;
create policy procedimentos_insercao on public.procedimentos
  for insert to authenticated with check (private.e_administradora());
create policy procedimentos_edicao on public.procedimentos
  for update to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

drop policy if exists profissionais_escrita on public.profissionais;
create policy profissionais_insercao on public.profissionais
  for insert to authenticated with check (private.e_administradora());
create policy profissionais_edicao on public.profissionais
  for update to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

drop policy if exists taxas_escrita on public.taxas_cartao;
create policy taxas_insercao on public.taxas_cartao
  for insert to authenticated with check (private.e_administradora());
create policy taxas_edicao on public.taxas_cartao
  for update to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

-- Recebimentos: todos leem (a recepção registra venda e acompanha o que
-- foi vendido); só o financeiro altera. A inserção fica restrita ao
-- financeiro aqui e ganha, na 0020, a porta própria da venda.
drop policy if exists recebimentos_operacao on public.recebimentos;
create policy recebimentos_leitura on public.recebimentos
  for select to authenticated using (private.tem_acesso());
create policy recebimentos_insercao on public.recebimentos
  for insert to authenticated with check (private.e_financeira());
create policy recebimentos_edicao on public.recebimentos
  for update to authenticated
  using (private.e_financeira()) with check (private.e_financeira());

-- Despesas: do financeiro, como antes — sem o DELETE.
drop policy if exists despesas_financeiro on public.despesas;
create policy despesas_leitura on public.despesas
  for select to authenticated using (private.e_financeira());
create policy despesas_insercao on public.despesas
  for insert to authenticated with check (private.e_financeira());
create policy despesas_edicao on public.despesas
  for update to authenticated
  using (private.e_financeira()) with check (private.e_financeira());

-- Perfis: a linha nasce pelo gatilho de cadastro (security definer) e não
-- se apaga pela API — `on delete cascade` de `auth.users` cuida disso
-- quando a conta sai. A administradora edita; a leitura não muda.
drop policy if exists perfis_admin_gerencia on public.perfis;
create policy perfis_admin_edicao on public.perfis
  for update to authenticated
  using (private.e_administradora()) with check (private.e_administradora());

-- ---------------------------------------------------------------------
-- 3. O próprio perfil: só o nome
-- ---------------------------------------------------------------------

create or replace function private.perfil_proprio_so_nome()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Sem usuário de sessão é manutenção pelo painel ou pelo SQL do projeto,
  -- que já passa por cima da RLS. A regra é sobre quem entra pela API.
  if auth.uid() is null or private.e_administradora() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.papel is distinct from old.papel
     or new.ativo is distinct from old.ativo
     or new.criado_em is distinct from old.criado_em then
    raise exception using
      errcode = '42501',
      message = 'No próprio perfil só o nome pode ser alterado.';
  end if;

  return new;
end;
$$;

revoke all on function private.perfil_proprio_so_nome() from public, anon, authenticated;

create trigger perfis_proprio_so_nome
  before update on public.perfis
  for each row execute function private.perfil_proprio_so_nome();

-- ---------------------------------------------------------------------
-- 4. Auditoria onde faltava
-- ---------------------------------------------------------------------

create trigger auditar_retornos
  after insert or update or delete on public.retornos
  for each row execute function public.auditar();

create trigger auditar_pendencias
  after insert or update or delete on public.pendencias
  for each row execute function public.auditar();

create trigger auditar_despesas
  after insert or update or delete on public.despesas
  for each row execute function public.auditar();

create trigger auditar_taxas_cartao
  after insert or update or delete on public.taxas_cartao
  for each row execute function public.auditar();

create trigger auditar_procedimentos
  after insert or update or delete on public.procedimentos
  for each row execute function public.auditar();

create trigger auditar_profissionais
  after insert or update or delete on public.profissionais
  for each row execute function public.auditar();

create trigger auditar_perfis
  after insert or update or delete on public.perfis
  for each row execute function public.auditar();

-- ---------------------------------------------------------------------
-- 5. Funções de gatilho fora do alcance de quem chama a API
-- ---------------------------------------------------------------------

revoke all on function public.documento_congelar()       from public, anon, authenticated;
revoke all on function public.documento_texto_nao_muda() from public, anon, authenticated;
revoke all on function public.tocar_atualizado_em()      from public, anon, authenticated;
revoke all on function public.auditar()                  from public, anon, authenticated;
revoke all on function public.registrar_situacao_atendimento() from public, anon, authenticated;
