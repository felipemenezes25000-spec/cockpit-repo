# AGENTS.md — Cockpit Consultório

**Documento-chave do projeto.** Fonte única de verdade para qualquer agente
(Claude Code, Codex, ou pessoa) que vá mexer neste repositório. Leia inteiro
antes da primeira alteração.

Se algo aqui divergir do código, **o código vence** — e este arquivo precisa ser
corrigido no mesmo commit. Documento desatualizado é pior que documento nenhum,
porque ele é obedecido.

Complementos, quando precisar de mais profundidade:

| Arquivo | Assunto |
|---|---|
| [`docs/overview-sistema.md`](docs/overview-sistema.md) | Produto: propósito, cada módulo em detalhe, decisões de design e o que é provisório |
| [`supabase/README.md`](supabase/README.md) | Banco: migrações, como aplicar, como criar usuário, validação de segurança executada |
| [`README.md`](README.md) | Só o essencial para rodar |

---

## 1. O que é este sistema

Sistema de gestão do consultório de estética da **Dra. Érika Passos**. Um único
lugar para agenda, pacientes, prontuários, documentos, financeiro,
relacionamento e indicadores — substituindo agenda de papel, caderno, conversas
de WhatsApp e planilha.

**Software real, para uma clínica real, com dado de saúde de pessoas reais.**
Dado de paciente é dado pessoal sensível (LGPD, art. 5º, II). Isso não é uma
observação decorativa: é o motivo de a RLS estar ligada em toda tabela, de a
chave `service_role` não existir na aplicação e de venda, histórico e ajuste não
poderem ser apagados. Desde a migração 0019 isso vale **no banco para todas as
tabelas**: nenhuma política permite DELETE, com uma exceção deliberada —
`prontuario_imagens`, pela LGPD (§8.5).

Hoje o sistema roda com **dados de demonstração** marcados no banco pela coluna
`exemplo`. Enquanto existir um registro assim, a interface exibe uma faixa
permanente de aviso. `npm run dados:limpar` apaga só o que foi semeado e o aviso
some sozinho.

### Estado atual (setembro de 2026)

| Módulo | Rota | Situação |
|---|---|---|
| Visão Geral | `/` | **Pronto** — lê do banco |
| Pacientes | `/pacientes` | **Pronto** — cadastro, busca, ficha, edição, arquivamento, importação CSV |
| Agenda | `/agenda` | **Pronto** — marcar, remarcar, situações, trilha |
| Financeiro | `/financeiro` | **Pronto** — vendas, recebimentos, despesas, taxas, movimentações, fluxo |
| Configurações | `/configuracoes` | **Parcial** — só a tabela de procedimentos |
| Prontuários | `/prontuarios` | **Pronto** — registro clínico versionado, restrito à administradora |
| Documentos e Contratos | `/formularios` | Fluxos implementados — modelos, emissão, assinatura e anamnese; dependem das migrações versionadas (seção 8.7) |
| Relacionamento | `/relacionamento` | **Pronto** — confirmações, retornos, tarefas, aniversários e convites para avaliação no Google |
| Busca global | `/busca` | **Pronta** — pacientes, atendimentos, documentos e prontuários conforme o perfil |
| Relatórios | `/relatorios` | Página provisória |

Página provisória = existe, é navegável, descreve o que virá e avisa que está em
construção. Não é um erro a ser corrigido; é o estado planejado.

---

## 2. Como rodar e como verificar

```bash
npm ci
npm run dev        # http://localhost:3000
npm run build      # build de produção
npm run lint       # ESLint, sem nenhum aviso tolerado
npm run typecheck  # TypeScript (tsc --noEmit)
npm test           # testes de unidade e de componente (Vitest)
npm run test:banco # permissões e regras do banco, no Supabase LOCAL
npm run test:e2e   # ponta a ponta (Playwright), no Supabase LOCAL
```

Scripts que falam com o **projeto de produção** (exigem `npx supabase login` +
`link` feitos uma vez na máquina, pelo dono do projeto):

```bash
npm run db:push        # aplica as migrações pendentes
npm run db:tipos       # regenera src/lib/supabase/tipos-banco.ts a partir do banco
npm run dados:exemplo  # semeia os dados de demonstração
npm run dados:limpar   # apaga só o que tem exemplo = true
```

**Antes de dar qualquer trabalho por concluído: `npm run lint`,
`npm run typecheck` e `npm test` precisam passar limpos**; mudou banco ou
permissão, `npm run test:banco` também. Veja logo abaixo por que `npm run build`
não é o zelo extra que parece.

> ### ⚠️ Não rode `npm run build` com o servidor de desenvolvimento no ar
>
> `next build` e `next dev` escrevem na **mesma pasta `.next`**. O build de
> produção sobrescreve os chunks que o dev server tem em memória, e ele passa a
> pedir arquivos que não existem mais:
>
> ```
> Error: Cannot find module './5611.js'
>   code: 'MODULE_NOT_FOUND'
> [TypeError: Cannot read properties of undefined (reading '/_app')]
> ```
>
> O sintoma na tela **não parece um erro de build**: a página abre sem CSS
> nenhum — Times New Roman, links roxos, listas com marcador — e algumas rotas
> passam a dar 500. É fácil confundir com "quebrei o Tailwind" ou "quebrei a
> página" e sair caçando bug no lugar errado.
>
> **Antes de buildar, confira a porta 3000.** Se houver dev rodando, ou não
> builde, ou pare o dev antes.
>
> **Conserto**, quando já aconteceu: pare o dev, `rm -rf .next`, suba o dev de
> novo, e recarregue o navegador ignorando o cache (Ctrl+Shift+R) — senão ele
> devolve o HTML sem CSS que já tinha guardado.
>
> Na prática: `lint` + `typecheck` cobrem o que se precisa confirmar numa
> alteração comum. Deixe o `build` para quando o objetivo for exatamente
> verificar o build.

> ### Testes
>
> Três camadas, e nenhuma toca produção:
>
> | Comando | O que confere | Onde |
> |---|---|---|
> | `npm test` | Regras de `lib/` (dinheiro, datas, validações, CSV, erros), ações de servidor com o Supabase trocado por um falso (`testes/supabase-falso.ts`) e componentes (jsdom + Testing Library) | `src/**/*.test.ts(x)` |
> | `npm run test:banco` | RLS, grants e gatilhos **por perfil**, trocando de papel como a API troca — numa transação desfeita no fim | `supabase/testes/permissoes.sql` |
> | `npm run test:e2e` | Fluxos inteiros no navegador (login, paciente, agenda, venda, despesa, prontuário, documento e assinatura por link) e todas as telas em 360, 768 e 1440 px, sem rolagem horizontal nem erro de console | `e2e/` |
>
> Os dois últimos precisam do Supabase local no ar (abaixo) com as contas de
> teste. O E2E recusa rodar se o `.env.local` não apontar para 127.0.0.1.
> Regra nova ou bug corrigido ganha teste junto.

> ### Supabase local (Docker) — o banco de desenvolvimento
>
> ```bash
> npx supabase start      # sobe o banco, aplica TODAS as migrações e o seed
> npm run local:usuarios  # cria administradora, financeiro e recepção locais
> npx supabase db reset   # recomeça do zero (migrações + seed)
> ```
>
> O `.env.local` aponta para `http://127.0.0.1:55321` com a chave anônima de
> demonstração que o CLI imprime (igual em toda instalação). As portas são 5532x,
> e não as 5432x padrão, porque o Windows reserva a faixa 54286–54385 para o
> Hyper-V. As contas de teste estão em `supabase/usuarios-locais.json` e não
> existem em produção. Migração nova se testa aqui primeiro — `db reset` precisa
> passar do zero.
>
> ### ⚠️ Produção continua sem homologação
>
> `db:push`, `db:tipos`, `dados:exemplo` e `dados:limpar` usam `--linked` e falam
> **direto com o banco de produção da clínica**. Rodar `dados:limpar` sem pensar
> apaga dado de verdade; um `db:push` errado altera a estrutura em produção.
> **Confirme com o dono do projeto antes de rodar qualquer um dos quatro.**
>
> ### ⚠️ Agente não se autentica no Supabase
>
> Se você é um agente de IA: **não tente `supabase login`.** Você não tem e não
> terá credencial deste banco. Não é limitação de ambiente a contornar — é
> decisão: um token de acesso dá poder de gerenciamento sobre o banco de
> produção de uma clínica real, com dado de saúde, e sem homologação atrás.
>
> **Você não precisa dele para escrever código.** O schema inteiro está no
> repositório: `supabase/migrations/*.sql` em ordem, mais
> `src/lib/supabase/tipos-banco.ts`. Conexão viva só serve para *aplicar*
> mudança — que é a parte que passa pelo dono do projeto.
>
> **O fluxo quando a tarefa exige mudança no banco:**
>
> 1. Você escreve a migração nova (`00NN_nome_descritivo.sql`), com o cabeçalho
>    comentado explicando o porquê, no padrão dos arquivos existentes.
> 2. Você aplica **no Supabase local** (`npx supabase db reset`), roda
>    `npm run test:banco` e acrescenta ao `supabase/testes/permissoes.sql` o
>    que a migração passou a garantir. Se ela muda tabela ou assinatura de
>    função pública, `npm run db:tipos:local` regenera os tipos a partir do
>    banco local — o typecheck fecha antes de produção.
> 3. Você **para** e avisa o que a migração faz. Não roda nada em produção.
> 4. O dono do projeto aplica: `db:push`, depois `db:tipos`, conferindo o
>    `git diff` dos tipos.
>
> ### `db:tipos` não destrói mais o arquivo quando falha
>
> Antes era `supabase gen types ... > tipos-banco.ts`: o `>` esvaziava o arquivo
> antes de o comando rodar, e o erro do CLI (que sai no stdout) virava o
> conteúdo. Agora `scripts/gerar-tipos.mjs` gera em memória, confere que é o
> arquivo de tipos e só então substitui. Mesmo assim, **confira o `git diff`**.

Ambiente de desenvolvimento: Windows, PowerShell. O `.gitattributes` normaliza
as quebras de linha para LF no repositório.

---

## 3. Hospedagem e ambientes

| Camada | Onde | Detalhe |
|---|---|---|
| Aplicação | **Vercel** | `vercel.json`: `framework: nextjs`, região **`gru1`** (São Paulo) |
| Repositório | **GitHub** | `https://github.com/fellpsbr/cockpit-consultorio` — `main` é produção; trabalho em branch própria |
| Banco e autenticação | **Supabase** | Projeto `Cockpit-Consultorio2`, ref `khoaluytzzagtwmpaukx`, região **`sa-east-1` (São Paulo)** |

**Por que tudo em São Paulo:** latência e soberania do dado. A região do projeto
Supabase **não pode ser alterada depois da criação** — o primeiro projeto foi
criado em `us-east-1` e descartado por isso, antes de existir qualquer dado.
`gru1` na Vercel mantém o servidor ao lado do banco.

### Variáveis de ambiente

Modelo em [`.env.local.example`](.env.local.example); os valores reais ficam em
`.env.local`, que está no `.gitignore`.

```
NEXT_PUBLIC_SUPABASE_URL=       # Supabase > Project Settings > API
NEXT_PUBLIC_SUPABASE_ANON_KEY=  # chave "anon public" / "publishable"
```

A chave anônima é publicada no navegador **por natureza**. Quem protege os dados
é a RLS do banco, não o segredo dessa chave.

> **A chave `service_role` não entra na aplicação.** Ela ignora toda a RLS. Não
> vai para `.env.local`, não vai para o navegador, não vai para variável da
> Vercel, não vai por mensagem. Se algum dia um caso legítimo exigir (um job
> administrativo isolado, por exemplo), ela entra como variável **de servidor**
> naquele serviço, nunca no app Next.

`src/lib/supabase/config.ts` falha alto e cedo: sem as variáveis, a aplicação
não sobe. É proposital — melhor não subir do que subir e quebrar em cada
consulta com erro obscuro.

---

## 4. Banco de dados

Postgres gerenciado pelo Supabase. **Toda alteração de estrutura passa por um
arquivo de migração versionado em [`supabase/migrations/`](supabase/migrations/)
— nada é alterado direto pelo painel.**

### As migrações existentes

| Arquivo | O que faz |
|---|---|
| `0001_fundacao.sql` | Núcleo: perfis, equipe, procedimentos, pacientes, agenda, relacionamento, financeiro básico e auditoria. RLS ligada em tudo |
| `0002_endurece_funcoes.sql` | `search_path` fixo nas funções; tira as funções de gatilho da API pública |
| `0003_funcoes_em_schema_privado.sql` | Move as funções auxiliares das políticas para o schema `private` |
| `0004_cadastro_nao_concede_acesso.sql` | Perfil novo nasce **inativo** e como **recepção**; papel deixa de vir do metadado do cadastro |
| `0005_marca_dados_de_exemplo.sql` | Coluna `exemplo` nas tabelas de conteúdo |
| `0006_financeiro_enums.sql` | Enums do Financeiro (só a cirurgia de enums — Postgres não deixa usar valor novo na mesma transação que o cria) |
| `0007_financeiro_fundacao.sql` | Vendas, taxas de cartão, histórico de alterações, ajustes; CHECK constraints da conta |
| `0008_operacoes_de_venda.sql` | Funções `venda_registrar` e `venda_alterar_pagamento` |
| `0009_anon_fora_das_tabelas_novas.sql` | Revoga `anon` das tabelas novas e muda o default para as futuras |
| `0010_prontuarios.sql` | Prontuários clínicos versionados, restritos à administradora |
| `0011_prontuario_imagens.sql` | Fotos de evolução: bucket privado no Storage, metadados em tabela, e a **primeira exceção ao "não se apaga"** |
| `0012_eliminacao_de_imagem.sql` | Onde o motivo da eliminação pousa, e a função que registra e apaga na mesma transação |
| `0013_documentos.sql` | Documentos e contratos: modelos versionados, texto congelado na emissão com hash, e a trilha da assinatura |
| `0014_assinatura_por_link.sql` | Assinatura à distância — e a **primeira superfície anônima** do sistema: três funções que `anon` executa |
| `0015_canal_do_link.sql` | `grant update` de **coluna** em `canal_envio`: o canal passa a ser gravado no clique do envio, não na criação |
| `0016_via_da_paciente.sql` | Assinar deixa de revogar o link, e a função pública passa a devolver o texto depois de assinado — a via da paciente |
| `0017_anamnese.sql` | Anamnese com campos de formulário: perguntas versionadas no modelo, respostas em `documento_campos`, preenchimento na consulta ou pelo link |
| `0018_emissao_grava_perguntas.sql` | Corrige a 0017: a emissão não conseguia gravar as perguntas (RLS de quem clicou). `private.documento_campos_criar` vira a única porta de entrada delas |
| `0019_privilegio_minimo.sql` | **Grants declarados** tabela a tabela (as da 0007 dependiam do padrão do projeto) e default que não concede mais nada a `authenticated`; políticas `for all` viram uma por operação, **sem DELETE**; recebimento só o financeiro altera; auditoria em retornos, pendências, despesas, taxas, procedimentos, profissionais e perfis; próprio perfil só muda o nome |
| `0020_financeiro_conferido_no_banco.sql` | Gatilho confere a **origem da taxa** de toda venda (tabela padrão, forma, parcelas, valor); recebimento confirmado não se reescreve; o recebimento da venda nasce por `private.recebimento_da_venda_criar` |
| `0021_agenda_sem_choque.sql` | **Choque de horário recusado pelo banco**, com trava por profissional — sem corrida entre duas recepcionistas e sem a janela de 8 horas |
| `0022_documentos_integridade.sql` | Documento só nasce do modelo e só muda de situação; evidência da assinatura escrita pelo banco; pergunta da anamnese congela de verdade; link público sem corrida nas tentativas; prontuário e fotos com as travas que faltavam |

### Tabelas

| Tabela | Papel | Quem escreve |
|---|---|---|
| `perfis` | Usuário do sistema; estende `auth.users` com nome, papel e `ativo` | Própria pessoa (só o nome — gatilho da 0019) · administradora (papel e liberação) |
| `profissionais` | Quem atende. Pode existir sem login | Administradora |
| `procedimentos` | Catálogo: nome, duração, valor padrão, retorno sugerido | Administradora |
| `pacientes` | Cadastro. Endereço em `jsonb`, CPF único quando informado | Todos os perfis |
| `atendimentos` | A agenda: paciente, profissional, procedimento, início, duração, situação, valor | Todos os perfis |
| `atendimento_situacoes` | Trilha de mudança de situação, gravada por **gatilho** | Só o gatilho (leitura para todos) |
| `retornos` | Quem está no período de voltar | Todos os perfis |
| `pendencias` | O que precisa de atenção, com prazo e prioridade | Todos os perfis |
| `recebimentos` | Dinheiro a entrar / entrado. `valor_liquido` é coluna **gerada** (`valor − taxa_valor`) | Nasce com a venda (`private.recebimento_da_venda_criar`, qualquer perfil); confirmar, mudar situação e inserir solto são do financeiro. **Confirmado não se reescreve** (0020) |
| `despesas` | Dinheiro a sair. Auditada desde a 0019 | Financeiro e administradora; ninguém apaga |
| `taxas_cartao` | Tabela padrão por operadora, tipo e parcelas | **Só administradora** |
| `vendas` | O fato gerador, com a **cópia congelada** da taxa | Todos inserem; financeiro edita |
| `venda_alteracoes` | Histórico **imutável** de mudança de forma/taxa | Financeiro insere; ninguém edita nem apaga |
| `ajustes_financeiros` | A diferença quando a mudança acontece após confirmação | Financeiro insere |
| `prontuarios` | Cabeçalho do registro clínico: paciente, atendimento opcional, data e título | Administradora |
| `prontuario_versoes` | Conteúdo clínico versionado: queixa, avaliação, conduta, evolução, orientações e observações | Administradora insere; ninguém edita nem apaga |
| `prontuario_imagens` | Fotos de evolução: caminho no bucket e metadados. **Única tabela que pode apagar** — ver §8.5 | Administradora |
| `prontuario_imagem_eliminacoes` | Por que cada foto foi eliminada, e a pedido de quem. Sem UPDATE e sem DELETE | Administradora insere |
| `modelos_documento` | Catálogo de texto-base: contrato, termo, orientação. Cabeçalho mutável | Administradora |
| `modelo_documento_versoes` | Versões imutáveis do texto do modelo | Administradora insere; ninguém edita nem apaga |
| `documentos` | Documento emitido, com o **texto congelado** e o hash dele. Corpo nunca muda — gatilho | Todos os perfis; anamnese só administradora. Nasce só do texto do modelo; depois muda **só** `situacao` e `motivo_cancelamento`, e só a partir de `emitido` (0022) |
| `documento_assinaturas` | Evidência da assinatura: quem, quando, IP, dispositivo, identidade conferida, hash | Todos inserem; ninguém edita nem apaga. Hash, hora, canal e operador são escritos pelo banco (0022) |
| `documento_links` | Links de assinatura à distância. Guarda o **hash** do token, nunca o token | Só as funções da 0014 escrevem |
| `documento_campos` | Respostas da anamnese, com a pergunta congelada em cada linha. **A pergunta não muda; a resposta, sim** | Administradora edita só as colunas de resposta, e só com o documento `emitido`; ninguém insere nem apaga |
| `auditoria` | Quem alterou o quê, por gatilho | Só os gatilhos (leitura: administradora) |

Gatilhos de auditoria em: `pacientes`, `atendimentos`, `recebimentos`, `vendas`,
`ajustes_financeiros`, `prontuarios`, `prontuario_versoes`, `prontuario_imagens`,
os seis do módulo de documentos e — desde a 0019 — `retornos`, `pendencias`,
`despesas`, `taxas_cartao`, `procedimentos`, `profissionais` e `perfis`.

### Funções do banco

No schema **`private`** (não publicadas pelo PostgREST — não viram endpoint em
`/rest/v1/rpc/`), usadas dentro das políticas de RLS:

- `private.papel_atual()` — papel do usuário logado, se ativo
- `private.tem_acesso()` — existe perfil ativo?
- `private.e_administradora()`
- `private.e_financeira()` — administradora **ou** financeiro

Também em `private`, as portas `security definer` que fazem o que a sessão de
quem clicou não pode fazer direto pela API — cada uma lê o que precisa do
próprio banco, nunca de parâmetro:

- `private.documento_campos_criar(documento)` — as perguntas da anamnese (0018)
- `private.recebimento_da_venda_criar(venda, ...)` — o recebimento de uma venda (0020)

E os gatilhos de regra: `venda_confere_taxa`, `recebimento_confirmado_imutavel`
(0020), `atendimento_sem_choque` (0021), `perfil_proprio_so_nome` (0019),
`documento_nasce_do_modelo`, `documento_transicao_valida`,
`assinatura_confere_documento`, `campo_resposta_valida`,
`prontuario_versao_conferida`, `imagem_so_sai_com_motivo` (0022).

> **Toda função auxiliar de política nova nasce em `private`.** É o que impede
> que ela apareça como endpoint RPC.

No schema `public`, chamadas por RPC pela aplicação:

- `public.venda_registrar(...)` — grava a venda **e** seu único recebimento
- `public.venda_alterar_pagamento(...)` — histórico + recebimento reescrito ou ajuste
- `public.prontuario_registrar(...)` — cria o prontuário e a versão 1 na mesma transação
- `public.prontuario_nova_versao(...)` — atualiza o cabeçalho e insere nova versão clínica

Todas são **`SECURITY INVOKER`** de propósito: a RLS de quem chama continua
valendo. A recepção consegue registrar venda (política de INSERT), mas esbarra
na política de UPDATE ao tentar alterar; no prontuário, só a administradora passa
nas políticas e nas funções.

**Invoker não quer dizer que o banco confie no que chega.** Desde a 0020 a
origem da taxa de toda venda é conferida por gatilho — vale para a função e para
um INSERT direto pela API. O mesmo desenho na 0021 (agenda) e na 0022
(documentos): a função é a porta, e o banco confere o que entra por qualquer
porta.

### Regras para toda migração nova

1. **RLS ligada em toda tabela nova.** Sem exceção.
2. **Toda tabela nova declara seus grants e termina com `revoke all ... from anon`.**
   Desde a 0019 o default não concede nada a `authenticated`: sem
   `grant select, insert, update on ... to authenticated` a tabela nova responde
   "permission denied". Conceda só o necessário — **DELETE só com decisão
   explícita**, e UPDATE por coluna (`grant update (col) ...`) quando o resto da
   linha não pode mudar.
3. **Nunca `DROP` de coluna com dado dentro** sem uma migração de transição que
   preserve o conteúdo.
4. **Toda tabela com dado de paciente entra na auditoria.**
5. **Migração aplicada em produção é imutável.** Correção vira arquivo novo com
   o próximo número. Nunca edite um arquivo já aplicado.
6. Depois de `npm run db:push`, rode **`npm run db:tipos`** e comite o
   `tipos-banco.ts` junto — conferindo o `git diff` (ver a §2).
10. **Migração nova passa por `npx supabase db reset` e `npm run test:banco`**
    no banco local antes de ir para produção, e o que ela passou a garantir
    entra em `supabase/testes/permissoes.sql`.
11. **Gatilho que só vale para sessão de usuário deixa passar quando
    `auth.uid()` é nulo** — é manutenção pelo SQL do projeto, que já passa por
    cima da RLS. Regra de transição de estado (documento, recebimento) vale
    sempre.
7. **Toda função nova leva `set search_path = public, pg_temp`,
   `revoke all on function ... from public, anon` (e de `authenticated` também,
   quando é função de gatilho) e `grant execute` só para quem precisa.** O
   `alter default privileges` da 0009 **não** resolve isso: o Postgres concede
   EXECUTE a `PUBLIC` em toda função nova, e sem o revoke explícito ela nasce
   chamável por anônimo em `/rest/v1/rpc/` — exatamente o que a 0002 e a 0003
   consertaram.
8. **Tabela nova leva as colunas de rastro** (`criado_em`, `atualizado_em`,
   `criado_por`) e o gatilho `tocar_atualizado_em`, como todas as existentes.
9. **Função de gatilho continua `SECURITY DEFINER`.** `authenticated` só tem
   SELECT em `auditoria` e `atendimento_situacoes` — trocar para INVOKER faz o
   gatilho falhar ao inserir a trilha, e a operação inteira cai junto.

### `src/lib/supabase/tipos-banco.ts` é gerado

Gerado pelo CLI do Supabase. **Nunca edite à mão.** Se um tipo
está errado, o banco está errado — corrija com migração e regenere.

---

## 5. Autenticação e permissões

### Os três perfis

| Papel | Quem é | Alcance |
|---|---|---|
| `administradora` | Dra. Érika | Tudo: despesas, auditoria, gestão de usuários, tabela de taxas, importação em massa |
| `financeiro` | Quem opera o caixa | Vendas, recebimentos, despesas, alteração de taxa com justificativa. **Não** configura a tabela de taxas nem gerencia usuários |
| `recepcao` | Atendimento e agendamento | Pacientes, agenda, retornos, pendências, registro de venda **com a taxa padrão**. Sem despesas, sem auditoria, sem consolidado financeiro |

O perfil "Profissional" está previsto para quando a equipe crescer. Não existe
ainda.

### Como alguém entra

Perfil novo nasce **inativo** e como **recepção**, sempre. Liberar e promover
são ações da administradora.

**O papel não vem de `raw_user_meta_data`.** Esse campo é preenchido pelo
próprio pedido de cadastro — confiar nele permitiria que alguém se cadastrasse
já como administradora. Isso foi uma falha real, corrigida na migração 0004. Só
o `nome` vem de lá, porque é rótulo e não decide acesso.

O cadastro público precisa ficar **desligado** no painel (Authentication → Sign
In / Providers → Email → "Allow new users to sign up"). Mesmo desligado, o banco
não depende disso: a 0004 garante que uma conta criada de qualquer forma nasça
sem privilégio. Defesa em profundidade.

> **Não crie usuários inserindo direto em `auth.users`.** As colunas de texto
> ficam nulas e o serviço de autenticação (escrito em Go) não consegue lê-las —
> o login passa a falhar com "Database error querying schema" para **todo
> mundo**. Use o painel do Supabase ou a API de administração.

### As três camadas de permissão

Toda regra de acesso é verificada em três lugares, e as três precisam existir:

1. **Interface** — não oferece a porta. Botão que vai falhar é pior que botão
   ausente.
2. **Ação de servidor** — recusa com mensagem legível. *Esconder o botão não é
   proteger a rota.*
3. **RLS / função do banco** — recusa mesmo que as outras duas falhem ou sejam
   contornadas.

Onde estão:

- Interface: `src/components/**/somente-*.tsx`, checagens de papel nas páginas
- Servidor: **`ehAdministradora()` / `ehFinanceira()` de `src/lib/auth.ts`** — são
  estas que valem
- Banco: políticas em `0001`, `0003` e `0007`

> `podeAlterarTaxa()`, `podeOperarFinanceiro()` e `podeConfigurarTaxas()` existem
> em `src/lib/venda.ts` e **não são chamadas por ninguém** — código morto. Não as
> use achando que são a camada de servidor; use `ehFinanceira()`.

**Toda ação de servidor abre com `usuarioAtual()`, e isso é obrigatório.** O
`layout.tsx` do grupo `(app)` protege a *renderização de página*, não a chamada
de uma server action — ela chega por POST direto no endpoint, sem passar pelo
layout. Ação nova sem essa primeira linha é rota aberta.

Nem toda regra de aplicação tem equivalente no banco, e isso é **intencional**.
Exemplo: a importação de planilha é restrita à administradora **por regra da
aplicação** — a RLS permite que a recepção cadastre paciente, porque cadastrar
uma a uma é trabalho dela; trazer uma base inteira de uma vez é outra coisa.
Quando for assim, a checagem existe na página **e de novo na ação de servidor**.

**Onde a terceira camada não existe hoje** — saiba de cor, porque é aqui que se
escreve código inseguro por analogia:

| Regra | Banco cobre? |
|---|---|
| Importação de planilha só administradora | **Não** — RLS deixa a recepção inserir paciente, uma a uma ou em lote |
| Confirmar recebimento só financeiro | Sim, desde a 0019 — `recebimentos_edicao` |
| Taxa manual só financeiro | Sim — gatilho `vendas_confere_taxa` (0020), também em INSERT direto |
| Lançar despesa só financeiro | Sim — `despesas_insercao` / `despesas_edicao` |
| Configurar tabela de taxas só administradora | Sim — `taxas_insercao` / `taxas_edicao` |
| Alterar venda só financeiro | Sim — `vendas_edicao` e `venda_alterar_pagamento` |
| Choque de horário | Sim, desde a 0021 — gatilho `atendimentos_sem_choque` |

### A RLS filtra em silêncio — e isso mente nos agregados

**A política de SELECT não recusa: ela devolve menos linhas, sem erro.** Para uma
soma, "não posso ver" e "não existe" ficam indistinguíveis, e o total sai errado
sem nada avisar.

Isso já causou um bug real: a recepção abria `/financeiro` e via
`resultadoDeCaixa = líquido − 0` como fato, porque a RLS zerava as despesas dela.
Corrigido em 28/08/2026 — e o padrão da correção é o que se deve seguir daqui
em diante.

**Regra ao escrever consulta agregada sobre tabela com RLS por papel.** Escolha
uma das três saídas, nunca uma quarta:

| Saída | Quando | Exemplo no código |
|---|---|---|
| O número vira `number | null` | A tela é legítima para quem não vê tudo | `IndicadoresDoPeriodo.despesasPagas` |
| A consulta **falha alto** | A tela inteira perde sentido sem o dado | `fluxoMensal()` lança se não for financeiro |
| A rota é fechada | Mesma coisa, do lado da página | `/financeiro/fluxo` → `SomenteFinanceiro` |

`null` quer dizer **"não visível para este perfil"**, e nunca zero. O tipo é a
trava: quem consumir é obrigado pelo typechecker a decidir o que mostrar, e o
padrão da casa é traço (`—`) com a razão à vista, como no botão indisponível.

**Nunca some uma tabela restrita numa tela aberta e imprima o total.**

### Fluxo de sessão

- [`src/middleware.ts`](src/middleware.ts) → [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts):
  renova a sessão a cada requisição e redireciona para `/entrar` quem não está
  autenticado. Rotas públicas: `/entrar`, `/sem-acesso`, `/assinar`,
  `/recuperar-senha` e `/redefinir-senha`. Guarda o destino em `?proximo=`.
- Recuperação de senha: `/recuperar-senha` pede o link com
  `resetPasswordForEmail()` e confirma o pedido sem revelar se o e-mail existe.
  `/redefinir-senha` valida o `token_hash` com `verifyOtp({ type: "recovery" })`
  ou recebe o evento `PASSWORD_RECOVERY` do fluxo PKCE; só então permite
  `updateUser()`. A página exige senha de pelo menos 12 caracteres e confirmação,
  guarda por 15 minutos uma marca de recuperação vinculada ao usuário na sessão
  da aba, remove o token da URL e encerra a sessão local após a troca. Não é
  uma rota para alterar a senha de uma sessão comum. O retorno local
  `http://localhost:3000/redefinir-senha` está cadastrado no Supabase. Para
  produção, cadastre também a URL exata da implantação e configure SMTP próprio;
  veja [`supabase/README.md`](supabase/README.md).
- [`src/app/(app)/layout.tsx`](src/app/(app)/layout.tsx): trata o caso de ter
  sessão válida mas **perfil desativado** → `/sem-acesso`.
- **Sempre `getUser()`, nunca `getSession()`.** `getUser` valida o token no
  servidor do Supabase; `getSession` só lê o cookie, que o navegador pode ter
  adulterado.

---

## 6. Arquitetura

### Stack

Next.js 15 (App Router) · React 19 · TypeScript estrito · Tailwind CSS v4 ·
Supabase (`@supabase/ssr`) · `lucide-react` · `server-only`.

O `<html>` do layout raiz usa `suppressHydrationWarning` porque uma extensão
do navegador acrescentou `data-gitmind-ai-assistant-color-mode` antes da
hidratação e gerou um aviso de atributo divergente. A supressão vale só para
esse elemento; se o aviso apontar para outro componente, investigue o conteúdo
renderizado no servidor e no cliente. Ela não corrige divergências de dados.

Dependências são poucas de propósito. **Antes de adicionar uma, pergunte se dá
para escrever.** O leitor de CSV foi escrito à mão (203 linhas) porque nenhuma
biblioteca genérica resolve as três particularidades da planilha brasileira ao
mesmo tempo. Fonte via `next/font` (Hanken Grotesk), sem requisição externa em
tempo de execução.

Alias de import: `@/*` → `./src/*`.

### Organização

```
src/
  middleware.ts           renova a sessão e barra rota protegida
  app/
    layout.tsx            fontes, idioma e supressão do aviso de hidratação no html
    globals.css           TODOS os tokens de cor, tipografia, raio e sombra
    entrar/               login: página, formulário e ação
    recuperar-senha/      solicitação do link de recuperação
    redefinir-senha/      validação do link e definição da nova senha
    sem-acesso/           conta existe mas não foi liberada
    error.tsx  global-error.tsx   telas de erro fora do sistema e do layout raiz
    (app)/                tudo que exige sessão válida
      layout.tsx          estrutura principal + faixa de demonstração; force-dynamic
      error.tsx           erro dentro do sistema: menu de pé, aviso na área de conteúdo
      loading.tsx         esqueleto enquanto a próxima tela carrega
      page.tsx            Visão Geral
      pacientes/  agenda/  financeiro/  configuracoes/  busca/  relacionamento/  …
  components/
    layout/               estrutura, menu, cabeçalho, perfil, faixa de demonstração, tela de erro
    ui/                   cartão, botão, campo, formulário de ação, abas, seletor segmentado,
                          chip de situação, prioridade, lista, avatar, vazio
    overview/  pacientes/  agenda/  financeiro/  configuracoes/  prontuarios/  relacionamento/
  server/
    consultas/            LEITURA do banco — `server-only`, uma função por assunto
    acoes/                ESCRITA no banco — `"use server"`, validação de verdade
  lib/
    supabase/             clientes (servidor, navegador, middleware) + tipos gerados
    auth.ts               usuário da sessão com o perfil carregado (server-only)
    perfil.ts             tipos e rótulos de papel — NÃO é server-only, cliente usa
    dominio.ts            tipos de enum do banco para uso no cliente
    dates.ts              todo cálculo de dia, no fuso da clínica
    format.ts             pt-BR: moeda, data, hora
    periodo.ts            o mês da URL (?mes=AAAA-MM)
    moeda.ts              centavos inteiros e pontos-base
    venda.ts  despesa.ts  paciente.ts  procedimento.ts  atendimento.ts   regras de negócio
    prontuario.ts  prontuario-imagens.ts   regras do registro clínico e das fotos
    csv.ts  importacao.ts leitor de planilha e validação da importação
    busca.ts  relacionamento.ts   busca segura e validação do acompanhamento
    nav.ts                fonte única do menu + identidade da clínica
    erros-banco.ts        erro do Postgres → frase em português (nada cru na tela)
    registro.ts           log técnico sanitizado + falha de consulta (server-only)
    acao.ts               `ResultadoAcao`, o contrato das ações de botão
    formulario.ts         leitura do FormData nas ações: texto, UUID, valores digitados
supabase/
  migrations/             estrutura do banco, versionada
  testes/permissoes.sql   testes do banco por perfil (npm run test:banco)
  usuarios-locais.json    contas de teste do Supabase local
  dados-exemplo*.sql      semeadura e limpeza da demonstração
testes/                   preparação do Vitest e o Supabase falso das ações
e2e/                      Playwright: fluxos e telas, contra o Supabase local
scripts/                  contas locais, testes do banco, geração segura de tipos
docs/
  overview-sistema.md     documento de produto
  redesign                mockup do Google Stitch (referência visual, NÃO é fonte)
```

### As regras de arquitetura

**1. Componente não conversa com o banco.**
Leitura passa por `src/server/consultas/`, escrita por `src/server/acoes/`.
Sem exceção.

**2. Consulta é `server-only`, ação é `"use server"`.**
`import "server-only"` no topo de todo arquivo de consulta. O import vaza para
o cliente? O build quebra — que é exatamente o que se quer.

**3. Toda escrita valida no servidor.**
A validação do formulário é conveniência para responder rápido. **Quem envia o
formulário por fora não passa por ela.** A validação que vale é a da ação.

**4. A regra mora em `lib/`, e é chamada pelos dois lados.**
`validarPaciente`, `calcularVenda`, `validarDespesa` são usadas pelo formulário
**e** pela ação. Por isso esses arquivos **não** são `server-only`. *Uma regra
escrita duas vezes vira duas regras diferentes na terceira mudança.* Foi
exatamente esse o cuidado que impediu a importação em massa de virar a porta
dos fundos das validações do cadastro.

**5. Estado de tela mora na URL.**
Busca, filtro, página, dia da agenda, mês do financeiro — tudo em query string.
Recarregar, voltar pelo navegador e mandar o link para outra pessoa precisam
funcionar. Formulário de busca é `form method="get"`: sem JavaScript, o Enter
ainda busca.

**6. Botão de ação é formulário de verdade.**
Os botões de situação da agenda funcionam sem JavaScript — um `<form>` por
transição.

**7. Depois de escrever, `revalidatePath`.**
Inclusive `/`, porque a Visão Geral agrega quase tudo.

**8. Formulário tem um contrato fixo. Siga-o.**
A ação exporta `type EstadoX = { erros: ErrosX; valores?: Record<string,string> }`
e recebe `(_anterior, dados: FormData)`. O componente é `"use client"` e usa
`useActionState`. Em erro, a ação devolve `valores` com o que foi digitado, para
o formulário não esvaziar. O botão de envio é **sempre um componente filho local**
que chama `useFormStatus()` — `useFormStatus` só enxerga o `<form>` de um
ancestral, então um botão no mesmo componente do form nunca fica `pending`.

> O que se usa é `BotaoLink` (navegação), `FormularioDeAcao` + `BotaoDeAcao`
> (ação de um botão só) e botões locais com `useFormStatus` nos formulários
> maiores. As primitivas de `ui/` (`Card`, `CardCabecalho`, `CardCorpo`,
> `EstadoVazio`, `SituacaoChip`, `NavegacaoEmAbas`, `SEGMENTO_GRUPO`) e as
> classes de campo são obrigatórias — reusar, nunca reinventar com Tailwind solto.
>
> **Campo: altura, largura, recuo e texto são opções, não sobrescrita.** Use
> `classeDeEntrada({ altura: "compacta", largura: "auto" })`, nunca
> `cn(ENTRADA, "h-9 w-auto")`. `cn()` só junta texto, e no Tailwind v4 quem vence
> entre `h-11` e `h-9` é a ordem do CSS gerado, não a da classe — foi assim que a
> navegação de dias da Agenda empilhou e que a borda vermelha de erro nunca
> apareceu. `Campo` liga sozinho erro, dica e obrigatório ao controle por ARIA
> quando o filho é o próprio `input`/`select`/`textarea`.

**9. Ação de botão devolve `ResultadoAcao`, e o botão mostra a resposta.**
Arquivar, mudar situação, ativar, revogar, pagar: a ação recebe
`(_anterior: ResultadoAcao, dados)` e devolve `sucesso()` ou `falha(frase)`
(`lib/acao.ts`); o componente usa `FormularioDeAcao`, que continua sendo
`<form>` de verdade e mostra a recusa ao lado do botão. Toda escrita confere que
alcançou uma linha (`.select("id").maybeSingle()`): RLS que esconde a linha não
dá erro — dá zero linhas, e zero linhas não é sucesso. Quando duas pessoas podem
mexer no mesmo registro, a condição de estado vai **no UPDATE**
(`.in("situacao", ["previsto", "pendente"])`), não só na leitura antes.

**10. Nenhuma ação usa `try/catch`, e `redirect()` é sempre a última linha.**
`redirect()` funciona lançando uma exceção que o Next captura: dentro de um
`try` ela seria engolida e a navegação não aconteceria. Ordem fixa:
valida → escreve → checa erro → `revalidatePath` → `redirect`.

**11. Erro de banco vira mensagem em português — por `lib/erros-banco.ts`.**
Nunca vaze `error.message` cru. `mensagemDoBanco(error, "frase padrão",
{ "23505": "Já existe uma paciente com este CPF." })` traduz: frase nossa de
`raise exception` (P0001) passa, permissão do Postgres vira frase neutra,
código conhecido vira frase do domínio, o resto vira a padrão. O detalhe técnico
vai para o log por `registrarFalha(contexto, error)` — sanitizado, sem `details`
nem valor digitado. Consulta que falha usa `falhaDeConsulta(...)`, que registra
e lança uma frase segura para o `error.tsx` da rota. **Consulta que não lê o
`error` é bug**: falha de banco vira lista vazia e ninguém fica sabendo.

---

## 7. Regras transversais

### 7.1 Dinheiro — centavos inteiros

Toda conta financeira acontece em **inteiros**, em [`src/lib/moeda.ts`](src/lib/moeda.ts).
`0.1 + 0.2` não é `0.3` em ponto flutuante, mas `10 + 20` é exatamente `30`. A
conversão para reais só existe nas bordas: ao ler o que a pessoa digitou e ao
gravar no banco, cujo `numeric` também é exato.

Percentual vira **pontos-base**: 6,5% = `650`. A taxa é
`round(valor × bp / 10000)` — uma multiplicação e uma divisão inteiras, com
**um único arredondamento por operação**.

E o banco confere de novo, por CHECK constraint:

```
valor_original − desconto = valor_final
valor_final − taxa_valor  = valor_liquido
```

**Mas não confie nelas como rede contra arredondamento.** Quando a gravação passa
por `venda_registrar`, a função deriva `valor_final` e `valor_liquido` das mesmas
entradas que a constraint confere — a igualdade é satisfeita por construção. As
CHECKs pegam INSERT direto com valores incoerentes, não erro de cálculo da
aplicação. Quem garante o centavo é `lib/moeda.ts`.

### 7.2 Fuso horário — sempre o relógio da clínica

O banco guarda instantes em UTC e o servidor pode rodar em qualquer fuso. A
clínica pensa em **horário de São Paulo**: "a agenda de hoje" é o dia de São
Paulo, não o do servidor. Perto da meia-noite os dois divergem.

**Todo cálculo de dia passa por [`src/lib/dates.ts`](src/lib/dates.ts)** e toda
exibição por `format.ts`, que formata no mesmo fuso — servidor e navegador
produzem a mesma string.

`FUSO_CLINICA = "America/Sao_Paulo"`. Nunca use `new Date().getDate()`,
`toLocaleDateString()` sem fuso, nem construa data a partir da hora do servidor.
Use `hoje()`, `inicioDoDia()`, `instanteNaClinica()`, `chaveDoDia()`,
`dataDoBanco()`.

**`instanteNaClinica` normaliza de propósito** (é o que faz `somarDias` virar o
mês) e por isso **não valida**: 31/02 vira 03/03. Toda data que chega de
formulário passa antes por **`dataValida()`** (e hora por `horaValida()`), em
`lib/dates.ts` — a mesma função no cadastro, na agenda, na venda, na despesa,
no prontuário e na busca. Os casos de borda (virada de dia às 03h UTC, fim de
mês, 29/02, horário de verão histórico) estão em `src/lib/dates.test.ts`.

### 7.3 Cor — duas famílias que não se misturam

**Nenhuma cor é escrita fora de [`src/app/globals.css`](src/app/globals.css).**
Nada de `bg-[#ABC123]` em componente.

**Marca (azul)** — navegação, ações principais, links, títulos, foco. Não
comunica estado nenhum: é a cor de "o sistema", não de "a situação".

**Estado — quatro semânticas fixas**, e a regra que as separa é o que importa:

| Semântica | Quando |
|---|---|
| **negativo** (vermelho `#bb0000`) | Não compareceu · cancelado · vencido · falha · pendência crítica |
| **atenção** (laranja `#8f4700`) | Confirmação pendente · aguardando assinatura · retorno próximo · cadastro incompleto |
| **positivo** (verde `#107e3e`) | Confirmado · recebido · concluído |
| **informativo** (azul `#0854a0`) | Agendado · em atendimento · aviso neutro |

> **Vermelho é para o que deu errado. Laranja é para o que falta fazer.** Se
> toda pendência normal for vermelha, o valor vencido deixa de se destacar. Se
> tudo grita, nada é ouvido.

**O segundo papel do vermelho: dinheiro saindo.** Todo valor de despesa é
vermelho, na convenção contábil, por decisão da clínica. Entrada ganha o verde
correspondente. São **eixos diferentes** do chip de situação: despesa "paga" é
verde no chip (tarefa resolvida) com o valor vermelho (saiu do caixa).

**A taxa de cartão não herda o vermelho de despesa** — ela não é despesa, é
dedução do líquido, mostrada como "−" na conta da venda.

O laranja tem dois tons de propósito: `#e9730c` em ícone e borda, `#8f4700` em
texto. `#e9730c` sobre o fundo suave dá 2.75:1 e reprova no WCAG AA.

### 7.4 Acessibilidade

- Todo par texto/fundo passa no **WCAG AA** (mínimo 4.5:1).
- **Cor nunca comunica sozinha.** Todo estado leva também texto, ícone próprio
  e forma (preenchido, contornado).
- Foco sempre visível.
- `aria-current` na navegação; atalho "Ir para o conteúdo".
- `prefers-reduced-motion` respeitado.
- **Botão que não executa nada fica visivelmente indisponível, com a razão à
  vista** (no `title`). Não some, não engana.

### 7.5 Idioma

Interface, mensagens de erro, nomes de função, variáveis, comentários, nomes de
coluna, migrações e mensagens de commit: **tudo em português**.
`clienteServidor`, `usuarioAtual`, `validarPaciente`, `taxa_percentual`.

**Nome de arquivo é a exceção, e ela tem forma.** Em `components/ui/`,
`components/layout/` e `components/overview/` o arquivo é em inglês e o símbolo
exportado em português: `button.tsx` exporta `BotaoLink`, `empty-state.tsx`
exporta `EstadoVazio`, `day-rail.tsx` exporta `LinhaDoDia`. Nos módulos de
domínio (`pacientes/`, `agenda/`, `financeiro/`, `configuracoes/`) o arquivo
também é português: `formulario-venda.tsx`, `lista-despesas.tsx`. **Siga a
convenção da pasta em que você está**, não uma regra global.

Valores e datas no padrão brasileiro.

### 7.6 Busca global

O cabeçalho abre `/busca?q=...` por um formulário GET; no celular mostra um
atalho para a página. A busca começa com dois caracteres e o termo é limitado
a 80. `lib/busca.ts` remove operadores especiais e normaliza espaços antes de
montar filtros do PostgREST; uma data é interpretada no fuso da clínica.

Busca pacientes (inclusive arquivadas), atendimentos por paciente,
procedimento ou data, documentos por título/paciente e prontuários por
título/paciente **só para a administradora**. Os resultados respeitam a RLS,
e a página nunca lê conteúdo clínico nem mostra consolidado financeiro. Cada
categoria oferece links diretos; resultados extensos de pacientes, documentos
e prontuários levam às listagens filtradas. Atendimentos mostram até oito
ocorrências recentes e apontam para o cartão do dia na Agenda; se houver mais,
a tela pede um termo mais específico. O estado fica na URL, e o Enter funciona
sem JavaScript. Não há mudança de banco.

---

## 8. Regras de negócio por módulo

### 8.1 Pacientes

- **Nome social tem precedência em toda a interface.** O nome de registro só
  aparece na ficha e na lista, identificado como tal.
- **Só o nome é obrigatório** (mínimo 3 caracteres). CPF, telefone, e-mail e
  nascimento são opcionais — mas validados quando informados.
- CPF confere os dois dígitos verificadores e recusa sequências de um dígito só.
  **CPF repetido é recusado pelo índice único do banco**, não só pela tela.
- Telefone: DDD a partir de 11; celular com 11 dígitos precisa do 9.
- Nascimento não pode estar no futuro nem antes de 1900.
- UF precisa estar na lista dos 27 estados. **Origem é lista fechada no `<select>`
  do formulário, e só ali** — o servidor não valida o campo, e a importação de
  planilha grava texto livre de propósito. Trate a lista como convenção da
  interface, não como garantia.
- **Observações são administrativas** (preferência de horário, quem indicou,
  forma de contato). Conteúdo clínico vai para o prontuário — está escrito no
  campo e no comentário da coluna no banco.
- **Endereço em `jsonb`**, lido com tolerância: registro antigo fora do formato
  não quebra a ficha.
- **Não existe excluir paciente.** Ela tem atendimento, recebimento e, adiante,
  documento assinado apontando para o cadastro; o banco recusaria
  (`on delete restrict`). **Arquivar** tira da lista, preserva tudo e é
  reversível no clique seguinte.
- **Ficha inexistente e ficha sem permissão devolvem a mesma tela.** A RLS não
  distingue as duas, e a interface também não deve — dizer que o registro existe
  já é informação.

**Busca** (`/pacientes`): cobre nome, nome social, e-mail e telefone. Quando o
termo é só dígito, procura também no CPF — a recepção digita `11987654321`, não
o formato guardado. Vírgula, parêntese, aspas, barra invertida, `*` e `%` são
**retirados do termo** antes de virar filtro: os quatro primeiros são a gramática
do PostgREST, os dois últimos viram curinga no `ilike` (quem digitasse `%`
listaria a base inteira). Ver `termoSeguro()` em
[`src/server/consultas/pacientes.ts`](src/server/consultas/pacientes.ts).

**Importação de planilha** (`/pacientes/importar`, restrita à administradora):

- Dois passos. **Nada é gravado antes da confirmação.**
- O arquivo é enviado nos dois passos e **reprocessado no servidor**. Devolver
  as linhas já analisadas seria mais rápido, mas então o que entra no banco
  seria o que o navegador disse ter lido — e não é ele quem decide.
- Separador `;` detectado contando **fora das aspas** (Excel pt-BR usa
  ponto-e-vírgula porque a vírgula é o decimal).
- Encoding: **UTF-8 estrito primeiro, Windows-1252 como queda**. A ordem
  importa — Latin-1 nunca falha, então testá-lo antes leria todo arquivo UTF-8
  com acento errado.
- BOM removido; data `dd/mm/aaaa` convertida, com a data interpretada na prévia.
- Colunas reconhecidas **pelo nome**, sem acento e sem maiúscula. Coluna
  desconhecida é **listada como ignorada**, não faz falhar.
- **A validação é a mesma do cadastro manual** (`validarPaciente`).
- Duplicata só por CPF — homônimo existe, nome igual não prova nada. CPF
  repetido dentro do próprio arquivo também é detectado.
- Gravação em lotes de 100; lote que cai é reenviado linha a linha.
- Limites: 2 MB e 2000 linhas. `next.config.ts` sobe o
  `serverActions.bodySizeLimit` para 3 MB para a mensagem da tela aparecer em
  vez de o envio morrer antes.

### 8.2 Agenda

- **Escolher o procedimento preenche duração e valor da tabela**, editáveis caso
  a caso — o combinado pode ser outro.
- **O seletor de paciente busca no servidor** (mesma consulta e RLS da
  listagem), devolve até 8 opções e guarda só o `paciente_id`. **A base nunca
  desce inteira para o navegador.**
- **Choque de horário é recusado** para o mesmo profissional, com o nome de quem
  já ocupa. Cancelados e ausências liberam a vaga. A comparação acontece na
  aplicação porque o PostgREST não filtra por `inicio + duracao`, e um dia tem
  dezenas de linhas, não milhares.
  > **Quem garante é o banco (0021).** O gatilho `atendimentos_sem_choque`
  > trava o profissional (`pg_advisory_xact_lock`) e compara o intervalo inteiro,
  > sem janela: duas recepcionistas marcando o mesmo horário no mesmo segundo não
  > passam juntas, e o erro sai como `23P01`. A ação continua conferindo antes,
  > com uma janela de 8 horas (a duração máxima), só para dizer **com quem**
  > choca. Reabrir um cancelado também é conferido: se o horário foi ocupado, a
  > tela pede para remarcar.
- **A situação não é máquina de estados rígida.** A interface oferece só os
  caminhos que fazem sentido (`PROXIMAS_SITUACOES` em
  [`src/lib/atendimento.ts`](src/lib/atendimento.ts)), mas **o servidor aceita
  qualquer situação válida** — um "concluído" clicado errado precisa ter volta.
  Cancelado e ausente reabrem como agendado.
- **Toda mudança é gravada por gatilho** em `atendimento_situacoes`, com autor e
  hora.
- Hora é lida como **hora de parede da clínica** (`instanteNaClinica`), nunca do
  servidor.
- Duração: inteiro entre 5 e 480 minutos.

As sete situações: `agendado`, `aguardando_confirmacao`, `confirmado`,
`em_atendimento`, `concluido`, `cancelado`, `ausente`.

### 8.3 Configurações → Procedimentos

- **Todo mundo vê a tabela; só a administradora escreve** — na página e de novo
  na ação, espelhando a política `procedimentos_escrita`.
- **Procedimento não se apaga.** O histórico aponta para ele
  (`on delete restrict`). *"Tirar da agenda"* esconde das novas marcações — o
  formulário da Agenda só lista ativos — e preserva o passado.
- **Editar muda o padrão, não o passado.** Duração e valor gravados em cada
  atendimento são cópias do momento da marcação.
- **Produtos não existem no sistema.** "Produtos" hoje é só categoria de
  despesa. Estoque e venda de produto são decisão futura, com migração própria.

### 8.4 Financeiro — as regras que valem dinheiro

**Estas são as regras mais delicadas do sistema. Não altere nenhuma sem
confirmar com a clínica.**

- **Cartão parcelado, repasse único.** A paciente parcela, a operadora antecipa,
  a clínica recebe **uma vez** — a taxa já inclui a antecipação. Uma venda em 5x
  gera **UM** recebimento. Não existem parcelas mensais de repasse, e por isso
  não existe laço de parcelas em `venda_registrar`.
- **A taxa é da clínica, não da paciente:** desconta do valor final, nunca
  acrescenta. `líquido = final − (final × taxa)`.
- **A taxa nunca conta duas vezes.** Ela é dedução do líquido; **não existe como
  despesa**. Contar de novo dobraria o custo.
- **A taxa é copiada na venda.** `taxa_percentual` e `taxa_valor` são fotografia
  do momento; `taxa_cartao_id` é só proveniência. **Mudar a tabela padrão amanhã
  não pode mudar o que já foi vendido.**
- **Taxa manual exige justificativa**, fica marcada na venda e **não toca a
  tabela padrão**. Restrita ao financeiro e à administradora — verificado também
  dentro de `venda_registrar`.
- **Gravação composta é função do banco.** `venda_registrar` e
  `venda_alterar_pagamento` fazem tudo ou nada. O cliente HTTP não tem
  transação: se a segunda escrita falhasse, sobraria meia venda.
- **Registro financeiro não se apaga.** **Corrigir é cancelar, ajustar ou
  reabrir.** Desde a 0019 o banco garante isso em todas as tabelas do
  Financeiro — nenhuma tem política nem grant de DELETE —, e `despesas` e
  `taxas_cartao` entraram na auditoria.
- **Recebimento confirmado não se reescreve** (gatilho da 0020): valor, datas,
  forma e situação ficam como estão; a diferença de uma mudança posterior entra
  como ajuste. Recebimento no futuro é recusado na tela e na ação.
- **A origem da taxa é conferida pelo banco** (0020): forma sem cartão não tem
  taxa; cartão sem taxa manual aponta uma linha da tabela padrão do mesmo tipo e
  parcelamento, e o percentual é o dela; o valor da taxa precisa ser
  `round(final × percentual / 100, 2)` — o mesmo arredondamento de
  `lib/moeda.ts`. Se a tela e o banco divergirem, a gravação falha em vez de
  guardar um número que ninguém viu.
- **Só o crédito parcela** (até 24x). Débito e demais formas: 1.

**Mudança de forma de pagamento ou de taxa:**

Antes de confirmar, a tela mostra o comparativo antes → depois (forma, parcelas,
taxa, líquido) e **exige motivo**. Depois:

| Estado do recebimento | O que acontece |
|---|---|
| Ainda **previsto** | É reescrito com os valores novos |
| Já **confirmado** | O registro original **não é tocado** — a diferença vira linha em `ajustes_financeiros` |

Tudo entra em `venda_alteracoes`, com autor, data e hora.

> Quem decide isso é a função SQL `venda_alterar_pagamento` (migração 0008), não
> a aplicação. `decidirEfeito()` em `src/lib/venda.ts` descreve a mesma regra mas
> **não é chamado por ninguém** — é código morto. Lê-lo ajuda a entender; alterá-lo
> não muda comportamento nenhum.

**Situações do recebimento:** `previsto` · `pendente` · `recebido` ·
`recebido_divergencia` (valor efetivo ≠ líquido previsto — **decidido pelo
sistema, não por opinião**) · `cancelado`.

> **`situacao` não é uma coluna solta.** CHECK constraints a amarram a outras
> colunas: `recebimento_coerente` exige que `recebido`/`recebido_divergencia`
> tenham `recebido_em` **e** `valor_recebido`, e que as demais situações tenham
> os dois nulos; `despesa_coerente` faz o mesmo com `paga`/`pago_em`. Um UPDATE
> que mexa só na situação é recusado pelo banco. Sempre escreva o conjunto.

**Situações da despesa:** `pendente` · `paga` · `cancelada`. **"Vencida" é
derivada** (pendente com prazo no passado), nunca gravada — estado gravado
envelheceria errado à meia-noite.

**Os números:**

```
resultado de caixa = líquido recebido − despesas pagas
líquido recebido   = valor efetivo dos recebimentos confirmados + ajustes
a receber          = estoque, não fluxo: tudo que ainda não entrou,
                     de qualquer período
```

**Lucro não entra.** A regra não foi definida pela clínica — falta decidir o que
entra na conta (valor bruto, custo de produto, comissão, impostos, taxa). Não
invente um indicador de lucro.

**Permissões do módulo:**

| Ação | Recepção | Financeiro | Administradora |
|---|:--:|:--:|:--:|
| Registrar venda com taxa padrão | ✓ | ✓ | ✓ |
| Confirmar recebimento, lançar despesa | — | ✓ | ✓ |
| Alterar forma de pagamento / taxa (com motivo) | — | ✓ | ✓ |
| Configurar a tabela de taxas | — | — | ✓ |

### 8.5 Prontuários

O prontuário é o registro clínico da paciente. Nesta etapa, fica restrito à
administradora porque ainda não existe perfil `profissional`.

- A listagem busca por título do prontuário e por dados da paciente.
- Novo prontuário pode nascer pela rota `/prontuarios/novo`, pela ficha da
  paciente (`?paciente=`) ou por um atendimento (`?atendimento=`).
- O conteúdo clínico não é sobrescrito. Alterar cria uma nova linha em
  `prontuario_versoes`, com motivo, autor e data; o cabeçalho em `prontuarios`
  guarda só paciente, atendimento opcional, data e título atuais.
- `prontuario_versoes` não tem política de UPDATE nem DELETE. Corrigir conteúdo
  clínico significa criar nova versão.
- As três camadas barram acesso: interface (`ehAdministradora()`), ação de
  servidor e RLS/função do banco.

Campos clínicos atuais: queixa/anamnese, avaliação, conduta, evolução,
orientações e observações clínicas. Pelo menos um precisa estar preenchido.

#### Fotos de evolução (migrações 0011 e 0012)

A galeria fica no fim da página do prontuário: enviar, ampliar, corrigir
legenda e data, arquivar e eliminar.

É a informação mais sensível que o sistema guarda: dado de saúde com a pessoa
identificável na própria imagem.

- **O arquivo não entra no Postgres.** Bucket privado `prontuario-imagens`
  (10 MB, só jpeg/png/webp); a tabela `prontuario_imagens` guarda caminho e
  metadados. A exibição usa URL assinada de validade curta — nunca URL pública.
- **A imagem pertence ao prontuário, não à versão.** Versionar serve para texto
  que se corrige; foto se acrescenta ou se remove. Amarrá-la a
  `prontuario_versoes` faria cada correção de texto orfanar ou duplicar as
  fotos. O eixo da evolução é a `data_captura` de cada imagem — quando foi
  *tirada*, não quando foi enviada.
- **O caminho tem forma obrigatória:** `<prontuario_id>/<uuid>.<ext>`, com CHECK
  no banco. Sem isso uma linha poderia apontar para o arquivo de outra paciente.
- **Existe uma quarta porta.** A RLS da tabela não protege o arquivo: quem sabe
  o caminho fala com `storage.objects`, que tem política própria. As quatro
  políticas de Storage da 0011 são as primeiras do projeto — **toda tabela nova
  que use Storage precisa das suas.**

##### A exceção ao "não se apaga"

`prontuario_imagens` é a **única tabela com política de DELETE**, e é
deliberado. Venda e recebimento não se apagam porque são memória contábil:
quem apaga, esconde. Foto do corpo de uma paciente é outra coisa — a LGPD
(art. 18, VI) lhe dá o direito de pedir eliminação, e guardar a imagem contra
a vontade dela não protege ninguém.

O que permanece é a auditoria: o gatilho grava caminho, metadados, autor e
hora da linha removida — prova de que a imagem existiu e foi eliminada, **sem
a imagem**. E o **motivo**, que a 0012 acrescentou: `auditoria` guarda o que a
imagem era, não por que deixou de existir, e o papel `authenticated` só tem
SELECT nela. Sem uma tabela própria, a tela pediria uma justificativa que o
sistema descartaria no mesmo instante.

Duas coisas que a implementação respeita, e que precisam continuar valendo:

1. **Apagar a linha não apaga o arquivo.** São dois lugares, e a ordem importa:
   **arquivo primeiro**. Invertida, se a remoção do arquivo falhar sobra um
   objeto órfão no bucket — dado de saúde sem dono e sem rastro. Quando o
   Storage recusa, `eliminarImagem` para ali e não apaga nada.
2. **`arquivada` não é eliminação.** Ela tira da tela e preserva (foto tremida,
   duplicada, enquadramento errado). Eliminar é DELETE, e só a pedido da
   titular, com motivo (mínimo de 10 caracteres, guardado) e confirmação
   marcada — as duas conferidas de novo no servidor.

##### O arquivo não passa pela ação de servidor

O navegador manda o arquivo direto para o Storage; a ação de servidor grava
só a linha. **Não é otimização:** a Vercel corta o corpo de uma requisição de
função em 4,5 MB e o bucket aceita 10 MB — uma foto no meio dessa faixa
morreria com um erro de plataforma que a tela não teria como explicar.

Quem autoriza o envio é a política de Storage da 0011, que só deixa a
administradora escrever no bucket. É a mesma barreira, em outro lugar.

Duas consequências que a implementação carrega:

- **O servidor não acredita no cliente.** `registrarImagem` lê tamanho e tipo
  de volta do objeto (`storage.list`) antes de gravar a linha. O navegador
  poderia declarar qualquer coisa, e uma linha que descreve um arquivo
  diferente do que está lá é pior do que nenhuma linha. A ida ao Storage
  também confirma que o upload chegou.
- **Se a linha falha, o arquivo sai junto.** A ordem de criação é o inverso da
  de eliminação, pelo mesmo motivo: arquivo sem linha é dado de saúde sem dono.
- As fotos sobem **uma de cada vez**. A `ordem` de cada foto vem da maior já
  gravada; em paralelo, duas do mesmo dia leriam o mesmo número.

##### Exibir

URL assinada de **15 minutos**, geradas em lote (`createSignedUrls`) na
consulta que monta a página. Curto para um endereço que entrega dado de saúde
a quem o tiver, e tempo de sobra para o que a página faz com ele — carregar as
fotos assim que abre.

Por isso a grade **não** usa `loading="lazy"`: uma foto abaixo da dobra,
buscada meia hora depois, chegaria com a assinatura vencida. Baixar tudo
enquanto a assinatura vale é mais honesto do que esticá-la para caber na
rolagem. Quem sustenta a visita depois é o cache do navegador.

**Nada de `next/image` aqui.** O otimizador faria uma cópia da foto no cache da
CDN — fora do bucket privado e fora da RLS que protege o resto. Dado de saúde
não sai pela porta que o guarda. É a razão dos dois
`eslint-disable-next-line @next/next/no-img-element` do módulo, e não há
miniatura: a grade carrega o arquivo inteiro, o que é aceitável para as poucas
fotos por prontuário e evita uma segunda cópia da mesma imagem no bucket.

Quando o objeto não está mais no bucket, a URL volta nula e a linha aparece na
grade **sem imagem, com o aviso**. É assim que se descobre um arquivo perdido,
em vez de a foto sumir da tela sem explicação.

##### Ordem na tela

Cronológica **crescente** — o contrário do resto do sistema, onde o mais
recente vem no topo. Evolução se lê do antes para o depois. A coluna `ordem`
desempata dentro do mesmo dia, que é quando a clínica fotografa vários ângulos
de uma vez. **Não há reordenação manual** na tela: a ordem é a de envio.

##### Aberto

**Consentimento não está modelado.** Foto de paciente normalmente exige termo
assinado, que viverá no módulo Documentos — decidido em 29/08/2026 que os dois
módulos **não se acoplam**: a paciente assina o termo e tira as fotos, sem o
sistema ligar uma coisa à outra. Consequência a assumir: não há, no banco,
registro de qual termo autorizou qual foto. Se isso passar a ser exigido, entra
por migração nova.

### 8.6 Visão Geral

Agrega tudo: indicadores do dia e do mês, linha do dia com marcador "agora",
pendências, próximos retornos, resumo financeiro e aniversariantes.

- O indicador "atendimentos de hoje" **desconta os cancelados**. (Falta confirmar
  com a clínica se é assim que ela pensa — ver seção 10.)
- A Linha do Dia hoje se ajusta aos atendimentos existentes, porque o **horário
  de funcionamento ainda não foi definido**.

### 8.7 Documentos e Contratos (migração 0013)

Contrato, termo e orientação: cadastrar o modelo, emitir para a paciente e
colher a assinatura. Rota `/formularios`; modelos em `/formularios/modelos`.

Contrato e anamnese têm naturezas diferentes, e o modelo separa as duas:

- **Modelo** — texto que se corrige. Versionado, com autor, data e motivo em
  cada versão, no mesmo desenho de `prontuarios` + `prontuario_versoes`.
- **Documento emitido** — depois de emitido, **não muda mais**. Correção gera
  documento novo que referencia o anterior, e o anterior vira `substituido`.

#### Congelar o texto é o ponto central

Se o modelo mudar em março, o contrato assinado em janeiro continua exibindo
exatamente o que a paciente leu — porque `documentos.corpo_congelado` guarda a
cópia integral, e `corpo_hash` guarda o SHA-256 dela.

**Quem congela é o banco, não a aplicação.** `documento_emitir` lê o corpo da
versão vigente do modelo dentro da própria função. Se o texto viesse por
parâmetro, quem soubesse chamar a API congelaria o que quisesse — e o hash
atestaria a mentira com a mesma confiança. É o mesmo princípio que faz
`registrarImagem` reler tamanho e tipo do Storage (§8.5).

O hash é calculado pelo gatilho `documento_congelar`, com `sha256` e
`convert_to` — embutidos do Postgres, sem depender de extensão instalada. E o
gatilho `documento_texto_nao_muda` recusa qualquer UPDATE que toque o corpo ou o
hash, e recusa tirar um documento assinado dessa situação. Congelar só vale se
for para valer.

#### Quem opera

Decidido em 13/09/2026, dividido por natureza do documento:

| O quê | Quem |
|---|---|
| Modelos — criar, versionar, aposentar | Só administradora |
| Modelos — consultar | Todo perfil ativo (a recepção precisa para emitir) |
| Contrato, termo, orientação — emitir, assinar, cancelar | Todo perfil ativo |
| Anamnese — qualquer coisa | Só administradora, como o prontuário |

A condição da anamnese aparece em **toda** política da 0013, inclusive nas de
`documento_assinaturas`, para não existir porta lateral: ler a assinatura
revelaria que o documento existe e para quem.

#### Assinatura: dois caminhos

A Lei 14.063/2020 reconhece a assinatura simples entre particulares. O que lhe
dá força é o conjunto de circunstâncias, e é ele que `documento_assinaturas`
guarda: nome, CPF (opcional), data e hora, como a identidade foi conferida e o
hash do texto assinado. A coluna `canal` diz por onde entrou, porque **as duas
não têm a mesma força de prova**:

| Canal | Como a identidade é conferida | Prova |
|---|---|---|
| `balcao` | Alguém da clínica olha documento com foto | Mais forte |
| `link` | Posse do endereço + data de nascimento | Mais fraca, e o registro diz isso |

**IP e dispositivo vêm dos cabeçalhos da requisição, nunca do formulário.**
Evidência que o próprio assinante pudesse digitar não serviria de evidência.
Quando o ambiente não informa, ficam nulos — não saber o IP não invalida o que
foi acordado.

#### A primeira superfície anônima (migração 0014)

> **Decidido em 13/09/2026**, invertendo a decisão tomada no mesmo dia de
> assinar só no balcão. A clínica quer mandar o link pela paciente assinar de
> onde estiver. O balcão continua funcionando.

Isto muda a postura do projeto e precisa estar na cara de quem for mexer:
**`anon` deixou de alcançar nada e passou a alcançar quatro funções** — as três
abaixo e `documento_responder_por_link` (0017). Nenhuma tabela: todas continuam
com `revoke all ... from anon`, respondendo 401 (`npm run test:banco` confere).

```
documento_link_estado       o link serve? (sem revelar conteúdo)
documento_para_assinatura   revela o texto, mediante data de nascimento
documento_assinar_por_link  assina
```

Cinco decisões contêm o risco, e nenhuma é dispensável:

1. **A porta é a função, não a tabela.** Cada uma devolve campo escolhido a
   dedo. `anon` não faz `select` em `documentos`, em `pacientes`, em lugar
   nenhum.
2. **O token não é guardado.** A tabela guarda o SHA-256. Um dump do banco
   entrega hashes, que não abrem link nenhum. O token em claro existe uma vez:
   no retorno de `criarLinkAssinatura`, para virar endereço. **Nem o sistema
   consegue remontá-lo depois** — perdido, gera-se outro, e o anterior é
   revogado na mesma transação.
3. **Dois fatores fracos.** O token (256 bits) prova posse do link; a data de
   nascimento prova que quem abriu é a paciente, e não quem recebeu o
   encaminhamento no grupo da família. Link de WhatsApp é encaminhado,
   fotografado e vai para backup em nuvem.
4. **Data de nascimento tem ~36 mil combinações**, então o link conta erros e
   se fecha no décimo. Por isso as funções públicas **devolvem situação em vez
   de levantar exceção**: exceção desfaria a transação e apagaria a contagem
   que deveria proteger. Se for mexer nelas, mantenha isso. E desde a 0022 a
   linha do link fica travada (`for update`) durante a conferência: antes,
   requisições em paralelo liam `tentativas < 10` ao mesmo tempo, e "dez" virava
   "dez mais o tamanho do pool de conexões".
5. **Sem data de nascimento cadastrada, não nasce link.** `data_nascimento` é
   opcional no cadastro; emitir link para quem não tem a data daria um link
   protegido só pelo token. A criação recusa e manda cadastrar.

A tela também não ensina nada a quem não deveria estar ali: link inexistente,
revogado e expirado dão respostas distintas apenas porque nenhuma delas revela
se o token existe — e só "data incorreta" diz o que houve, porque quem errou a
própria data precisa corrigir.

**`/assinar/[token]` é a única rota pública que serve conteúdo de paciente.**
`/recuperar-senha` e `/redefinir-senha` também ficam fora de `(app)`, mas só
interagem com o Supabase Auth. A assinatura não consulta o banco fora das
funções próprias do módulo.

#### A via da paciente (migração 0016)

A 0014 fechava o link no instante da assinatura. Estava errado, e o erro era de
fundo: **quem assina um contrato tem direito à via do que assinou**, e o sistema
entregava uma tela de agradecimento e mais nada.

Duas mudanças, e é bom entender por que elas não afrouxam nada:

1. **Assinar não revoga.** O link vale até a data de expiração, agora em modo
   leitura. A paciente volta e salva a via dela.
2. **`documento_para_assinatura` devolve o corpo também quando `ja_assinado`**,
   com quem assinou e quando. Antes o texto só saía enquanto havia o que
   assinar — o contrário do que uma via exige.

A data de nascimento continua sendo exigida a cada abertura, a contagem de
tentativas continua valendo, e a clínica continua podendo revogar na mão. Ler a
via é o **mesmo grau de acesso** que ler antes de assinar, não um grau novo.

Consequência assumida: o documento fica legível por quem tiver o link e a data
durante toda a validade, não só até a assinatura. Quem quiser encurtar isso
escolhe 7 dias na emissão, ou revoga depois que a paciente confirmar que salvou.
Cancelado e substituído continuam sem corpo — não há via de documento que
deixou de valer.

**O arquivo sai pela impressão do navegador**, não por biblioteca de PDF: o
botão chama `window.print()` e a pessoa escolhe "Salvar como PDF". Funciona em
todo aparelho e evita o sistema passar a manter paginação de contrato longo. O
bloco `@media print` do `globals.css` é quem faz isso valer — `.folha` é o que
sai no papel, `.sem-impressao` é o que some, `.folha-texto` perde a rolagem
(senão o papel sairia cortado no mesmo ponto da tela) e `.folha-evidencias` não
se parte entre páginas.

> **Links assinados antes da 0016 continuam revogados.** A migração muda o
> comportamento daqui para frente; ela não ressuscita o que já foi fechado.

O passo da assinatura fica **isolado atrás de uma interface**: trocar para
Autentique, ZapSign ou Clicksign é implementar um conector, não redesenhar o
módulo. Por isso `documento_assinaturas` já nasce com `provedor`,
`referencia_externa` e `url_comprovante`, vazios enquanto for interna.

#### Anamnese (migração 0017)

Decidido em 15/09/2026: a anamnese **não tem passo de confirmação** e as
respostas podem ser corrigidas a qualquer momento. Não é exceção — é o que
este documento sempre disse: contrato e termo, depois de assinados, não mudam;
anamnese e ficha clínica são conteúdo que evolui.

**A pergunta congela, a resposta vive.** É o que permite as duas coisas
conviverem sem afrouxar nada:

| Onde | O quê |
|---|---|
| `documentos.corpo_congelado` | O enunciado. O gatilho da 0013 continua recusando UPDATE nele |
| `documento_campos.rotulo` | A pergunta, copiada do modelo na emissão. Também congelada |
| `documento_campos.resposta` | O que evolui. Livre |

Apontar para o modelo em vez de copiar a pergunta faria a correção de março
reescrever o que foi perguntado em janeiro — e a resposta passaria a responder
outra coisa.

O rastro de quem mudou o quê não se perde: `documento_campos` entra na
auditoria. "Ela declarou que não tinha alergia" continua tendo data, autor e
valor anterior — na trilha, que é onde isso mora, não numa trava.

**Sete tipos de campo:** `texto`, `texto_longo`, `sim_nao`, `escolha_unica`,
`escolha_multipla`, `data`, `numero`. As perguntas moram em
`modelo_documento_versoes.campos` (jsonb) porque **versionam junto com o
texto** — uma versão do modelo é um enunciado e um conjunto de perguntas, e
separá-los permitiria as duas coisas divergirem.

Cada tipo é conferido nas duas portas: `private.campos_validos` valida a forma
das perguntas na criação do modelo, e o CHECK `documento_campos_resposta`
valida cada resposta — inclusive se a alternativa marcada existe, com o
operador `?` do jsonb.

**Anamnese não passa a `assinado`.** Fica em `emitido` para sempre, e
"respondida" é **derivada** da contagem de obrigatórias com resposta — estado
gravado envelhece, como "vencida" na §8.4. Na tela o rótulo de `emitido` vira
"Em preenchimento", por `rotuloDaSituacao`.

`documento_assinar_por_link` recusa anamnese explicitamente, mesmo a tela nunca
oferecendo: defesa em profundidade.

**Uma quarta função pública.** `documento_responder_por_link` é a paciente
respondendo de casa, e continua valendo a regra: função, nunca tabela.
`documento_campos` tem `revoke all ... from anon` como todas as outras.

**Como as perguntas entram (migração 0018).** `documento_campos` não tem
política de INSERT, de propósito: pergunta não se acrescenta à mão num documento
emitido. Mas a 0017 fazia `documento_emitir` — que é `security invoker` — inserir
direto, e a RLS de quem clicou recusava a própria emissão (42501, "seu perfil não
tem permissão"). Nem a administradora emitia anamnese. Contratos sem pergunta
não quebravam porque INSERT de zero linhas não aciona política.

A porta agora é `private.documento_campos_criar`, `security definer`, a única
forma de uma pergunta entrar na tabela. Ela não recebe perguntas por parâmetro —
lê da versão do modelo que o próprio documento aponta — e só age se o documento
ainda não tem nenhuma. `documento_emitir` continua invoker: dar privilégio de dono
à emissão inteira para resolver uma inserção seria emprestar poder a tudo o que
ela faz.

> **A lição para a próxima migração:** função `security invoker` que escreve em
> tabela sem política correspondente falha para todo mundo. "Sem política de
> INSERT" e "só a função insere" só convivem se a função for definer — ou se
> delegar a uma que seja.

**Os grants restringem desde a 0019.** Antes, o padrão do projeto concedia todos
os privilégios de tabela a `authenticated` (TRUNCATE inclusive) e um `grant`
numa migração só repetia. Agora cada tabela declara o que `authenticated` faz, e
UPDATE é por coluna onde o resto da linha é congelado: em `documentos`, só
`situacao` e `motivo_cancelamento`; em `documento_campos`, só as colunas de
resposta; em `prontuarios`, só atendimento, data e título; em
`documento_links`, só `canal_envio`.

**O que a 0022 fechou.** Antes dela, as políticas de INSERT e UPDATE deixavam
qualquer perfil ativo, pela API, inventar um documento "assinado" com o texto
que quisesse (o gatilho calculava o hash do texto inventado), trocar a paciente
de um contrato assinado, ressuscitar um cancelado e gravar evidência de
assinatura com canal e data falsos. Agora: o documento só nasce do texto exato
da versão do modelo; só muda de situação a partir de `emitido` (para
`assinado` com assinatura registrada, para `substituido` com o documento que o
corrige, para `cancelado` com motivo); a evidência da assinatura tem hash, hora,
canal e operador escritos pelo banco; e a assinatura registrada fecha o
documento na mesma transação.

Duas funções de escrita em vez de uma porque os guardas são diferentes: a da
consulta é `security invoker` e exige sessão de administradora; a do link é
`security definer` e exige token mais data de nascimento. Dar poder de definer
a quem já tem sessão seria emprestar privilégio sem precisar.

#### O que ainda não existe

**PDF montado pelo sistema.** A via sai pela impressão do navegador.

**Reordenação e exclusão de modelo.** Modelo se aposenta (`ativo = false`),
nunca se apaga: ele explica os documentos que gerou. Nenhuma das seis tabelas
tem política de DELETE, e `documento_campos` também não tem de INSERT — as
perguntas nascem na emissão, a partir do modelo.

---

### 8.8 Relacionamento

Rota `/relacionamento`, com abas para fila de acompanhamento, confirmações,
retornos, aniversários, avaliações e tarefas. Usa as tabelas existentes
`atendimentos`, `retornos` e `pendencias`; não exige migração nova.

- Confirmações mostram os próximos 15 dias ainda em `agendado` ou
  `aguardando_confirmacao`. Alterar a situação usa o gatilho já existente da
  agenda, que registra autor e data.
- Retornos têm data informada pela equipe. O sistema **não** calcula período
  clínico nem recomenda quando chamar a paciente. A equipe registra a situação
  e pode reabrir o acompanhamento.
- Tarefas de contato usam `pendencias`. A pessoa pode criar, concluir, cancelar
  e reabrir; toda escrita valida a sessão e os dados na ação de servidor.
- Aniversários vêm da data de nascimento do cadastro, no mês escolhido.
- A avaliação solicitada nesta etapa é no **Google**, pelo link direto
  fornecido pela clínica (`https://g.page/r/CYXDzsOMXUv5ECE/review`). A tela
  mostra pacientes com atendimento concluído e permite buscar qualquer paciente
  ativa,
  prepara texto e abre WhatsApp Web ou copia a mensagem. **O envio é manual**:
  abrir o WhatsApp não prova que a mensagem foi enviada. Depois do envio, a
  equipe marca o convite, registrado como `pendencia` concluída de tipo
  `pesquisa`, com paciente, responsável e hora. A mesma convenção registra
  mensagens de aniversário com tipo `outro`. A ação evita novo registro do
  mesmo tipo para a mesma paciente no mesmo dia da clínica. O sistema não lê a nota nem
  confirma se a paciente avaliou no Google.

As pendências existentes têm RLS `for all` e permitem DELETE no banco (ver §1).
O histórico operacional desses convites, por usar `pendencias`, **não é
imutável**. Se for exigida uma trilha inviolável de contatos, isso precisará de
uma migração e tabela próprias.

## 9. Invariantes — o que nunca pode ser quebrado

Checklist rápido antes de abrir um PR. Se sua mudança viola algum item, ou está
errada, ou precisa de uma conversa com a clínica antes.

**Segurança e dados**

- [ ] RLS ligada em toda tabela nova, com política associada
- [ ] `anon` revogado nas tabelas novas
- [ ] Nenhuma função nova ficou executável por `anon` — as quatro do link público (0014 e 0017) são a **única** exceção, e foram decididas com o dono do projeto
- [ ] Tabela nova declarou seus grants (o default não concede nada) e não ganhou DELETE sem decisão explícita
- [ ] Migração nova passou por `npx supabase db reset` e `npm run test:banco` no banco local
- [ ] `service_role` não aparece em lugar nenhum da aplicação
- [ ] Função auxiliar de política criada em `private`, não em `public`
- [ ] `getUser()`, nunca `getSession()`
- [ ] Migração já aplicada não foi editada — correção virou arquivo novo
- [ ] Toda tabela com dado de paciente entrou na auditoria
- [ ] Erro de banco virou mensagem em português por `mensagemDoBanco` (§6, regra 11) — nenhuma ação interpola `error.message`
- [ ] Toda consulta lê o `error`; toda escrita confere que alcançou uma linha

**Arquitetura**

- [ ] Nenhum componente conversa com o banco direto
- [ ] Consulta é `server-only`; ação é `"use server"`
- [ ] Toda escrita valida no servidor, com a mesma função que o formulário usa
- [ ] Permissão verificada nas três camadas (interface, ação, banco)
- [ ] `revalidatePath` depois de escrever, inclusive `/`
- [ ] Estado de tela (busca, filtro, página, dia, mês) foi para a URL
- [ ] `tipos-banco.ts` regenerado se o banco mudou, e não editado à mão
- [ ] Regra nova ou bug corrigido ganhou teste; `npm test` passa
- [ ] Tela nova tem `<h1>`, não rola na horizontal em 360 px e entrou em `e2e/telas.spec.ts`

**Dinheiro**

- [ ] Cálculo em centavos inteiros, um arredondamento por operação
- [ ] Taxa descontada do líquido, nunca somada à paciente, nunca lançada como despesa
- [ ] Cópia congelada da taxa preservada na venda
- [ ] Tabela financeira nova sem política de DELETE (as antigas têm — ver §8.4)
- [ ] Alteração pós-confirmação gerou ajuste, sem tocar o original
- [ ] Toda alteração de forma/taxa tem motivo e entrou no histórico

**Tempo e apresentação**

- [ ] Todo cálculo de dia passou por `lib/dates.ts`
- [ ] Nenhuma cor escrita fora de `globals.css`
- [ ] Estado comunicado por texto + ícone + forma, não só por cor
- [ ] Contraste ≥ 4.5:1 em texto
- [ ] Botão sem função está visivelmente indisponível, com a razão à vista
- [ ] Tudo em português

---

## 10. Decisões em aberto — pergunte, não invente

Estas dependem da clínica. **Não implemente por conta própria; não invente um
padrão para destravar.**

1. **Regra de lucro.** O que entra na conta: bruto, custo de produto, comissão,
   impostos, taxa de cartão? Por isso o indicador não existe.
2. **Períodos de retorno por procedimento.** Os intervalos atuais são
   demonstrativos, **não são recomendação clínica**. A equipe precisa definir os
   reais.
3. **Definição de "atendimento do dia".** Hoje desconsidera cancelados e conta o
   restante. Falta confirmar.
4. **Canal de contato preferencial** para confirmação, retorno e aniversário.
5. **Horário de funcionamento.** Definido, a Linha do Dia pode mostrar o
   expediente inteiro, com as pontas vazias.
6. **Situações do atendimento.** As sete cobrem a rotina? Falta "remarcado"?

Já decididas e **fechadas** — não reabra sem motivo novo: divisão de permissões
(três perfis), método de assinatura (interna, atrás de interface), fuso
(São Paulo, sempre), vermelho para despesa (convenção contábil).

---

## 11. Fora de escopo hoje

Não implemente sem pedido explícito: integração com Google Calendar · integração
com WhatsApp · envio de e-mails · emissão de nota fiscal · processamento de
pagamentos · automações · inteligência artificial · **qualquer
recomendação clínica automática** (decisão de escopo — o sistema não sugere
conduta).

Também ainda provisórios na interface: ícone de notificações (mostra contagem, não abre nada) ·
menu de perfil (opções desabilitadas com a razão no `title`) · botões "Resolver"
das pendências (navegam para o módulo).

---

## 12. Convenções de trabalho

### Estilo de código

- Português em tudo (seção 7.5).
- **Comentário explica o porquê, não o quê.** O código já diz o que faz. O
  comentário existe para registrar a decisão: por que Latin-1 vem depois de
  UTF-8, por que a função é `SECURITY INVOKER`, por que a comparação de choque
  acontece na aplicação. Esse é o padrão do repositório inteiro — mantenha.
- Funções pequenas, nomeadas pelo que significam no domínio.
- TypeScript estrito. Nada de `any` para escapar de um tipo incômodo.
- Erro tratado com mensagem útil, nunca engolido em silêncio.

### Commits

Mensagens em **português**, no estilo do repositório: título curto e concreto
(sem prefixo tipo `feat:`), corpo explicando **a decisão e o porquê**, em
parágrafos. Veja `git log` — é o melhor guia.

```
Filtros nas listas do Financeiro, guardados na URL

Vendas: situação do recebimento, forma de pagamento e busca por
paciente ou procedimento. Tudo na URL, como a busca de pacientes e o
mês: recarregar, voltar e mandar o link de uma visão filtrada
funcionam.

O filtro acontece depois da consulta, no servidor: o volume é mensal,
dezenas de linhas.
```

Commits do trabalho assistido levam o trailer `Co-Authored-By:` do agente.

**Só comite ou dê push quando o usuário pedir.** A `main` é a branch de
produção: trabalho em andamento vai em branch própria, e nada entra na `main`
sem combinar.

### Ao mexer no banco

1. Escreva a migração nova (`00NN_nome_descritivo.sql`), com cabeçalho
   comentado explicando o **porquê** — é o padrão dos nove arquivos existentes.
2. `npm run db:push`
3. `npm run db:tipos`
4. `npm run typecheck`
5. Atualize [`supabase/README.md`](supabase/README.md) (tabela de migrações) e
   este arquivo, se a regra mudou.

### Ao terminar um módulo

Atualize [`docs/overview-sistema.md`](docs/overview-sistema.md) com o que passou
a existir, o que saiu da lista de provisório e as decisões tomadas. É o documento
de produto — a memória de por que o sistema é como é.

---

## 13. Erros conhecidos e dívidas — não imite, não "conserte" em silêncio

Levantado por auditoria do código contra este documento em **28/08/2026** e
refeito, contra o schema efetivo e o código, em **22/09/2026**. O que foi
corrigido nesta segunda rodada fica registrado abaixo para ninguém tomar o
comportamento antigo por padrão.

### Resolvidos em 22/09/2026

| Era | Como ficou |
|---|---|
| `alterarTaxaManual` gravava taxa em venda de PIX/dinheiro | Recusado na ação e no banco (gatilho `vendas_confere_taxa`, 0020) |
| Ações `Promise<void>` descartavam o erro (reativar taxa, situação, arquivar…) | Devolvem `ResultadoAcao`; a recusa aparece ao lado do botão (§6, regra 9) |
| `instanteNaClinica` aceitava 31/02 como 03/03 | Toda data de formulário passa por `dataValida()` (§7.2) |
| 10 ações interpolavam `error.message` | Nenhuma; tudo por `lib/erros-banco.ts` |
| `SITUACOES_VALIDAS` era array solto | Derivada de `PROXIMAS_SITUACOES` (`Record`) |
| Faixa de exemplo montada por página | No layout; página nova já nasce com ela |
| `perfis_atualiza_proprio_nome` deixava mexer em `ativo` | Gatilho `perfil_proprio_so_nome` (0019) |
| `recebimentos`, `despesas`, `taxas_cartao` com DELETE; `despesas` sem auditoria | Sem DELETE em tabela nenhuma (exceto fotos, pela LGPD); auditoria completa (0019) |
| Confirmar recebimento só na ação | Também na RLS (0019) |
| Choque de horário só na ação, com corrida | Gatilho com trava por profissional (0021) |
| Documento, assinatura e pergunta de anamnese falsificáveis pela API | Fechado na 0022 (§8.7) |
| Tabelas da 0007 sem GRANT explícito | Grants declarados (0019) |
| `lerValorEmReais("1.2.3")` virava 123; `"150,555"` virava 150,56 | Gramática estrita em `lerCentavos` |
| Consultas que não liam `error` (perfil do usuário, CPFs da importação, URLs das fotos…) | Falham alto; perfil com o banco fora do ar não manda mais para `/sem-acesso` |
| Campo com erro nunca ficava com a borda vermelha; navegação de dias da Agenda empilhada | `classeDeEntrada()`; `ENTRADA_ERRO` com `!` (§6, regra 8) |
| Código morto `podeAlterarTaxa`, `podeOperarFinanceiro`, `podeConfigurarTaxas`, `Botao` | Removido |

`decidirEfeito` (`lib/venda.ts`) continua existindo sem ser chamado pela
aplicação: é a mesma regra da função SQL `venda_alterar_pagamento`, escrita em
TypeScript, e os testes a usam como especificação. Alterá-la não muda o que o
banco faz.

### Dívidas conhecidas

- **`npm run dados:limpar` não cobre `vendas` nem `ajustes_financeiros`.** Semear
  venda quebra a limpeza por FK, e a ordem dos DELETEs é carregada.
- **`despesas.competencia` é `not null` sem default**, preenchida por uma regra
  que a aplicação adotou (o mês do vencimento, `competenciaDoVencimento` em
  `acoes/despesas.ts`). Não há acordo da clínica sobre ela.
- **Ajuste financeiro entra no período pela data da correção (`criado_em`)**, não
  pela data do recebimento corrigido. Corrigir em setembro uma venda de agosto
  move dinheiro para setembro. É decisão de regra contábil — pergunte.
- **Venda sem recebimento pela API.** A recepção ainda pode inserir uma linha em
  `vendas` direto pela API, sem passar por `venda_registrar`; o gatilho da 0020
  garante a taxa, mas a venda fica sem recebimento. Fechar exigiria tirar o
  INSERT de `vendas` da recepção e dar à função a porta própria, como o
  recebimento.
- **A exclusão direta de foto pela API (administradora) exige o motivo** desde a
  0022, mas não apaga o arquivo do bucket — isso continua sendo papel de
  `eliminarImagem`, que remove o arquivo antes.
- **`npm audit` ainda aponta o Next 15.** Os dois alertas críticos de execução
  remota foram fechados subindo para 15.5.26 (22/09/2026). Sobram um alerta
  moderado do próprio `next` e o `postcss` 8.4.31 que o Next fixa por dentro
  (usado só no build, sobre o nosso CSS). Os dois só fecham no Next 16, que é
  versão maior: planeje a migração, não rode `npm audit fix --force`.

### Sobre os indicadores: estoque vs fluxo

`aReceber` e `aReceberVencido` são **estoque** — somam tudo em aberto de qualquer
período, não só do mês na URL, e vêm de `valor_liquido` (já sem a taxa). Os
demais são **fluxo do mês**. Misturar os dois numa conta produz número sem
significado.
