-- =====================================================================
-- Migração 0015: registrar por onde o link foi enviado, quando foi
--
-- A 0014 gravava `canal_envio` na criação do link, a partir de um campo
-- que a recepção digitava antes de enviar. Era um palpite: o texto dizia
-- "WhatsApp" e nada garantia que o envio tivesse acontecido por lá.
--
-- A tela agora tem um botão que abre o WhatsApp com o link pronto, e o
-- canal passa a ser gravado NO CLIQUE — depois de o envio começar, não
-- antes de ser decidido. Evidência que descreve intenção não é
-- evidência; esta descreve um ato.
--
-- Por que um GRANT de coluna em vez de uma função: a única coisa que
-- muda é um texto de metadado da equipe. Envolver isso numa função
-- daria a impressão de que há regra a proteger, e não há — o que
-- precisa continuar fechado é tudo o mais da linha, e o grant de coluna
-- fecha exatamente isso. `token_hash`, `expira_em` e `revogado_em`
-- seguem inalcançáveis por UPDATE.
-- =====================================================================

create policy documento_links_canal on public.documento_links
  for update to authenticated
  using (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  )
  with check (
    exists (
      select 1 from public.documentos d
      where d.id = documento_id
        and private.tem_acesso()
        and (d.tipo <> 'anamnese' or private.e_administradora())
    )
  );

-- Só esta coluna. O resto da linha continua sem UPDATE para `authenticated`.
grant update (canal_envio) on public.documento_links to authenticated;

comment on column public.documento_links.canal_envio is
  'Por onde o link foi efetivamente enviado. Gravado no clique do envio, não na criação.';
