# Banco de dados

O banco é um Postgres gerenciado pelo Supabase, na região **South America
(São Paulo)**. Toda alteração de estrutura passa por um arquivo de migração
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

## Projeto

`Cockpit-Consultorio2` · ref `khoaluytzzagtwmpaukx` · região **sa-east-1
(São Paulo)**.

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

As migrações **0019 a 0022** estão escritas e verificadas no banco local (do
zero, com o seed e com `npm run test:banco`: 78 testes). Não foram aplicadas em
produção. Para aplicar, na ordem numérica, pelo dono do projeto:

1. `npx supabase db diff --linked` para conferir o que vai mudar;
2. `npm run db:push`;
3. `npm run db:tipos` — os tipos públicos não mudam (as funções novas ficam no
   schema `private`); o `git diff` deve vir vazio ou só de formatação do CLI.

Riscos conhecidos e por que são baixos:

- As restrições novas de dados antigos (`documento_links_canal_formato`,
  `prontuario_versoes_limites`, `prontuario_imagens_caminho_forma`) entram
  `NOT VALID` e só são validadas se nenhuma linha antiga violar — a migração
  não falha por causa do passado.
- Os gatilhos de regra valem para gravações novas. Um atendimento antigo que
  já choque com outro só é recusado se alguém mexer no horário dele.
- A 0019 revoga e concede grants: a aplicação continua com exatamente o que
  usa (conferido por `test:banco` e pelo E2E completo).

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
`npm run test:banco` executa as **78 asserções** de
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
