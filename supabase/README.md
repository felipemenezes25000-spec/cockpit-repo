# Banco de dados

O banco é um Postgres gerenciado pelo Supabase, na região **us-west-2
(Oregon, EUA)** — exceção à regra de São Paulo, decisão do dono (ver Projeto). Toda alteração de estrutura passa por um arquivo de migração
versionado nesta pasta — nada é alterado direto pelo painel.

## Migrações

| Arquivo | O que faz |
|---|---|
| `0001_fundacao.sql` | Perfis e acesso, equipe, catálogo de procedimentos, pacientes, agenda, relacionamento, financeiro e auditoria. RLS ligada em todas as tabelas. |
| `0002_endurece_funcoes.sql` | Fixa o `search_path` das funções e tira as funções de gatilho da API pública. |
| `0003_funcoes_em_schema_privado.sql` | Move as funções auxiliares das políticas para o schema `private`, fora do que o PostgREST publica. |
| `0004_cadastro_nao_concede_acesso.sql` | Perfil novo nasce inativo e como recepção. O papel deixa de vir do metadado do cadastro. |
| `0005_marca_dados_de_exemplo.sql` | Coluna `exemplo` nas tabelas de conteúdo, para o sistema saber o que é fictício e avisar na tela. |
| `0006_financeiro_enums.sql` | Enums do Financeiro: formas boleto/outra, papel `financeiro`, situações do recebimento (em_aberto vira previsto), tipo de cartão e situação de despesa. |
| `0007_financeiro_fundacao.sql` | Vendas, tabela de taxas de cartão, histórico de alterações e ajustes. A conta fecha por CHECK constraint; vendas, histórico e ajustes sem política de DELETE (taxas e despesas ficam com `for all`, que inclui DELETE, até a 0019). |
| `0008_operacoes_de_venda.sql` | Funções `venda_registrar` e `venda_alterar_pagamento`: gravações compostas em transação, com a RLS de quem chama. |
| `0009_anon_fora_das_tabelas_novas.sql` | Revoga o anon das tabelas novas e muda o default para as futuras já nascerem sem o grant. |
| `0010_prontuarios.sql` | Prontuários clínicos versionados, com RLS restrita à administradora e funções transacionais de criação/nova versão. |
| `0011_prontuario_imagens.sql` | Fotos de evolução: bucket privado `prontuario-imagens`, metadados em `prontuario_imagens` e as quatro políticas de `storage.objects` — as primeiras do projeto. Primeira política de DELETE deliberada, por causa da LGPD — e, desde a 0019, a única. |
| `0012_eliminacao_de_imagem.sql` | Onde o motivo da eliminação pousa: `prontuario_imagem_eliminacoes` (sem UPDATE, sem DELETE) e a função `prontuario_imagem_eliminar`, que registra e apaga na mesma transação. O arquivo sai antes, pela aplicação. |
| `0013_documentos.sql` | Documentos e contratos: `modelos_documento` + versões, `documentos` com texto congelado e hash por gatilho, `documento_assinaturas`. Funções `documento_emitir` (lê o corpo do banco, nunca do cliente) e `documento_assinar`. |
| `0014_assinatura_por_link.sql` | Assinatura à distância. `documento_links` guarda o **hash** do token, nunca o token. Abre a **primeira superfície anônima** do projeto: três funções `security definer` executáveis por `anon` (`documento_link_estado`, `documento_para_assinatura`, `documento_assinar_por_link`) — nenhuma tabela. Segundo fator: data de nascimento, com o link se fechando em 10 erros. |
| `0015_canal_do_link.sql` | `grant update (canal_envio)` — grant de **coluna**, para a equipe registrar por onde o link foi enviado no clique do envio. `token_hash`, `expira_em` e `revogado_em` seguem sem UPDATE. |
| `0016_via_da_paciente.sql` | Assinar deixa de revogar o link, e `documento_para_assinatura` passa a devolver o texto e os dados da assinatura quando `ja_assinado`. É por aí que a paciente salva a via dela. |
| `0017_anamnese.sql` | Anamnese com campos de formulário. Perguntas em `modelo_documento_versoes.campos` (versionam com o texto), respostas em `documento_campos` com a pergunta congelada em cada linha. `documento_responder_por_link` é a quarta função alcançável por `anon` — e continua sendo só função, nenhuma tabela. |
| `0018_emissao_grava_perguntas.sql` | Corrige a 0017: `documento_emitir` é invoker e esbarrava na RLS de `documento_campos`, que não tem política de INSERT. As perguntas passam a entrar só por `private.documento_campos_criar` (definer), que copia da versão do modelo do próprio documento, uma vez. |
| `0019_privilegio_minimo.sql` | Grants declarados tabela a tabela (as da 0007 dependiam do padrão do projeto) e default sem privilégio para `authenticated`; políticas `for all` viram uma por operação, **sem DELETE**; UPDATE de recebimento só do financeiro; auditoria em retornos, pendências, despesas, taxas, procedimentos, profissionais e perfis; o próprio perfil só muda o nome; funções de gatilho fora do alcance de `anon`/`authenticated`. |
| `0020_financeiro_conferido_no_banco.sql` | Gatilho `vendas_confere_taxa` (forma, parcelas, tabela padrão, percentual e valor da taxa); `recebimentos_confirmado_imutavel`; `private.recebimento_da_venda_criar` como porta do recebimento; `venda_registrar` e `venda_alterar_pagamento` recriadas com a mesma assinatura. |
| `0021_agenda_sem_choque.sql` | Gatilho `atendimentos_sem_choque`: sobreposição exata recusada com `23P01`, sob trava por profissional. |
| `0022_documentos_integridade.sql` | Documento só nasce do modelo e só muda `situacao`/`motivo_cancelamento`; transições só a partir de `emitido`; evidência da assinatura escrita pelo banco e assinatura fecha o documento; pergunta da anamnese congelada (UPDATE só nas colunas de resposta) e resposta só em documento `emitido`; link público com `for update` e `on conflict`; `campos_validos` mais estrita; prontuário sem troca de paciente e versão conferida; foto com caminho exato, eliminação só com motivo e Storage sem UPDATE. |
| `0023_venda_so_pela_funcao.sql` | Venda, histórico e ajuste só nascem e só mudam por `venda_registrar` e `venda_alterar_pagamento`, que viram `SECURITY DEFINER` e conferem o perfil na entrada (`private.tem_acesso()` / `private.e_financeira()`, 42501). Recebimento de venda só pela porta; o financeiro insere só recebimento solto e altera só `situacao`, `recebido_em` e `valor_recebido`. Gatilho `recebimentos_confirmacao_coerente`: sem data futura (fuso da clínica) e "recebido" só pelo líquido previsto. O cabeçalho traz a consulta que lista vendas antigas sem recebimento — a migração não mexe em dado existente. |
| `0024_fotos_reconciliacao_e_arestas.sql` | `public.prontuario_imagens_reconciliar()` (INVOKER, só administradora, só leitura): foto sem arquivo e arquivo sem linha. UPDATE de `prontuario_imagens` só em `legenda`, `data_captura`, `arquivada` e `ordem`; sequências sem `anon`; índice `despesas_pagas_no_periodo`. |
| `0025_contato_estruturado_e_arestas.sql` | `pendencias.origem` (enum `origem_pendencia`) no lugar do prefixo de texto do Relacionamento, com backfill dos registros antigos, constraint `pendencias_origem_coerente` e índice único de um contato por paciente, origem e dia; UPDATE de `pendencias` por coluna; `pacientes.busca` gerada sem acento (`unaccent`); teto de 160 no título do prontuário; `private.recebimento_da_venda_criar` sem EXECUTE para `authenticated`. Com contato repetido no mesmo dia ou título acima de 160 no histórico, a migração **falha** (pré-conferência abaixo) em vez de seguir sem o índice ou com a restrição `NOT VALID`. |
| `0026_marca_de_exemplo_e_privilegios.sql` | A marca `exemplo` não se grava pela API: com sessão, gatilho recusa INSERT marcado e UPDATE que troque a marca nas dez tabelas que o `dados:limpar` apaga (sem sessão passa); `private.sem_acento` com EXECUTE para `service_role`; privilégio padrão de sequência nova só com USAGE para `authenticated`. |
| `0027_banco_escreve_a_evidencia.sql` | Com sessão, o banco escreve e confere o que quem chamava dizia: versão de modelo na sequência, com perguntas válidas e autor e hora do banco; `tipo` do modelo fora do grant de UPDATE; quem respondeu a anamnese e quando (nulo pelo link); autor, hora e data de captura não futura da foto. `documento_para_assinatura` é refeita (drop + create) para devolver `assinado_canal`. CHECK `recebimentos_taxa_ate_o_valor`, NOT VALID e validada só sem legado. IP e dispositivo da assinatura ficam de fora (decisão do dono, `AGENTS.md` §13). |
| `0028_venda_idempotente_e_foto_do_arquivo.sql` | Venda idempotente: `vendas.chave_envio` + índice único parcial; `venda_registrar` ganha `p_chave uuid default null` (mesmo envio do mesmo perfil devolve a venda já criada). Foto só nasce com o objeto no bucket, e tipo e tamanho vêm dos metadados do Storage (`private.imagem_nasce_do_arquivo`). IP e dispositivo da assinatura comentados como declarados. |

## Projeto

Produção: ref **`pghmzbtfsaupwezglddo`**, região **us-west-2 (Oregon, EUA)**,
criado em 23/09/2026. Substitui o `Cockpit-Consultorio2` (ref
`khoaluytzzagtwmpaukx`, sa-east-1), que deixou de ser o de produção nessa data.

**A região contraria a regra de São Paulo, por decisão do dono em 23/09/2026**,
informado do custo: cada consulta vai do servidor da Vercel em `gru1` até o
Oregon e volta, e os dados de saúde ficam fora do Brasil. Voltar para São
Paulo exige projeto novo em `sa-east-1` e migração dos dados.

A região não pode ser alterada depois da criação — trocar exige projeto novo e
migração de dados. O primeiro projeto foi criado em `us-east-1` e descartado por
isso, antes de existir qualquer dado.

## Banco local (Docker)

```bash
npx supabase start       # sobe tudo, aplica as migrações e o seed (dados-exemplo.sql)
npm run local:usuarios   # contas de teste: supabase/usuarios-locais.json
npm run test:banco       # supabase/testes/permissoes.sql, por perfil
npx supabase db reset    # do zero: migrações + seed (as contas precisam ser recriadas)
```

### `dados:limpar` (`dados-exemplo-limpar.sql`)

Roda **num único bloco `do`** — ou sai tudo o que pode sair, ou nada sai. Apaga
só `exemplo = true`, das filhas para as mães. Linha de exemplo apontada por dado
real (uma venda real para a paciente de exemplo, um prontuário, um documento)
**fica**, e o relatório do fim mostra o que ficou, por tabela. Prontuário, fotos
e documentos **nunca** saem por script, mesmo marcados como exemplo. Rodar de
novo não apaga nada a mais.

O `test:banco` exercita o script de verdade: `scripts/testes-banco.mjs` troca a
marca `-- @@dados-exemplo-limpar.sql@@` de `testes/permissoes.sql` pelo
conteúdo do arquivo, dentro da transação desfeita no fim. Tabela nova com FK
para `pacientes`, `atendimentos`, `procedimentos` ou `profissionais` precisa
entrar nas condições do script — senão o bloco falha inteiro (sem apagar nada
pela metade) e o `test:banco` acusa.

`config.toml` usa as portas 5532x porque o Windows reserva 54286–54385 para o
Hyper-V. O banco local é onde toda migração nova se testa antes de produção:
`db reset` precisa passar do zero, e `test:banco` precisa continuar verde.

O Auth local tem o cadastro público e o login anônimo desligados
(`enable_signup = false` e `enable_anonymous_sign_ins = false`, em `[auth]`; o
`enable_signup = true` de `[auth.email]` só liga o login por e-mail) e JWT de 1
hora com rotação do refresh token. Ele não envia e-mail de verdade: o que o Auth
mandaria, como o link de recuperação de senha, cai na caixa de teste em
<http://127.0.0.1:55324>. O `email_sent = 2` de `[auth.rate_limit]` não vale
aqui: o próprio arquivo avisa que ele depende de SMTP configurado, e sem SMTP o
Auth local sobe praticamente sem limite de envio.

**Nunca crie usuário inserindo em `auth.users`** — nem no local. O script usa a
API de administração do Auth, como o painel.

## Pendente de aplicação em produção

> **Aplicado em 23/09/2026.** O projeto `pghmzbtfsaupwezglddo` nasceu vazio e
> recebeu as 28 migrações de uma vez (`db push`, 0001 → 0028, sem seed). As
> conferências do passo 6 bateram todas, nenhuma tabela de `public` ficou sem
> RLS, `anon` não tem grant em tabela e só executa as quatro funções do link;
> o `db:tipos` saiu idêntico ao `tipos-banco.ts` do repositório. Só depois veio
> o deploy na Vercel. Pré-conferência e backfill não se aplicaram (sem dado
> antigo). O roteiro abaixo fica como registro e modelo para as próximas ondas;
> o título da seção fica igual porque as mensagens da 0025 apontam para ele.

As migrações **0019 a 0028** estão escritas e verificadas no banco local (do
zero, com o seed e com `npm run test:banco`: as 194 asserções verdes a
partir de `db reset` em 23/09/2026, com as 28 migrações e o seed aplicados do
zero e a auditoria de RLS sem violação). Em 23/09/2026 foram aplicadas no
projeto novo, junto com 0001–0018 (nota acima). Para aplicar, na ordem numérica, pelo dono do
projeto — **checklist do dono; nenhum agente executa**.

> **A ordem é banco primeiro, código depois.** O código desta onda **não
> funciona contra o banco anterior à 0025**: a busca de pacientes filtra por
> `pacientes.busca` (`src/server/consultas/pacientes.ts`) e o Relacionamento
> lê e grava `pendencias.origem` (`src/server/acoes/relacionamento.ts`,
> `src/server/consultas/relacionamento.ts`) — as duas colunas nascem na 0025.
> Se o merge/push do branch publicar na Vercel antes do `db:push`, a busca de
> pacientes e o Relacionamento quebram em produção. Sequência: backup →
> pré-conferência → `db:push` (0019 → 0028) → `db:tipos` → conferência →
> **só então** merge/deploy do código → backfill de novo (passo 8).
>
> A 0028 também vai **antes** do deploy do app: o formulário de venda manda
> `chave_envio` e a ação `registrarVenda` passa `p_chave` a `venda_registrar`
> (`src/server/acoes/vendas.ts`); contra o banco sem a 0028, o PostgREST não
> acha a função com esse parâmetro e toda venda nova falha.

0. **Antes de qualquer merge ou push deste código:** no painel da Vercel,
   confira qual branch publica em produção e desligue o deploy automático
   (ou garanta que nada deste branch chegue lá) até o passo 7.
1. **Backup antes.** Confira que o PITR (ou um backup manual recente) está
   disponível no painel do Supabase.
2. **Pré-conferência, só leitura**, no SQL editor. A 0025 **falha de
   propósito** (e o `db:push` para nela, sem registrá-la) se o histórico
   tiver algum destes casos — o schema nunca fica diferente do local sob o
   mesmo número. As duas consultas precisam voltar **vazias**:
   - contato repetido na mesma paciente, tipo e dia:
     ```sql
     select paciente_id, tipo, (resolvida_em at time zone 'America/Sao_Paulo')::date as dia, count(*)
       from public.pendencias
      where situacao = 'resolvida' and paciente_id is not null and resolvida_em is not null
        and ((tipo = 'pesquisa' and descricao like 'Convite para avaliação no Google enviado%')
          or (tipo = 'outro' and descricao like 'Mensagem de aniversário enviada%'))
      group by 1, 2, 3 having count(*) > 1;
     ```
   - título de prontuário acima de 160 caracteres:
     `select id from public.prontuarios where char_length(titulo) > 160;`

   Se alguma voltar linha, **não corrija por script**: é histórico da
   clínica, e ela decide o que fazer com cada caso antes do push.
3. `npx supabase db diff --linked` para conferir o que vai mudar;
4. `npm run db:push` — aplica 0019 → 0028 em ordem. A 0021 é gatilho sem
   validar o legado, a 0022 usa `NOT VALID` com validação condicional, a
   0023/0024 são grants, políticas, funções, gatilho e um índice pequeno, a
   0025 falha só nos casos do passo 2, a 0026 é gatilho e grants e a 0027 é
   gatilho, grant de coluna, uma função pública refeita e uma CHECK validada
   só se nenhum recebimento antigo tiver taxa maior que o valor, e a 0028 é
   uma coluna nula nova com índice único parcial, `venda_registrar` refeita
   (drop + create) e um gatilho;
5. `npm run db:tipos` — desde a 0024/0025 os tipos públicos mudam: a função
   `prontuario_imagens_reconciliar`, o enum `origem_pendencia` e as colunas
   `pendencias.origem` e `pacientes.busca`; a 0027 acrescenta `assinado_canal`
   ao retorno de `documento_para_assinatura`; a 0028, a coluna
   `vendas.chave_envio` e o argumento `p_chave` de `venda_registrar`. O `tipos-banco.ts` do repositório
   foi gerado do banco LOCAL (`db:tipos:local`), que não traz o bloco
   `__InternalSupabase`; o `db:tipos` de produção o devolve — confira o diff:
   além desse bloco, só devem aparecer `vendas.chave_envio`, `p_chave?: string`
   em `venda_registrar` e `assinado_canal` em `documento_para_assinatura`.
   Não há dado a migrar: vendas antigas ficam com `chave_envio` nula.
6. **Conferência só de leitura**, no SQL editor:
   - `select proname, prosecdef from pg_proc where proname in ('venda_registrar','venda_alterar_pagamento');`
     → as duas com `true`;
   - `select privilege_type from information_schema.role_table_grants where grantee = 'authenticated' and table_name = 'vendas';`
     → só `SELECT`;
   - `select indexname from pg_indexes where indexname = 'pendencias_contato_um_por_dia';`
     → uma linha;
   - `select convalidated from pg_constraint where conname = 'prontuarios_titulo_maximo';`
     → `true`;
   - `select count(*) from pg_trigger where tgname like '%\_exemplo\_so\_sem\_sessao';`
     → `10` (0026);
   - `select tgname from pg_trigger where tgname in ('modelo_documento_versoes_conferida', 'documento_campos_resposta_autor', 'prontuario_imagens_conferida');`
     → três linhas (0027);
   - `select indexname from pg_indexes where indexname = 'vendas_chave_envio_unica';`
     → uma linha (0028);
   - `select tgname from pg_trigger where tgname = 'prontuario_imagens_do_arquivo';`
     → uma linha (0028);
   - `select pg_get_function_identity_arguments('public.venda_registrar'::regproc);`
     → termina em `p_chave uuid` (0028);
   - `select convalidated from pg_constraint where conname = 'recebimentos_taxa_ate_o_valor';`
     → `true`. Com `false`, há recebimento antigo com taxa maior que o valor
     (`select id from public.recebimentos where taxa_valor > valor;`). A
     regra vale para o que entra de novo **e para qualquer alteração dessas
     linhas antigas**: enquanto valor ou taxa não forem corrigidos no SQL
     editor, por decisão da clínica, elas não aceitam confirmar, cancelar nem
     mudar de situação (23514);
   - `select v.id from public.vendas v where not exists (select 1 from public.recebimentos r where r.venda_id = v.id);`
     → vendas antigas sem recebimento (entraram pela porta que a 0023
     fechou). **Não corrija por script:** a clínica decide caso a caso;
   - `select public.prontuario_imagens_reconciliar();` no SQL editor responde
     42501 de propósito (sem sessão, ninguém é administradora). A conferência
     de verdade é a tela da administradora.
7. **Só agora** o merge/deploy do código desta onda (e religue o deploy
   automático, se o desligou no passo 0). Na Vercel, preencha
   `ORIGEM_PUBLICA` (ver `AGENTS.md` §3) antes de mandar link de assinatura
   em produção.
8. **Backfill de novo, depois do deploy.** Entre o `db:push` e o deploy, o
   aplicativo antigo continua gravando convite e aniversário sem `origem`,
   e eles entram como `tarefa` (apareceriam na aba Tarefas e sumiriam de
   Avaliações). O UPDATE é o mesmo da 0025, idempotente, e não mexe em
   `atualizado_em`:
   ```sql
   begin;
   alter table public.pendencias disable trigger pendencias_atualizado_em;
   update public.pendencias
      set origem = private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em)
    where origem = 'tarefa'
      and private.pendencia_origem_pelo_texto(tipo, descricao, situacao, paciente_id, resolvida_em) <> 'tarefa';
   alter table public.pendencias enable trigger pendencias_atualizado_em;
   commit;
   ```
   Se falhar com `23505` (o app antigo gravou o mesmo contato duas vezes no
   dia, na janela), nada muda: a consulta do passo 2 acha o par, a clínica
   decide, e repita.
9. **Na aplicação:** a recepção registra uma venda e busca uma paciente sem
   acento; o financeiro confirma o recebimento; a administradora abre as
   fotos de um prontuário e a tela de reconciliação; o Relacionamento mostra
   os convites antigos na aba Avaliações. **0028:** um duplo clique no
   registro de venda cria uma venda só; e o primeiro envio de foto em
   produção passa (o gatilho depende do `mimetype` e do `size` que o
   storage-api grava no objeto — no local vale; no hospedado, confira).

O código atual da aplicação é compatível com o banco depois da 0025 (e só
com ele): grava venda só pelas RPCs e, no recebimento e nas fotos, só as
colunas concedidas.

Riscos conhecidos e por que são baixos:

- As restrições novas de dados antigos (`documento_links_canal_formato`,
  `prontuario_versoes_limites`, `prontuario_imagens_caminho_forma`,
  `recebimentos_taxa_ate_o_valor`) entram `NOT VALID` e só são validadas se
  nenhuma linha antiga violar — a migração não falha por causa do passado.
  Mas a linha antiga que viola é recusada no próximo UPDATE dela, como nos
  gatilhos: corrigir o dado é decisão da clínica, pelo SQL editor.
- Os gatilhos de regra valem para gravações novas. Um atendimento antigo que
  já choque com outro só é recusado se alguém mexer no horário dele.
- A 0019 revoga e concede grants: a aplicação continua com exatamente o que
  usa (conferido por `test:banco` e pelo E2E completo).
- A 0025 cria a extensão `unaccent` no schema `extensions` (disponível no
  Supabase). O índice `pendencias_contato_um_por_dia` e a validação de
  `prontuarios_titulo_maximo` são **incondicionais**: com histórico que não
  cabe neles a migração falha (passo 2), nunca segue pela metade. O backfill
  de `pendencias.origem` não toca `atualizado_em` (o gatilho fica desligado
  só durante o UPDATE) e deixa uma linha por registro na auditoria, sem ator
  — é a trilha da migração.
- A 0026 só recusa gravação **com sessão** que marque ou desmarque
  `exemplo`; o seed, o `dados:exemplo`, o `dados:limpar` e o SQL editor
  rodam sem sessão e seguem iguais. A aplicação nunca escreve essa coluna.
- A 0028 só **acrescenta**: coluna nula, índice único parcial (só onde há
  chave) e gatilho de INSERT com sessão de administradora. Sem a chave,
  `venda_registrar` se comporta como antes. O único risco é de **ordem**: o
  app novo contra o banco sem a 0028 dá `PGRST202` em toda venda nova.
- A chave identifica o **envio**, não o conteúdo: um reenvio com outros
  valores (só uma chamada direta à API faria isso) recebe a venda original.
  Chave de outro perfil é recusada (`P0001`).

Reverter, se preciso, é escrever a migração inversa (recriar políticas,
`drop trigger`, `grant`); nenhuma delas apaga dado.

## Como aplicar

Uma vez por máquina:

```bash
npx supabase login            # abre o navegador
npx supabase link --project-ref <ref-do-projeto>
```

O `<ref-do-projeto>` é o trecho do meio da URL do painel:
`https://supabase.com/dashboard/project/`**`<ref>`**.

Depois, para enviar as migrações pendentes:

```bash
npx supabase db push
```

Para conferir o que seria aplicado antes de aplicar:

```bash
npx supabase db diff --linked
```

## Regras que valem para as próximas migrações

- **Grants declarados.** Desde a 0019 o default não concede nada a
  `authenticated`: tabela nova diz o que ele faz nela, e só isso. DELETE só com
  decisão explícita; UPDATE por coluna quando o resto da linha não pode mudar.
- **Testar no banco local** (`db reset` + `test:banco`) antes de ir para
  produção, e acrescentar ao `testes/permissoes.sql` o que a migração garante.
- **RLS ligada em toda tabela nova.** Sem exceção: dado de paciente é dado
  pessoal sensível.
- **Nunca escrever `DROP` de coluna com dado dentro** sem uma migração de
  transição que preserve o conteúdo.
- **Toda tabela com dado de paciente entra na auditoria.**
- Migração é imutável depois de aplicada em produção. Correção vira arquivo novo.

## Perfis de acesso

| Perfil | Alcance |
|---|---|
| `administradora` | Tudo, inclusive despesas, auditoria, gestão de usuários e a tabela de taxas de cartão |
| `financeiro` | Vendas, recebimentos, despesas e alteração de taxa com justificativa. Não configura a tabela de taxas nem gerencia usuários |
| `recepcao` | Pacientes, agenda, retornos, pendências e registro de venda com a taxa padrão. Sem despesas, sem auditoria |

O papel fica em `public.perfis.papel` e é lido pelas funções
`private.papel_atual()`, `private.tem_acesso()`, `private.e_administradora()` e
`private.e_financeira()` (administradora **ou** financeiro), usadas por todas as
políticas.

Elas ficam no schema `private` de propósito: o PostgREST só publica os schemas
configurados, então nada ali vira endpoint em `/rest/v1/rpc/`. Toda função
auxiliar de política nova deve nascer nesse schema.

## Como um usuário novo entra

Perfil novo nasce **inativo** e como **recepção**, sempre. Liberar e promover
são ações da administradora.

O papel **não** vem de `raw_user_meta_data`. Esse campo é preenchido pelo próprio
pedido de cadastro, então confiar nele permitiria que alguém se cadastrasse já
como administradora. Só o `nome` vem de lá — é rótulo, não decide acesso.

Para criar o acesso de alguém:

1. Supabase → Authentication → Users → **Add user** (e-mail e senha).
2. A pessoa aparece em `public.perfis` como recepção, inativa.
3. Libere por SQL, ou editando a linha em `public.perfis` pelo Table Editor do
   painel. A tela de acesso ainda não existe: "Acesso e permissões" aparece como
   "em breve" em Configurações, e "Perfis e permissões" está desabilitada no
   menu do usuário. Por SQL:

```sql
update public.perfis
   set ativo = true, papel = 'administradora'
 where id = (select id from auth.users where email = 'pessoa@clinica.com.br');
```

> **Não crie usuários inserindo direto em `auth.users`.** As colunas de texto
> ficam nulas e o serviço de autenticação, escrito em Go, não consegue lê-las —
> o login passa a falhar com "Database error querying schema" para todo mundo.
> Use o painel ou a API de administração.

## Cadastro público

Precisa ficar **desligado**: Authentication → Sign In / Providers → Email →
"Allow new users to sign up".

Mesmo desligado, o banco não depende disso — a migração 0004 garante que uma
conta criada de qualquer forma nasça inativa e sem privilégio.

## Recuperação de senha

O app usa `/recuperar-senha` para pedir o e-mail e `/redefinir-senha` para
definir a senha. A URL local `http://localhost:3000/redefinir-senha` está na
lista de redirecionamentos do Supabase Auth. Antes de publicar a função, adicione
também a URL exata da implantação em **Authentication → URL Configuration** e
configure **Authentication → Emails → SMTP Settings** com um serviço de envio.
O SMTP padrão do Supabase não entrega a usuários fora da equipe do projeto.

Com SMTP próprio, ajuste o modelo **Reset password** para que o link aponte
diretamente à página do app e funcione mesmo quando o e-mail for aberto em outro
aparelho:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery">Redefinir minha senha</a>
```

`resetPasswordForEmail()` sempre fornece `redirectTo`; a página valida o hash
com `verifyOtp({ type: "recovery" })`. O modelo padrão também é aceito pelo
cliente no navegador, desde que o link seja aberto no mesmo navegador que
solicitou a recuperação (fluxo PKCE). Depois de alterar a senha, a sessão é
encerrada e a pessoa volta ao login. Nenhuma migração SQL é necessária.

A confirmação de solicitação não informa se o e-mail pertence a uma conta.
`/redefinir-senha` só exibe o formulário depois do link validado; mantém uma
marca temporária de 15 minutos, vinculada ao usuário, no `sessionStorage` da aba
e exige uma nova senha de pelo menos 12 caracteres. Link inválido ou expirado
exige uma nova solicitação. A marca é uma proteção da interface para não usar
essa página como troca de senha de uma sessão comum; ela não é uma autorização
de servidor. `updateUser()` altera a senha do usuário autenticado na sessão do
Supabase Auth, criada pelo link de recuperação nesse fluxo.

O mínimo de 12 caracteres é regra **da interface**: `formulario-nova-senha.tsx`
confere no navegador e chama `updateUser()` direto do cliente. O Auth só recusa
o que a configuração dele manda, e o `config.toml` local aceita 6 caracteres,
sem requisito de composição e sem reautenticação (`minimum_password_length = 6`,
`password_requirements = ""`, `secure_password_change = false`). No local,
quem tem sessão consegue gravar uma senha menor pela API. Para a regra valer no
servidor, suba o mínimo do Auth: no local, no `config.toml`; em produção, nas
configurações de senha do provedor Email, no painel — tarefa do dono do
projeto. O valor de produção não está no repositório: confira antes de afirmar
que a regra vale lá.

## Validação executada

Hoje a validação do banco é automática e roda no Supabase local:
`npm run test:banco` executa as **194 asserções** (execução completa, do zero,
verde em 23/09/2026) de
[`testes/permissoes.sql`](testes/permissoes.sql), por perfil, numa transação
desfeita no fim.

O registro abaixo é histórico — a primeira validação, feita à mão em agosto de
2026, depois de aplicar as três primeiras migrações, com dois usuários de teste
(uma administradora e uma recepcionista) removidos ao final:

| Verificação | Resultado |
|---|---|
| 11 tabelas com RLS ligada e política associada | ok |
| Gatilho cria o perfil no cadastro do usuário, lendo o papel do metadado | ok na época — era a escalada de privilégio que a 0004 fechou; hoje o perfil nasce sempre recepção e inativo |
| Trilha de situação do atendimento gravada automaticamente | ok |
| Auditoria registra inserções em pacientes e atendimentos | ok |
| Recepção lê pacientes e agenda | ok |
| Recepção **não** lê despesas nem auditoria | ok |
| Recepção **não** consegue se promover a administradora | ok |
| Recepção **não** consegue desativar nem apagar outro perfil | ok |
| Administradora lê tudo, inclusive despesas e auditoria | ok |
| Visitante não autenticado não alcança tabela nenhuma | ok |
| Verificador de segurança do Supabase | sem alertas nossos |

O único alerta que permanece é sobre `public.rls_auto_enable`, função da própria
plataforma Supabase, fora do nosso controle.
