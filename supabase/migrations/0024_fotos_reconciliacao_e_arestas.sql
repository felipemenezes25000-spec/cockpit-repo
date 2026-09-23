-- =====================================================================
-- Migração 0024: fotos conferidas contra o Storage, e três arestas de
-- privilégio e desempenho
--
-- 1. STORAGE × POSTGRES NÃO É TRANSACIONAL.
--    A foto de evolução mora em dois lugares: o arquivo no bucket
--    `prontuario-imagens` e a linha em `prontuario_imagens`. Enviar grava o
--    arquivo e depois a linha; eliminar apaga o arquivo e depois a linha
--    (0012). Se a segunda metade falha — rede, sessão expirada, o banco
--    recusa —, sobra:
--      - uma LINHA SEM ARQUIVO: a foto aparece quebrada na evolução;
--      - um ARQUIVO SEM LINHA: foto de paciente guardada sem registro,
--        invisível na tela e fora do alcance da eliminação pela LGPD.
--    Nada disso se descobria sem abrir o painel do Supabase.
--
--    `public.prontuario_imagens_reconciliar()` lista as duas sobras, só
--    para a administradora e SÓ LEITURA: não apaga nem corrige nada. Dado
--    de saúde não sai sem decisão de uma pessoa (a eliminação continua
--    sendo a da 0012, com motivo). A função é SECURITY INVOKER: enxerga o
--    bucket pela política de leitura do Storage que a administradora já
--    tem (0011), e a linha pela RLS de `prontuario_imagens`. Devolve o
--    mínimo — situação, caminho, ids e desde quando —, nunca o nome
--    original do arquivo (que pode trazer o nome da paciente).
--
--    Arquivo recém-enviado aparece como "sem registro" por alguns segundos,
--    até a aplicação gravar a linha. Por isso a função devolve `desde`: a
--    tela decide a folga, não o banco.
--
-- 2. UPDATE POR COLUNA EM `prontuario_imagens`.
--    A 0019 deu UPDATE na tabela inteira à administradora. Pela API ela
--    podia trocar `caminho` e `prontuario_id` e fazer a linha de uma
--    paciente apontar o arquivo de outra — a CHECK da 0022 confere a
--    FORMA do caminho, não que ele seja o arquivo enviado. A aplicação só
--    muda legenda, data da captura e arquivamento; `ordem` é de exibição.
--    O resto da linha é o registro do envio e não muda mais.
--
-- 3. SEQUÊNCIAS SEM `anon`.
--    O default do projeto concede UPDATE (nextval/setval) a `anon` e a
--    `authenticated` em toda sequência de `public`. Nenhuma está exposta
--    pela API hoje, mas `anon` não tem o que fazer com nenhuma delas, e
--    `authenticated` só precisa das que alimentam INSERT feito com a
--    sessão (versões de prontuário e de modelo, motivo da eliminação de
--    foto). Auditoria, trilha da agenda e respostas da anamnese são
--    gravadas por funções que rodam como dona. As que ficam passam de
--    UPDATE para USAGE: gerar o próximo id, sem `setval`.
--
-- 4. ÍNDICE PARA "DESPESAS PAGAS NO MÊS".
--    O painel do Financeiro filtra `despesas` por `situacao = 'paga'` e
--    faixa de `pago_em` a cada carregamento, e era o único filtro mensal
--    do Financeiro sem índice (`vendas.data_venda`, `recebimentos.
--    recebido_em` e `despesas.competencia` têm). EXPLAIN ANALYZE no banco
--    local com 20 mil despesas: Seq Scan de 1,8 ms (19.885 linhas
--    descartadas) contra Bitmap Index Scan de 0,09 ms. Parcial em `paga`,
--    que é o único estado que tem `pago_em`.
--    `ajustes_financeiros.criado_em` ficou SEM índice de propósito: ajuste
--    só nasce de alteração depois da confirmação — a tabela é pequena
--    para sempre, e índice ali só custaria escrita.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Reconciliação das fotos
-- ---------------------------------------------------------------------

create or replace function public.prontuario_imagens_reconciliar()
returns table (
  situacao text,
  caminho text,
  imagem_id uuid,
  prontuario_id uuid,
  desde timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if not private.e_administradora() then
    raise exception using
      errcode = '42501',
      message = 'A conferência das fotos é restrita à administradora.';
  end if;

  return query
    -- Linha que aponta arquivo que não existe mais no bucket.
    select 'metadado_sem_arquivo'::text,
           i.caminho,
           i.id,
           i.prontuario_id,
           i.criado_em
      from public.prontuario_imagens i
     where not exists (
       select 1 from storage.objects o
        where o.bucket_id = 'prontuario-imagens'
          and o.name = i.caminho
     )
    union all
    -- Arquivo no bucket que nenhuma linha aponta.
    select 'arquivo_sem_metadado'::text,
           o.name,
           null::uuid,
           case when split_part(o.name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                then split_part(o.name, '/', 1)::uuid
           end,
           o.created_at
      from storage.objects o
     where o.bucket_id = 'prontuario-imagens'
       and not exists (
         select 1 from public.prontuario_imagens i where i.caminho = o.name
       )
     order by 5, 2;
end;
$$;

revoke all on function public.prontuario_imagens_reconciliar() from public, anon;
grant execute on function public.prontuario_imagens_reconciliar() to authenticated;

comment on function public.prontuario_imagens_reconciliar is
  'Só leitura, só administradora: fotos com linha e sem arquivo no bucket (metadado_sem_arquivo) e arquivos no bucket sem linha (arquivo_sem_metadado). Não apaga nada.';

-- ---------------------------------------------------------------------
-- 2. Fotos: UPDATE só no que a tela edita
-- ---------------------------------------------------------------------

revoke update on public.prontuario_imagens from authenticated;
grant update (legenda, data_captura, arquivada, ordem) on public.prontuario_imagens to authenticated;

-- ---------------------------------------------------------------------
-- 3. Sequências
-- ---------------------------------------------------------------------

revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on sequences from anon;

revoke all on sequence public.auditoria_id_seq              from authenticated;
revoke all on sequence public.atendimento_situacoes_id_seq  from authenticated;
revoke all on sequence public.documento_campos_id_seq       from authenticated;

revoke all on sequence public.prontuario_versoes_id_seq            from authenticated;
revoke all on sequence public.modelo_documento_versoes_id_seq      from authenticated;
revoke all on sequence public.prontuario_imagem_eliminacoes_id_seq from authenticated;
grant usage on sequence public.prontuario_versoes_id_seq            to authenticated;
grant usage on sequence public.modelo_documento_versoes_id_seq      to authenticated;
grant usage on sequence public.prontuario_imagem_eliminacoes_id_seq to authenticated;

-- ---------------------------------------------------------------------
-- 4. Índice
-- ---------------------------------------------------------------------

create index despesas_pagas_no_periodo on public.despesas (pago_em)
  where situacao = 'paga';
