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
| [`README.md`](README.md) | A vitrine no GitHub: módulos, arquitetura, segurança, como rodar e testar. Resume — as regras valem daqui |
| [`docs/prompt-onboarding-codex.md`](docs/prompt-onboarding-codex.md) | Primeira mensagem para um agente de IA novo: ler, provar que entendeu, relatar divergências |

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
`prontuario_imagens`, pela LGPD (§8.5). (Vale no banco local e nos testes; em
produção a 0019 ainda não foi aplicada — ver o aviso na §4.)

Hoje o sistema roda com **dados de demonstração** marcados no banco pela coluna
`exemplo`. Enquanto existir **paciente** marcada assim (`temDadosDeExemplo()`,
em `server/consultas/exemplo.ts`), o layout exibe uma faixa permanente de aviso
— e também quando essa checagem falha, por segurança. `npm run dados:limpar`
apaga só o que foi semeado e o aviso some sozinho. A semeadura se protege do
outro lado: `dados-exemplo.sql` levanta exceção e não carrega nada se já houver
paciente, atendimento ou recebimento sem a marca, para não misturar
demonstração com cadastro real.

### Estado atual (setembro de 2026)

| Módulo | Rota | Situação |
|---|---|---|
| Visão Geral | `/` | **Pronto** — lê do banco |
| Pacientes | `/pacientes` | **Pronto** — cadastro, busca, ficha, edição, arquivamento, importação CSV |
| Agenda | `/agenda` | **Pronto** — marcar, remarcar, situações, trilha |
| Financeiro | `/financeiro` | **Pronto** — vendas, recebimentos, despesas, taxas, movimentações, fluxo |
| Configurações | `/configuracoes` | **Parcial** — tabela de procedimentos e conferência das fotos (administradora) |
| Prontuários | `/prontuarios` | **Pronto** — registro clínico versionado, restrito à administradora |
| Documentos e Contratos | `/formularios` | **Pronto** — modelos versionados, emissão com texto congelado, assinatura no balcão e por link, anamnese |
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
permissão, `npm run test:banco` também; mexeu em tela ou fluxo,
`npm run test:e2e`. Veja logo abaixo por que `npm run build`
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
> | `npm run test:e2e` | Fluxos inteiros no navegador — login e redirecionamento seguro, permissões na interface e **por URL** para recepção e financeiro, paciente, agenda, venda (recepção registra, financeiro confirma), despesa, prontuário, **fotos de evolução**, **importação CSV**, **Relacionamento**, **procedimentos**, **busca**, página 404, documento e assinatura por link, CSP — e 41 endereços (36 do sistema, com a sessão da administradora e a 404 logada, e 5 públicos) em 320, 768 e 1440 px, sem rolagem horizontal nem erro de console, e sem violação WCAG 2.2 A/AA (axe) em 360 e 1440 px. Ficam fora as telas de detalhe e de edição por `[id]` (exceto a ficha e a edição da paciente) e `/sem-acesso` | `e2e/` |
>
> Os dois últimos precisam do Supabase local no ar (abaixo) com as contas de
> teste. O E2E exige o `.env.local` e recusa rodar se ele não apontar para
> `127.0.0.1` ou `localhost`.
> Regra nova ou bug corrigido ganha teste junto.
>
> **Vitest.** `npm test` e `npm run test:unit` são o mesmo `vitest run`;
> `npm run test:watch` fica observando. `*.test.tsx` roda em jsdom, o resto em
> Node, com `TZ=UTC` de propósito (como na Vercel), `server-only` trocado por um
> módulo vazio e `restoreMocks` ligado. No Supabase falso, alvo sem resposta
> devolve `{ data: null, error: null }` — o que a RLS devolve quando esconde a
> linha — e a última resposta da fila se repete. Em `acoes.test.ts`, o
> `redirect` lança `Redirecionou`: espere a exceção.
>
> **`test:banco` não usa o CLI do Supabase** (o `db query` não aceita vários
> comandos num arquivo). `scripts/testes-banco.mjs` manda o arquivo ao `psql`
> de dentro do contêiner local (`supabase_db_<project_id>`, com
> `ON_ERROR_STOP`), mostra só a tabela final e sai com código diferente de zero
> se alguma asserção falhar. Um erro fora das asserções — um passo de
> preparação, uma conta de teste que não existe — para tudo antes da tabela, e
> aparece só a mensagem do `psql`.
>
> **Números (conferidos em 23/09/2026, não copie sem recontar).** Vitest: **800
> testes em 76 arquivos**, todos verdes — 13 em `src/lib/`, 11 de ações em
> `src/server/acoes/`, 9 de consultas em `src/server/consultas/`, 5 em
> `src/app/` (login, destino do login, recuperação de senha, sem acesso e a
> página do documento), 32 de componente (`src/components/`), 2 do middleware
> (`src/middleware.test.ts` e `src/lib/supabase/`) e 4 em `testes/`
> (`cabecalhos-seguranca`, `desempenho`, `react-ping` e `versao-postgrest`).
> `test:banco`: **194 asserções**, todas verdes numa execução completa a partir
> de `db reset` (migrações 0001–0028 + seed) em 23/09/2026. E2E: **298 testes em 8 arquivos**
> (contados com `--list` em 23/09/2026) — `chromium` 251 (43 de fluxo + 126 de
> telas: 41 endereços — 36 do sistema, com a 404 logada, e 5 públicos — × 3
> larguras, mais 3 da faixa de áreas no celular + 82 do axe: os mesmos 41
> endereços × 2 larguras), `webkit` 43 e `webkit-celular` 4. Para recontar: `npx vitest run`,
> `npx playwright test --list [--project=...]`; banco: conte as chamadas
> `select testes.falha|igual|linhas|registrar(` em `permissoes.sql`.
>
> **Três projetos do Playwright.** `chromium` roda tudo; `webkit` (Safari de
> desktop) roda os fluxos funcionais, sem o `telas.spec.ts`; `webkit-celular`
> (iPhone 13) roda só `assinatura.spec.ts` — a paciente abre o link no celular.
> `acessibilidade.spec.ts` (axe-core, WCAG 2.0/2.1/2.2 A e AA, em 360 e
> 1440 px, nas mesmas rotas do `telas.spec.ts`, listadas em `e2e/apoio.ts`)
> também roda só no `chromium`: audita DOM e CSS, que são os mesmos nos dois
> motores. Qualquer violação reprova; exclusão só com o motivo escrito no
> próprio spec.
> Um projeto só: `npx playwright test --project=webkit`. O motor do WebKit se
> instala uma vez com `npx playwright install webkit`. Firefox está fora da
> matriz por custo; entra se alguém da clínica usar.
>
> **E2E.** O `globalSetup` (`e2e/preparar.ts`) entra com as três contas e
> grava as sessões em `e2e/.auth/`. O Playwright sobe o `npm run dev`, mas
> **reaproveita qualquer servidor que já esteja na porta 3000** — confira o que
> está no ar. Um teste por vez, sem nova tentativa; trace e captura de falha
> só quando o teste falha; fixtures (CSV e foto) em `e2e/fixtures/`; capturas em
> `e2e/capturas/`, relatório em `e2e/relatorio/`. `e2e/recorte.mjs` recorta uma
> seção de uma tela para revisão visual.
>
> **Os testes dependem do seed.** O E2E e o `test:banco` usam nomes, ids e
> contagens de `supabase/dados-exemplo.sql` (Aline Bastos, Beatriz Nogueira,
> Dra. Marina Rocha, Toxina botulínica, as 7 despesas de exemplo): mude os dois
> juntos. O seed põe o aniversário de Beatriz no dia 11 do mês em que o
> `db reset` rodou; o fluxo de assinatura por link lê a data de nascimento na
> tela de edição da ficha, então não depende mais do mês. Os fluxos criam
> dados com sufixo a cada execução (pacientes, procedimentos, tarefas): o banco
> local cresce até o próximo `db reset`.
>
> **O que ainda não tem teste.** 44 das 47 funções exportadas por
> `src/server/acoes/` são chamadas por um teste de unidade. Sem teste direto:
> `salvarNovaVersaoModelo`, `alternarModeloAtivo` (`documentos.ts`) e
> `alternarArquivamentoImagem` (`prontuario-imagens.ts`). Seis arquivos de
> ação têm o teste num arquivo de outro nome (`despesas.ts` e
> `taxas-cartao.ts` em `despesas-e-taxas.test.ts`; `vendas.ts` em
> `acoes-financeiro.test.ts` e `acoes.test.ts`; `prontuarios.ts`,
> `documentos.ts` e `assinatura-link.ts` em `clinico.test.ts`). No E2E faltam recuperação de senha (via Mailpit), configurações,
> edição de despesa e de taxa e retorno do Relacionamento.
>
> **Gates finais de 23/09/2026 (resultado, não meta).** Numa cópia limpa em
> `D:` (`git ls-files -co --exclude-standard` + `.env.local`, `npm ci` do zero
> com o `postinstall` aplicando as 8 trocas do ping): `lint` 0 erros e 0
> avisos · `typecheck` 0 erros · Vitest 800/800 em 76 arquivos · `build` sem
> aviso (compartilhado 103 kB) · `npm audit` e `npm audit --omit=dev` com 0
> vulnerabilidades · Playwright `chromium` de `seguranca`, `fluxos` e `telas`
> **contra `next start`**: 142/142, sem nova tentativa (inclui o teste de CSP
> de foto, documento e agenda, que antes falhava no build — §13). No banco
> local: `db reset` 0001–0028 + seed, `test:banco` 194/194, auditoria de RLS
> sem violação. E2E completo contra o `next dev` compartilhado: 280 de 298 na
> primeira passada; as 18 restantes passaram repetidas — todas por lentidão
> do dev (botão preso em "Salvando…" com o POST pendente, login do WebKit sem
> redirecionar a tempo), nenhuma com mensagem de erro de negócio. Com o dev em
> uso por outra sessão, meça o E2E completo contra `next start` de uma cópia.

> ### CI (`.github/workflows/ci.yml`)
>
> Roda em todo pull request, em push para `jamal-do-mal` e à mão
> (`workflow_dispatch`). Quatro jobs, **todos contra o Supabase local dentro do
> runner** — nenhum banco real, nenhum `--linked`, nenhum segredo da clínica; o
> token do GitHub só lê:
>
> | Job (nome do check) | O que faz |
> |---|---|
> | `Qualidade (lint, tipos, unitários)` | `lint`, `typecheck`, Vitest |
> | `Banco (migrações, seed, permissões)` | `supabase start` (todas as migrações + seed), contas locais, `test:banco` |
> | `E2E (Chromium e WebKit)` | mesmo banco local, **build de produção** e Playwright nos três projetos; relatório como artefato só em falha |
> | `Build de produção` | `next build` com variáveis de mentira (o build não consulta banco) |
>
> Na CI o E2E roda sobre `npm run start` (build), não sobre o dev: o dev
> compila cada rota na primeira visita e isso estourava o prazo das asserções.
> **A CI ainda não rodou de verdade** (nada foi enviado ao GitHub nesta
> rodada). Na primeira execução confira: o `supabase start -x` com a lista de
> serviços, o nome das chaves em `supabase status -o json`
> (`ANON_KEY`/`PUBLISHABLE_KEY`) e o `install-deps` do WebKit no
> `ubuntu-latest`.
>
> **O trabalho entra direto no `jamal-do-mal`, sem outros branches** (decisão
> do dono em 23/09/2026). Consequência: a CI roda em cada push e **avisa**, mas
> não **impede** a entrada — checagem obrigatória antes de entrar só existe via
> pull request, que exige branch. Por isso os gates da §2 continuam sendo
> rodados antes do commit. **Proteção aplicada no GitHub em 23/09/2026:** o
> `jamal-do-mal` recusa force push e exclusão, **inclusive para
> administradores**; o push direto continua liberado (é o fluxo decidido).
> Não tente contornar nem mudar essa regra — é configuração do dono. Se um dia o dono
> quiser que a CI bloqueie, o caminho é branch curta + pull request exigindo
> os quatro checks acima — mudança de processo, só com ele.

> ### Desempenho — orçamento e medição (`scripts/desempenho.mjs`)
>
> ```bash
> node scripts/desempenho.mjs orcamento <build.log>   # First Load JS da saída do next build
> node scripts/desempenho.mjs carga [--base http://localhost:3100] [--sessao e2e/.auth/administradora.json] [--n 200] [--c 10] [--rota /x]
> ```
>
> Rode sempre contra `next start` de uma **cópia** do repositório, nunca
> contra `next dev` (e nunca com o dev no ar na mesma pasta, ver acima). No
> Git Bash, `MSYS_NO_PATHCONV=1` para `--rota /`. A carga usa a sessão de
> `e2e/.auth/administradora.json` (vale 1 h), renova no aquecimento e para
> com mensagem clara se ela venceu de vez.
>
> **Orçamento (reprova acima):** First Load JS compartilhado 110 kB; rota
> 130 kB, com duas exceções — `/prontuarios/[id]` 195 kB e `/redefinir-senha`
> 190 kB (cliente do Supabase no navegador); TTFB p95 150 ms nas telas
> públicas e 1.500 ms nas internas, com 200 requisições e 10 simultâneas.
>
> **Medido em 23/09/2026** (Next 15.5.26, cópia com o estado em andamento,
> Supabase local no Docker do Windows): compartilhado 102–103 kB; 46 das 49
> rotas entre 103 e 121 kB (maior: `/formularios/[id]`); `/prontuarios/[id]`
> 185 kB, `/redefinir-senha` 179 kB, `/recuperar-senha` 109 kB (era 178, com o
> cliente do Supabase agora carregado só no envio); middleware 94,9 kB. Carga
> com 10 simultâneas (TTFB p50/p95): `/entrar` 13/44 ms (173 req/s);
> `/assinar/<token inexistente>` 43/51 ms; `/` 800/1168 ms (11 req/s);
> `/agenda` 678/886 ms; `/pacientes` 673/1146 ms; `/financeiro` 786/1141 ms.
> Uma por vez, as telas internas ficam em 106–136 ms de p50. O gargalo é o
> `getUser()` do Auth local (p50 340 ms com 10 simultâneas, 27 req/s),
> chamado duas vezes por tela interna — middleware e `usuarioAtual`; o
> PostgREST responde em 7 ms. Cortar a segunda ida é decisão de segurança
> (§10). Lighthouse mobile em `/entrar`: acessibilidade 100, boas práticas
> 100, CLS 0; SEO 54 de propósito (`noindex`). Os tetos das telas internas
> refletem o Auth local: o de produção ainda não foi medido nem decidido.

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
> `local:usuarios` (`scripts/usuarios-locais.mjs`) é o único código do
> repositório que usa uma chave `service_role`: a de demonstração do Supabase
> local, lida de `supabase status` e igual em toda instalação, só para criar as
> contas pela API de administração do Auth. O script para antes de qualquer
> requisição se a URL não for `127.0.0.1` ou `localhost`. Não é a aplicação,
> então não fere a regra da §3 — e não é modelo para produção.
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
| Repositório | **GitHub** | `https://github.com/felipemenezes25000-spec/cockpit-repo`. Um único branch, `jamal-do-mal`; o trabalho entra direto nele, sem criar outros (decisão do dono, 23/09/2026) |
| Banco e autenticação | **Supabase** | Ref `pghmzbtfsaupwezglddo` (produção desde 23/09/2026, no lugar do `Cockpit-Consultorio2`/`khoaluytzzagtwmpaukx`); região precisa ser **`sa-east-1` (São Paulo)** — a conferir no painel. MCP do Supabase configurado em `.mcp.json` |

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
ORIGEM_PUBLICA=                 # só servidor: origem do link de assinatura
```

`ORIGEM_PUBLICA` fixa a origem (`https://dominio`, sem caminho, sem barra no
fim; http só em localhost) do endereço público que vai para a paciente
(`/assinar/<token>`). O comportamento, em `origemPublica()` (`lib/documento.ts`):

- **Preenchida e válida:** é a origem do link, sempre.
- **Preenchida com valor inválido:** **a geração do link é recusada** e o motivo
  vai para o log ("assinatura: origem pública") — não cai no cabeçalho, porque
  quem configurou quis fixar a origem.
- **Vazia fora de produção** (`next dev`): a origem sai do cabeçalho `Host`,
  conferido na forma.
- **Vazia em produção** (`NODE_ENV=production`): **o link é recusado** ("O
  endereço público do sistema não está configurado corretamente"), a não ser
  que o `Host` seja o próprio computador (`localhost`/`127.0.0.1`, o build
  testado no CI). Atrás de um proxy ou num domínio de preview, o `Host` daria
  a origem errada sem sinal, e um `Host` forjado mandaria a data de nascimento
  da paciente para outro domínio.

**`ORIGEM_PUBLICA` é pré-requisito do deploy:** confira que ela existe na
Vercel (Production) antes de subir o código; sem ela, a assinatura à
distância fica fora do ar (só o link público depende dela).

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

### Registro de falhas (log) e log drain

Toda falha técnica sai por `registrarFalha` (`src/lib/registro.ts`, §6 regra
11) como **uma linha JSON** em `console.error` — na Vercel, o stderr da função,
que aparece em Logs e é o que um log drain encaminha. É o único `console.*` do
código da aplicação (um teste garante). Formato fixo, nesta ordem:

```json
{"instante":"2026-09-23T13:05:00.000Z","nivel":"erro","app":"cockpit","ambiente":"production","contexto":"agenda: ler atendimento","codigo":"57014","mensagem":"canceling statement due to statement timeout","id":"3f9c2a7b1e04"}
```

- `instante` em UTC (ISO 8601); `ambiente` é `VERCEL_ENV` ou, fora da Vercel,
  `NODE_ENV`; `app` é sempre `cockpit`, para separar do ruído do Next.
- `contexto` é nosso ("módulo: operação", com ids e caminhos); `mensagem` já
  vem sanitizada (sem e-mail, token, CPF, telefone, data, `details` nem valor
  digitado); `codigo` é o SQLSTATE/código do PostgREST ou `""`.
- `id` é o id de correlação que a ação pode anexar à frase da tela: é por ele
  que se acha a linha a partir do relato da clínica.
- Recusa de regra (`P0001`) não gera linha.

Nunca vão para o log: `details` do Postgres, valores entre aspas, valor
digitado, conteúdo clínico, e-mail, CPF, JWT/Bearer, segredo longo — e, na
mensagem, data solta e telefone. O uuid do caminho de foto fica no contexto de
propósito: é com ele que se acha o arquivo órfão. Os scripts de CLI
(`scripts/*.mjs`) ficam fora da regra do `console.*`.

**Achar uma falha sem drain:** no painel da Vercel, *Logs*, busque
`"app":"cockpit"` e, dentro disso, o `codigo` ou o `id` que a clínica relatou.

**Configurar o log drain (passo do dono do projeto, uma vez; exige plano Pro ou
superior).** Os Logs da Vercel guardam pouco tempo; para reter e alertar:

1. Vercel Dashboard → time → *Settings* → *Drains* (ou *Log Drains*) → *Add Drain*.
2. Escolha a integração do coletor (Datadog, Better Stack, Axiom…) ou *Custom
   endpoint* com a URL HTTPS do coletor.
3. Fontes: *Functions* (Serverless/Edge); *Static* e *Build* são opcionais.
4. Ambiente: *Production* (*Preview* é opcional).
5. Formato: NDJSON ou JSON. A mensagem de cada entrada é a nossa linha JSON:
   configure no coletor o parse de JSON do campo `message`, para indexar
   `nivel`, `codigo`, `contexto` e `id`; filtre por `app = "cockpit"` e alerte
   em `nivel = "erro"`.
6. Endpoint próprio: valide o cabeçalho `x-vercel-signature` com o segredo do drain.
7. Token ou segredo do coletor vai para o cofre, **nunca** para o repositório.

Qual coletor usar, por quanto tempo reter (os logs não têm dado pessoal, mas
têm id de correlação e caminho de foto — pense na LGPD) e quem recebe o alerta
são decisões do dono (§10) — nenhum agente cria drain nem conta em serviço
externo. Hoje só existe o nível `erro`: um aviso (arquivo órfão, por exemplo)
também sai como erro.

---

## 4. Banco de dados

Postgres gerenciado pelo Supabase. **Toda alteração de estrutura passa por um
arquivo de migração versionado em [`supabase/migrations/`](supabase/migrations/)
— nada é alterado direto pelo painel.**

### As migrações existentes

> **⚠️ As migrações 0019 a 0028 estão escritas e verificadas no banco local (do
> zero, com o seed e com `npm run test:banco`), mas ainda não foram aplicadas
> em produção** — ver [`supabase/README.md`](supabase/README.md#pendente-de-aplicação-em-produção).
> Até o dono do projeto aplicá-las, as garantias que este documento marca como
> "desde a 0019" e "(0020)" a "(0028)" — nenhuma tabela com DELETE,
> confirmar recebimento só pela RLS do financeiro, origem da taxa conferida pelo
> banco, choque de horário recusado pelo banco, documento à prova da API, venda
> só pela função e sempre com um recebimento, foto que não troca de arquivo,
> reconciliação das fotos, contato estruturado no Relacionamento, marca de
> exemplo fora do alcance da API, versão de modelo, autor da resposta e foto
> escritos pelo banco, venda idempotente e foto só com o arquivo no bucket — valem no banco local e nos testes, **não no
> banco da clínica**.
>
> **Banco primeiro, código depois.** O código atual **não funciona contra o
> banco anterior à 0025** (a busca de pacientes usa `pacientes.busca`; o
> Relacionamento, `pendencias.origem`). A sequência é: backup → pré-conferência
> → `db:push` (0019 → 0028) → `db:tipos` → conferência → **só então**
> merge/deploy deste código → backfill de novo. Como não se sabe se um push
> publica na Vercel (§12), desligue o deploy automático ou confirme qual branch
> ela publica **antes** de qualquer merge/push. O roteiro completo está no
> [`supabase/README.md`](supabase/README.md#pendente-de-aplicação-em-produção).
> **A 0028 torna a ordem obrigatória:** o app novo sempre manda `p_chave` para
> `venda_registrar`; contra um banco sem ela o PostgREST não acha a função
> (`PGRST202`) e o registro de venda para.
> Remova este aviso no mesmo commit em que registrar a aplicação.

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
| `0023_venda_so_pela_funcao.sql` | Venda, histórico e ajuste só nascem e mudam por `venda_registrar`/`venda_alterar_pagamento` (agora `SECURITY DEFINER`); recebimento: UPDATE só de situação, data e valor recebido; confirmação coerente (sem data futura, "recebido" só pelo líquido previsto) |
| `0024_fotos_reconciliacao_e_arestas.sql` | `prontuario_imagens_reconciliar()` (só leitura) para foto sem arquivo e arquivo sem linha; UPDATE por coluna em `prontuario_imagens`; sequências sem `anon`; índice das despesas pagas |
| `0025_contato_estruturado_e_arestas.sql` | `pendencias.origem` (`tarefa`, `contato_avaliacao`, `contato_aniversario`) no lugar do texto, com os registros antigos reconhecidos na migração, constraint de coerência e **um contato por paciente, origem e dia** (índice único); UPDATE de `pendencias` por coluna; `pacientes.busca` gerada (sem acento, extensão `unaccent`); teto de 160 no título do prontuário; `recebimento_da_venda_criar` sem `authenticated` |
| `0026_marca_de_exemplo_e_privilegios.sql` | A marca `exemplo` não se grava pela API: com sessão, gatilho `private.exemplo_so_sem_sessao()` recusa INSERT marcado e UPDATE que troque a marca nas dez tabelas que o `dados:limpar` apaga (sem sessão passa); `private.sem_acento` executável por `service_role`; sequência nova só com USAGE para `authenticated` |
| `0027_banco_escreve_a_evidencia.sql` | O banco escreve o que quem chamava dizia: versão de modelo na sequência, com perguntas válidas e autor e hora do banco (`modelo_versao_conferida`); `tipo` do modelo fora do UPDATE (grant de coluna); quem respondeu a anamnese e quando (`campo_resposta_autor`: nulo pelo link); autor, hora e data de captura não futura da foto (`imagem_registrada_conferida`); `documento_para_assinatura` devolve o canal da assinatura (`assinado_canal`); recebimento avulso sem taxa maior que o valor (CHECK) |
| `0028_venda_idempotente_e_foto_do_arquivo.sql` | Venda idempotente: `vendas.chave_envio` + índice único parcial; `venda_registrar` ganha `p_chave uuid default null` (mesmo envio do mesmo perfil devolve a venda já criada). Foto só nasce com o objeto no bucket, e tipo e tamanho vêm dos metadados do Storage (`private.imagem_nasce_do_arquivo`). IP e dispositivo da assinatura comentados como declarados |

### Tabelas

| Tabela | Papel | Quem escreve |
|---|---|---|
| `perfis` | Usuário do sistema; estende `auth.users` com nome, papel e `ativo` | Própria pessoa (só o nome — gatilho da 0019) · administradora (papel e liberação) |
| `profissionais` | Quem atende. Pode existir sem login | Administradora |
| `procedimentos` | Catálogo: nome, duração, valor padrão, retorno sugerido | Administradora |
| `pacientes` | Cadastro. Endereço em `jsonb`, CPF único quando informado. `busca` é coluna **gerada** (nome + nome social sem acento, 0025) | Todos os perfis |
| `atendimentos` | A agenda: paciente, profissional, procedimento, início, duração, situação, valor | Todos os perfis |
| `atendimento_situacoes` | Trilha de mudança de situação, gravada por **gatilho** | Só o gatilho (leitura para todos) |
| `retornos` | Quem está no período de voltar | Todos os perfis |
| `pendencias` | O que precisa de atenção, com prazo e prioridade. `origem` separa tarefa de registro de contato do Relacionamento (0025) | Todos os perfis; UPDATE por coluna, e `origem` não muda depois de gravada (0025) |
| `recebimentos` | Dinheiro a entrar / entrado. `valor_liquido` é coluna **gerada** (`valor − taxa_valor`) | Recebimento de venda nasce só com a venda (`venda_registrar` → `private.recebimento_da_venda_criar`, que desde a 0025 só a função executa). O financeiro insere só recebimento **solto** (sem venda) e, desde a 0023, altera só `situacao`, `recebido_em` e `valor_recebido` (UPDATE por coluna). **Confirmado não se reescreve** (0020); confirmação coerente conferida por gatilho (0023) |
| `despesas` | Dinheiro a sair. Auditada desde a 0019 | Financeiro e administradora; ninguém apaga |
| `taxas_cartao` | Tabela padrão por operadora, tipo e parcelas | **Só administradora** |
| `vendas` | O fato gerador, com a **cópia congelada** da taxa | Só por `venda_registrar` (todos os perfis) e `venda_alterar_pagamento` (financeiro) — sem INSERT nem UPDATE direto pela API desde a 0023 |
| `venda_alteracoes` | Histórico **imutável** de mudança de forma/taxa | Só pela função `venda_alterar_pagamento` (0023); ninguém edita nem apaga |
| `ajustes_financeiros` | A diferença quando a mudança acontece após confirmação | Só pela função `venda_alterar_pagamento` (0023) |
| `prontuarios` | Cabeçalho do registro clínico: paciente, atendimento opcional, data e título | Administradora |
| `prontuario_versoes` | Conteúdo clínico versionado: queixa, avaliação, conduta, evolução, orientações e observações | Administradora insere; ninguém edita nem apaga |
| `prontuario_imagens` | Fotos de evolução: caminho no bucket e metadados. **Única tabela que pode apagar** — ver §8.5 | Administradora; UPDATE só de `legenda`, `data_captura`, `arquivada` e `ordem` (0024) — a foto não troca de arquivo nem de prontuário pela API. Autor, hora e marca de exemplo são escritos pelo banco, e a data de captura não vai para o futuro (0027) |
| `prontuario_imagem_eliminacoes` | Por que cada foto foi eliminada, e a pedido de quem. Sem UPDATE e sem DELETE | Administradora insere |
| `modelos_documento` | Catálogo de texto-base: contrato, termo, orientação e anamnese. Cabeçalho mutável | Administradora; UPDATE só de `nome`, `descricao` e `ativo` — o `tipo` não muda (0027) |
| `modelo_documento_versoes` | Versões imutáveis do texto do modelo | Administradora insere, na sequência e com perguntas válidas; autor e hora escritos pelo banco (0027); ninguém edita nem apaga |
| `documentos` | Documento emitido, com o **texto congelado** e o hash dele. Corpo nunca muda — gatilho | Todos os perfis; anamnese só administradora. Nasce só do texto do modelo; depois muda **só** `situacao` e `motivo_cancelamento`, e só a partir de `emitido` (0022) |
| `documento_assinaturas` | Evidência da assinatura: quem, quando, IP, dispositivo, identidade conferida, hash | Todos inserem; ninguém edita nem apaga. Hash, hora, canal e operador são escritos pelo banco (0022) |
| `documento_links` | Links de assinatura à distância. Guarda o **hash** do token, nunca o token | Criar e revogar: só `documento_link_criar`/`documento_link_revogar`. Tentativas e aberturas: as funções públicas. A equipe atualiza só `canal_envio`, no clique do envio (0015) |
| `documento_campos` | Respostas da anamnese, com a pergunta congelada em cada linha. **A pergunta não muda; a resposta, sim** | Administradora edita só as colunas de resposta, e só com o documento `emitido`; quem respondeu e quando são escritos pelo banco (0027); ninguém insere nem apaga |
| `auditoria` | Quem alterou o quê, por gatilho, com a cópia da linha inteira (`to_jsonb`) em `dados` | Só os gatilhos (leitura: administradora) |

Gatilhos de auditoria em: `pacientes`, `atendimentos`, `recebimentos`, `vendas`,
`ajustes_financeiros`, `prontuarios`, `prontuario_versoes`, `prontuario_imagens`,
cinco das seis tabelas do módulo de documentos (`modelo_documento_versoes` fica
de fora: só recebe INSERT, e cada versão já guarda autor e data — escritos pelo
banco desde a 0027) e — desde a
0019 — `retornos`, `pendencias`, `despesas`, `taxas_cartao`, `procedimentos`,
`profissionais` e `perfis`.

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
- `private.recebimento_da_venda_criar(venda, ...)` — o recebimento de uma venda (0020);
  desde a 0025 sem EXECUTE para `authenticated`: só `venda_registrar`, que roda como dona, a chama
- `private.sem_acento(texto)` — `unaccent` com o dicionário explícito (IMMUTABLE),
  usada pela coluna gerada `pacientes.busca` (0025)
- `private.pendencia_origem_pelo_texto(...)` — transição da 0025: a regra de texto
  antiga, para reconhecer registros de contato gravados antes da coluna `origem`.
  Ninguém da API executa; o teste do banco confere a classificação

E os gatilhos de regra: `venda_confere_taxa`, `recebimento_confirmado_imutavel`
(0020), `recebimento_confirmacao_coerente` (0023, INVOKER: confirmação com sessão
sem data futura no fuso da clínica e "recebido" só pelo líquido previsto), `atendimento_sem_choque` (0021), `perfil_proprio_so_nome` (0019),
`documento_nasce_do_modelo`, `documento_transicao_valida`,
`assinatura_confere_documento`, `assinatura_fecha_documento`,
`campo_resposta_valida`, `prontuario_versao_conferida`,
`imagem_so_sai_com_motivo` (0022), `modelo_versao_conferida`,
`campo_resposta_autor` e `imagem_registrada_conferida` (0027).

Por fim, duas validadoras da anamnese, chamadas de dentro das funções do
módulo: `private.campos_validos` (forma das perguntas na criação e na nova
versão do modelo — 0017, endurecida na 0022) e `private.resposta_de_campo`
(uma resposta conferida contra a pergunta, a mesma regra na consulta e no link
— 0022).

> **Toda função auxiliar de política nova nasce em `private`.** É o que impede
> que ela apareça como endpoint RPC.

As funções de gatilho mais antigas ficaram em `public`: `tocar_atualizado_em`,
`auditar`, `registrar_situacao_atendimento`, `criar_perfil_para_novo_usuario`
(0001; é o gatilho `ao_criar_usuario` em `auth.users`), `documento_congelar` e
`documento_texto_nao_muda` (0013). Nenhuma é chamável pela API: o EXECUTE foi
revogado de `public`, `anon` e `authenticated` (0002, 0004 e 0019), e o gatilho
continua disparando porque o Postgres confere EXECUTE ao criar o gatilho, não a
cada disparo. Não as tome por modelo: gatilho novo nasce em `private`, com o
mesmo revoke.

No schema `public`, chamadas por RPC pela aplicação:

- `public.venda_registrar(..., p_chave)` — grava a venda **e** seu único recebimento;
  com `p_chave` (uuid do envio, opcional desde a 0028), o mesmo envio do mesmo
  perfil devolve a venda já criada em vez de gravar outra
- `public.venda_alterar_pagamento(...)` — histórico + recebimento reescrito ou ajuste
- `public.prontuario_registrar(...)` — cria o prontuário e a versão 1 na mesma transação
- `public.prontuario_nova_versao(...)` — atualiza o cabeçalho e insere nova versão clínica
- `public.prontuario_imagem_eliminar(imagem, motivo)` — grava o motivo em
  `prontuario_imagem_eliminacoes` e apaga a linha da foto na mesma transação; o
  arquivo sai antes, pela aplicação (0012)
- `public.modelo_documento_criar`, `modelo_documento_nova_versao`,
  `documento_emitir`, `documento_assinar` e `documento_campos_responder` — o
  módulo de documentos (§8.7)
- `public.prontuario_imagens_reconciliar()` — só leitura, só administradora
  (42501 para os demais): foto sem arquivo e arquivo sem linha (0024, §8.5)

As de prontuário, fotos e documentos são **`SECURITY INVOKER`** de propósito:
a RLS de quem chama continua valendo; só a administradora passa nas políticas
e nas funções do prontuário.

As duas de venda deixaram de ser INVOKER na 0023: são **`SECURITY DEFINER`**,
porque desde então nenhuma sessão tem INSERT ou UPDATE em `vendas`,
`venda_alteracoes` e `ajustes_financeiros`. `venda_registrar` confere
`private.tem_acesso()` na entrada (e `private.e_financeira()` para taxa
manual); `venda_alterar_pagamento` confere `private.e_financeira()` (42501).
Dentro delas a RLS não vale — a segurança está nessas checagens, testadas no
`test:banco` — mas os gatilhos da taxa, da imutabilidade e da auditoria
continuam vendo o `auth.uid()` de quem chamou.

As outras seis que a aplicação chama também são **`SECURITY DEFINER`**, porque quem
chama não tem permissão na tabela: `documento_link_criar` e
`documento_link_revogar` (a equipe só tem SELECT e UPDATE de `canal_envio` em
`documento_links`; cada uma confere `private.tem_acesso()` e, na anamnese,
`private.e_administradora()` por conta própria) e as quatro funções públicas do
link, que `anon` executa (§8.7).

**Invoker não quer dizer que o banco confie no que chega.** Desde a 0020 a
origem da taxa de toda venda é conferida por gatilho, e desde a 0023 a venda só
entra pelas funções (sem INSERT/UPDATE direto em `vendas`). O mesmo desenho na 0021 (agenda) e na 0022
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
7. **Migração nova passa por `npx supabase db reset` e `npm run test:banco`**
   no banco local antes de ir para produção, e o que ela passou a garantir
   entra em `supabase/testes/permissoes.sql`.
8. **Gatilho que só vale para sessão de usuário deixa passar quando
   `auth.uid()` é nulo** — é manutenção pelo SQL do projeto, que já passa por
   cima da RLS. É o caso de `recebimento_confirmado_imutavel` (0020): sem
   sessão, um recebimento confirmado ainda pode ser corrigido. A transição de
   estado do documento (`documento_transicao_valida`, 0022) vale sempre.
9. **Toda função nova leva `set search_path = public, pg_temp`,
   `revoke all on function ... from public, anon` (e de `authenticated` também,
   quando é função de gatilho) e `grant execute` só para quem precisa.** O
   `alter default privileges` da 0009 **não** resolve isso: o Postgres concede
   EXECUTE a `PUBLIC` em toda função nova, e sem o revoke explícito ela nasce
   chamável por anônimo em `/rest/v1/rpc/` — exatamente o que a 0002 e a 0003
   consertaram. (O comentário da `0019_privilegio_minimo.sql` que fala em
   "contra a regra 7" se refere a esta, que antes tinha esse número.)
10. **Tabela nova leva as colunas de rastro** (`criado_em`, `atualizado_em`,
    `criado_por`) e o gatilho `tocar_atualizado_em`. Não tome as antigas por
    modelo: `perfis`, `profissionais`, `procedimentos`, `retornos`,
    `pendencias` e `taxas_cartao` não têm `criado_por`, e nelas o autor só
    fica no `ator_id` da `auditoria`.
11. **Função de gatilho que grava em tabela de trilha é `SECURITY DEFINER`.**
    `authenticated` só tem SELECT em `auditoria` e `atendimento_situacoes` —
    trocar `auditar` ou `registrar_situacao_atendimento` para INVOKER faz o
    gatilho falhar ao inserir a trilha, e a operação inteira cai junto. Gatilho
    que só calcula ou confere `NEW` pode ser INVOKER (`tocar_atualizado_em`,
    `documento_congelar`, `documento_texto_nao_muda`), e
    `assinatura_confere_documento` (0022) **precisa** ser: é o `current_user`
    que separa o balcão da função pública do link.
12. **Sequência nova nasce só com USAGE para `authenticated`** (padrão da
    0026): o INSERT com identity/bigserial precisa só de `nextval`. SELECT ou
    UPDATE (`setval`, que deixa a sessão empurrar a sequência e negar
    inserções) só com `grant` explícito e justificado na migração. Tabela
    que a sessão não insere leva `revoke all on sequence ... from
    authenticated`, como a 0024 fez com as trilhas.
13. **A marca `exemplo` não se grava pela API** (0026). Tabela nova que o
    `dados-exemplo-limpar.sql` passe a apagar leva o gatilho
    `private.exemplo_so_sem_sessao()`; sem ele, uma sessão marca dado real
    como exemplo e a próxima limpeza o apaga.

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
| `recepcao` | Atendimento e agendamento | Pacientes, agenda, retornos, pendências, registro de venda **com a taxa padrão**. No Financeiro vê vendas, movimentações e os números de entrada; despesas pagas, despesas pendentes e resultado de caixa aparecem como `—`, e as abas Despesas, Taxas de cartão e Fluxo mensal não aparecem. Sem auditoria |

O perfil "Profissional" está previsto para quando a equipe crescer. Não existe
ainda.

**Auditoria e gestão de usuários existem só no banco.** A RLS dá à
administradora a leitura de `auditoria` e a edição de `perfis`, mas nenhuma
tela lê a trilha nem libera ou promove conta: "Equipe" e "Acesso e permissões"
estão "em breve" em Configurações, e "Perfis e permissões" fica desabilitado no
menu de perfil. Hoje isso se faz pelo painel do Supabase ou por SQL
([`supabase/README.md`](supabase/README.md)).

**O que a recepção vê de dinheiro.** `recebimentos` é lido por todo perfil
ativo (`recebimentos_leitura`, 0019). Por isso, na Visão Geral, a recepção vê
recebido no mês, a receber, o que venceu e o gráfico dos últimos seis meses; só
"Despesas do mês" vira `—`. Não é vazamento — e esconder esses totais seria
decisão da clínica, não correção.

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

**Para tirar o acesso de alguém, desative o perfil (`ativo = false`) — não
apague a conta.** Desativar vale na hora: `private.tem_acesso()` lê `perfis` a
cada consulta, `usuarioAtual()` passa a responder `null`, as ações recusam e o
layout manda para `/sem-acesso`. Apagar a conta no Auth leva a linha de
`perfis` junto (`on delete cascade`) e põe `null` nas colunas de autor que
apontam para ela, e o nome some das trilhas. Se a pessoa emitiu documento, o
gatilho `documento_transicao_valida` (0022) recusa a mudança de `emitido_por`
e a exclusão inteira falha.

### As três camadas de permissão

Toda regra de acesso é verificada em três lugares, e as três precisam existir:

1. **Interface** — não oferece a porta. Botão que vai falhar é pior que botão
   ausente.
2. **Ação de servidor** — recusa com mensagem legível. *Esconder o botão não é
   proteger a rota.*
3. **RLS / função do banco** — recusa mesmo que as outras duas falhem ou sejam
   contornadas.

Onde estão:

- Interface: `src/components/**/somente-*.tsx`, checagens de papel nas páginas.
  O menu lateral (`MENU` em `lib/nav.ts`) é o mesmo para os três perfis: quem
  abre Prontuários sem ser administradora recebe `AcessoRestritoProntuario`.
  Dentro dos módulos a porta é escondida — abas do Financeiro e botões de
  escrita dependem do papel —, e quem chega pela URL a uma tela fora do seu
  alcance recebe `SomenteFinanceiro` ou `SomenteAdministradora` (a importação
  de planilha mostra um cartão próprio)
- Servidor: **`ehAdministradora()` / `ehFinanceira()` de `src/lib/auth.ts`** — são
  estas que valem
- Banco: políticas da `0003` (que recriou todas as da `0001`) e da `0007`,
  com as `for all` reescritas uma por operação, sem DELETE, na `0019`; prontuário, fotos e
  documentos trazem as suas nas próprias migrações (`0010`–`0017`; a política
  de envio das fotos ao Storage foi refeita na `0022`); gatilhos de regra em
  `0019`–`0022`

> As antigas `podeAlterarTaxa()`, `podeOperarFinanceiro()` e
> `podeConfigurarTaxas()` de `src/lib/venda.ts` foram removidas (§13). Se
> aparecer `podeAlterarTaxa` numa página, é só o nome de uma variável que guarda
> o resultado de `ehFinanceira()`. A camada de servidor é `ehFinanceira()`.

**Toda ação de servidor abre com `usuarioAtual()`, e isso é obrigatório.** O
`layout.tsx` do grupo `(app)` protege a *renderização de página*, não a chamada
de uma server action — ela chega por POST direto no endpoint, sem passar pelo
layout. Ação nova sem essa primeira linha é rota aberta. As exceções rodam por
natureza sem perfil: `entrar` e `sair` (`src/app/entrar/actions.ts`), que criam
e encerram a sessão, e as três ações do link público em
`src/server/acoes/assinatura-link.ts` (`abrirDocumentoParaAssinatura`,
`assinarPorLink`, `responderPorLink`), em que quem decide é a função pública do
banco, com o token e a data de nascimento (§8.7). Nas demais, a primeira linha
pode ser um auxiliar do próprio arquivo que chama `usuarioAtual()` e já confere
o papel — `exigirAcesso()` (documentos), `exigirFinanceira()` (despesas),
`exigirAdministradora()` (procedimentos, taxas), `administradoraOuErro()`
(fotos) —, e isso conta como abrir com `usuarioAtual()`.

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
| Taxa manual só financeiro | Sim — gatilho `vendas_confere_taxa` (0020) e checagem em `venda_registrar` / `venda_alterar_pagamento` (0023) |
| Lançar despesa só financeiro | Sim — `despesas_insercao` / `despesas_edicao` |
| Configurar tabela de taxas só administradora | Sim — `taxas_insercao` / `taxas_edicao` |
| Alterar venda só financeiro | Sim — só por `venda_alterar_pagamento` (DEFINER, confere `private.e_financeira()`; 0023 revogou o UPDATE direto e removeu `vendas_edicao`) |
| Choque de horário | Sim, desde a 0021 — gatilho `atendimentos_sem_choque` |
| Data do recebimento não pode estar no futuro | Sim, desde a 0023 — gatilho `recebimento_confirmacao_coerente` (com sessão, na passagem para confirmado) |
| Data do pagamento da despesa não pode estar no futuro | **Não** — só a ação; o banco aceita data futura em despesa |
| `recebido` × `recebido_divergencia` decidido pelo valor | Sim, desde a 0023 — gatilho `recebimento_confirmacao_coerente` (`recebido` só pelo líquido previsto) |
| Transições de situação (recebimento cancelado é terminal; despesa só paga ou cancela a partir de `pendente`) | **Não** — a RLS deixa o financeiro levar um recebimento `cancelado` de volta a `previsto`, ou uma despesa `cancelada` direto a `paga` |
| Motivo e justificativa com 5 caracteres ou mais | **Não** — o banco só exige motivo não vazio (`venda_alterar_pagamento`) e justificativa não nula (`taxa_manual_justificada`) |
| Competência da despesa = mês do vencimento | **Não** — regra da ação (§13) |

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
| O número vira `number \| null` | A tela é legítima para quem não vê tudo | `IndicadoresDoPeriodo.despesasPagas` |
| A consulta **falha alto** | A tela inteira perde sentido sem o dado | `fluxoMensal()` lança se não for financeiro |
| A rota é fechada | Mesma coisa, do lado da página | `/financeiro/fluxo` → `SomenteFinanceiro` |

`null` quer dizer **"não visível para este perfil"**, e nunca zero. O tipo é a
trava: quem consumir é obrigado pelo typechecker a decidir o que mostrar, e o
padrão da casa é traço (`—`) com a razão à vista, como no botão indisponível.

**Nunca some uma tabela restrita numa tela aberta e imprima o total.**

**O limite de linhas mente do mesmo jeito.** O PostgREST devolve no máximo
`max_rows` linhas por requisição (1000 no `supabase/config.toml` e no padrão do
Supabase hospedado) e corta o resto **sem erro**. Consulta cujas linhas a
aplicação soma, conta ou filtra lê tudo por `todasAsLinhas`
(`server/consultas/todas-as-linhas.ts`: blocos de 500, ordem por chave única)
ou conta no banco — `count: "exact", head: true`, ou o embed `tabela(count)`,
como o "aplicada em N vendas" das taxas e os usos de cada procedimento. Lista
de exibição com `.limit(n)` deliberado não entra na regra. Página pedida além
da última responde 416 (`PGRST103`): `paginaAlemDoFim` reconhece, a consulta
devolve lista vazia com o total certo, e a tela mostra `PaginaAlemDoFim`
(`components/ui/pagina-alem-do-fim.tsx`) — nem "nenhum registro", nem a tela
de erro.

**O mesmo vale para nomes.** `perfis_le_proprio` (0003) deixa recepção e
financeiro lerem só a própria linha de `perfis`. Todo embed `perfis ( nome )`
volta `null` quando o autor é outra pessoa: na trilha de situação da agenda, em
quem emitiu o documento ou gerou o link, no operador da assinatura no balcão (a
tela mostra "não registrado") e no autor de alteração e ajuste de venda. Não é
dado faltando, é a RLS. Não trate esse `null` como "sem autor", e não abra a
leitura de `perfis` para resolver: mostrar o nome dos colegas pede uma decisão
e uma porta que exponha só `id` e `nome`.

### Fluxo de sessão

- [`src/middleware.ts`](src/middleware.ts) → [`src/lib/supabase/middleware.ts`](src/lib/supabase/middleware.ts):
  renova a sessão a cada requisição e redireciona para `/entrar` quem não está
  autenticado. Rotas públicas: `/entrar`, `/sem-acesso`, `/assinar`,
  `/recuperar-senha` e `/redefinir-senha`. Guarda o destino em `?proximo=` —
  só o caminho, sem a query string. O `matcher` deixa de fora só estáticos e
  imagens: sem sessão, qualquer caminho fora das rotas públicas, inclusive um
  que não existe, vai para `/entrar`; com sessão, abrir `/entrar` leva a `/`.
- A ação `entrar` só aceita destino interno (`destinoSeguro()`, em
  `src/app/entrar/destino.ts`): começa com `/`, não com `//`; recusa espaço,
  caractere de controle e barra invertida, crus ou em `%XX`, e `%2F`; confere a
  origem com o parser de URL; e o que passar de 300 caracteres vira `/` (não
  trunca mais). A página `/entrar` sanitiza o mesmo valor. É o que impede usar o
  login como redirecionamento para outro site. A recusa tem frases próprias
  para conta não confirmada, muitas tentativas (429) e falha do serviço;
  credencial errada tem uma frase só, para não revelar quais e-mails existem.
- O middleware grava `x-id-requisicao` (12 hex, sempre gerado no servidor) no
  request e na resposta — é o id de correlação dos logs (`CABECALHO_ID_REQUISICAO`,
  `idDeCorrelacao()` em `lib/erros-banco.ts`). O redirect para `/entrar` descarta a
  query da rota original. A falha do serviço de Auth no login vai para
  `registrarFalha` só com código e `status N`, nunca com a mensagem do Auth.
- **Sair** (`sair()`) chama `signOut()` sem argumento, e o escopo padrão do
  Supabase é `global`: encerra a sessão da conta em **todos** os aparelhos. Se
  duas pessoas dividirem um login, sair num computador derruba o outro. A troca
  de senha, ao contrário, encerra só a sessão local (`{ scope: "local" }`).
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
    assinar/[token]/      assinatura e anamnese por link — a única rota pública com conteúdo de paciente
    error.tsx  global-error.tsx  not-found.tsx   telas de erro e de rota inexistente
    (app)/                tudo que exige sessão válida
      layout.tsx          estrutura principal + faixa de demonstração; force-dynamic
      error.tsx           erro dentro do sistema: menu de pé, aviso na área de conteúdo
      loading.tsx         esqueleto enquanto a próxima tela carrega
      page.tsx            Visão Geral
      pacientes/  agenda/  prontuarios/  financeiro/  formularios/ (Documentos e Contratos)
      relacionamento/  busca/  relatorios/  configuracoes/
  components/
    layout/               estrutura, menu, cabeçalho, perfil, faixa de demonstração, tela de erro
    ui/                   cartão, botão, campo, formulário de ação, abas, seletor segmentado,
                          chip de situação, prioridade, lista, avatar, vazio
    overview/  pacientes/  agenda/  financeiro/  configuracoes/  prontuarios/  documentos/
    relacionamento/
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
    documento.ts          regras de modelo, emissão, assinatura, link e anamnese
    cn.ts                 junta classes condicionais, sem biblioteca externa
    csv.ts  importacao.ts leitor de planilha e validação da importação
    busca.ts  relacionamento.ts   busca segura e validação do acompanhamento
    nav.ts                fonte única do menu + identidade da clínica
    erros-banco.ts        erro do Postgres → frase em português (nada cru na tela)
    registro.ts           log técnico sanitizado + falha de consulta (server-only)
    acao.ts               `ResultadoAcao`, o contrato das ações de botão
    formulario.ts         leitura do FormData nas ações: texto, UUID, valores digitados
supabase/
  config.toml             Supabase local: portas 5532x, Postgres 17
  migrations/             estrutura do banco, versionada
  testes/permissoes.sql   testes do banco por perfil (npm run test:banco)
  usuarios-locais.json    contas de teste do Supabase local
  dados-exemplo*.sql      semeadura e limpeza da demonstração
testes/                   preparação do Vitest e o Supabase falso das ações
e2e/                      Playwright: fluxos e telas, contra o Supabase local
scripts/                  contas locais, testes do banco, geração segura de tipos
docs/
  overview-sistema.md     documento de produto
  prompt-onboarding-codex.md   primeira mensagem para um agente de IA novo
  redesign                mockup do Google Stitch (referência visual, NÃO é fonte)
  assets/                 as imagens animadas (SVG) do README
```

### As regras de arquitetura

**1. Componente não conversa com o banco.**
Leitura passa por `src/server/consultas/`, escrita por `src/server/acoes/`.
Uma exceção, deliberada: o upload das fotos de evolução
(`components/prontuarios/enviar-fotos.tsx`) vai do navegador direto ao Storage,
porque a Vercel corta o corpo da requisição em 4,5 MB e o bucket aceita 10 MB
(§8.5). A linha da foto continua sendo gravada pela ação `registrarImagem`. Não
"conserte" esse upload para passar pela ação, e não abra outra exceção sem um
motivo desse tamanho. (O cliente do navegador também aparece nos fluxos de
senha, mas lá só fala com o Auth.)

**2. Consulta é `server-only`, ação é `"use server"`.**
`import "server-only"` no topo de todo arquivo de consulta. O import vaza para
o cliente? O build quebra — que é exatamente o que se quer.

**3. Toda escrita valida no servidor.**
A validação do formulário é conveniência para responder rápido. **Quem envia o
formulário por fora não passa por ela.** A validação que vale é a da ação.

**4. A regra mora em `lib/`, e todo caminho de escrita passa por ela.**
`validarPaciente`, `validarProcedimento`, `calcularVenda` e `validarDespesa`
são chamadas pelas ações de servidor — e `validarPaciente` também pela
importação em massa. Os formulários delas são `noValidate`: aplicam máscara, enviam e
mostram os erros que a ação devolve. Do lado do cliente, `lib/` fornece listas,
rótulos e a conta da prévia (a da venda usa `custoDaTaxa`, a mesma que
`calcularVenda` usa). Por isso esses arquivos **não** são `server-only`. Se um
formulário passar a validar antes de enviar, ele chama **a mesma função**. *Uma
regra escrita duas vezes vira duas regras diferentes na terceira mudança.* Foi
exatamente esse o cuidado que impediu a importação em massa de virar a porta
dos fundos das validações do cadastro.

**5. Estado de tela mora na URL.**
Busca, filtro, página, dia da agenda, mês do financeiro — tudo em query string.
Cada tela tem um leitor só dos próprios parâmetros, que cai no padrão diante de
valor torto (na Agenda, `components/agenda/parametros-agenda.ts`).
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
Exceções existentes, não imite: `cancelarDocumento` (`acoes/documentos.ts`) e as
ações de foto `atualizarImagem` e `eliminarImagem` (`acoes/prontuario-imagens.ts`)
devolvem `{ erro: string | null }`, sem erro por campo nem `valores`. E há
ações que nem são formulário — o componente as chama direto, com os próprios
argumentos, e cada uma tem o seu retorno: as três ações do link público,
`criarLinkAssinatura`, `registrarCanalDoLink`, `responderAnamnese`,
`buscarPacientesParaSelecao` e o envio de fotos (`registrarImagem`).

> O que se usa é `BotaoLink` (navegação), `FormularioDeAcao` + `BotaoDeAcao`
> (ação de um botão só) e botões locais com `useFormStatus` nos formulários
> maiores. As primitivas de `ui/` (`Card`, `CardCabecalho`, `CardCorpo`,
> `EstadoVazio`, `SituacaoChip`, `NavegacaoEmAbas`, `SEGMENTO_GRUPO`) e as
> classes de campo são obrigatórias — reusar, nunca reinventar com Tailwind solto.
>
> Raio, sombra e texto também são tokens de `globals.css`: `--radius-painel`
> (16px), `--radius-controle` (12px), `--radius-cartao` (8px) e `--radius-tag`
> (4px); `--shadow-cartao`, `--shadow-realce` e `--shadow-flutuante`; as classes
> `.t-display`, `.t-headline`, `.t-body-lg` e `.rotulo`; e os utilitários
> `.tabular` (algarismos de largura fixa), `.rolagem-discreta` e `.esqueleto`.
> No componente: `rounded-[var(--radius-cartao)]`, `shadow-[var(--shadow-realce)]`.
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
Os botões de situação do Relacionamento seguem esse contrato desde 23/09/2026
(o `AcaoInline` saiu).

**10. Nenhuma ação usa `try/catch`, e `redirect()` é sempre a última linha.**
`redirect()` funciona lançando uma exceção que o Next captura: dentro de um
`try` ela seria engolida e a navegação não aconteceria. Ordem fixa:
valida → escreve → checa erro → `revalidatePath` → `redirect`.

**11. Erro de banco vira mensagem em português — por `lib/erros-banco.ts`.**
Nunca vaze `error.message` cru. `mensagemDoBanco(error, "frase padrão",
{ "23505": "Já existe uma paciente com este CPF." })` traduz: frase nossa de
`raise exception` (P0001) passa, permissão do Postgres vira frase neutra,
código conhecido vira frase do domínio, o resto vira a padrão. O detalhe técnico
vai para o log por `registrarFalha(contexto, error)` — sanitizado, sem `details` nem valor digitado:
a mensagem passa por `sanitizarParaRegistro` (e-mail, JWT/Bearer, token de 32+
caracteres, data, CPF/telefone e quebra de linha viram marcadores). O contexto é nosso e
mantém ids e caminhos (é por eles que se acha uma foto órfã); dele saem só
quebra de linha, controle e e-mail. Cada linha leva um `id` curto de
correlação, que `registrarFalha` devolve (`null` quando não registra, como no
P0001): a ação pode, se quiser, anexá-lo à frase da tela. Consulta que falha usa `falhaDeConsulta(...)`, que registra
e lança uma frase segura para o `error.tsx` da rota. **Consulta que não lê o
`error` é bug**: falha de banco vira lista vazia e ninguém fica sabendo.
Consulta por id segue a mesma regra: id que nem é uuid devolve `null` sem ir
ao banco (404); sem linha é `null` (inexistente e escondida pela RLS ficam
iguais, §8.1); erro de banco é `falhaDeConsulta` — nunca 404.

**Cabeçalhos de segurança (`next.config.ts` e middleware).** O `next.config.ts`
manda os demais cabeçalhos, **não** a CSP — duas CSPs valeriam juntas. A CSP tem nonce
por requisição: `src/lib/politica-de-conteudo.ts` monta, `src/middleware.ts`
envia (na resposta e na requisição, de onde o Next tira o nonce para os
próprios scripts), e o `connection()` do layout raiz deixa toda rota
dinâmica — página estática sairia sem nonce (custo pequeno: `/entrar`,
`/sem-acesso`, `/recuperar-senha`, `/redefinir-senha` e a 404 já passavam pelo
middleware com `getUser`). Os pedaços de JS pedidos depois pelo runtime entram
pelo `'strict-dynamic'`; todo `<script>` do HTML servido traz o nonce, e o E2E
confere. `script-src`: `'self'
'nonce-…' 'strict-dynamic'`; `'unsafe-eval'` só em dev. `style-src`: nonce em
produção; `'unsafe-inline'` só em `style-src-attr` (atributo `style={…}` com
medida do dado) e, em dev, no `style-src` (o Next dev injeta `<style>` sem
nonce). Atributo `style` não aceita nonce, não executa script, e `url()`
continua presa a `img-src`/`font-src`. `<style>` injetado em runtime por
biblioteca nova, sem nonce, é recusado **só em produção** — quem pega é o E2E da
CI, que roda sobre o build. Integração nova com domínio externo (analytics, `vercel.live`
dos deploys de Preview, fontes, mapas) precisa ser liberada em
`politicaDeConteudo`, senão é bloqueada. Valem também `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy` e HSTS (sem `includeSubDomains`/`preload` até o domínio
final ser decidido). Em `/assinar/*`: `Referrer-Policy: no-referrer`,
`Cache-Control: no-store` e `X-Robots-Tag: noindex, nofollow, noarchive`. Conferidos por
`testes/cabecalhos-seguranca.test.ts` e pelo `e2e/seguranca.spec.ts`.

A ordem da tradução: o código passado em `especificas` vence tudo; depois,
estrutura ausente (`PGRST202`, `PGRST205`, `42P01`, `42883` ou "schema cache")
vira "A migração pendente precisa ser aplicada.", e falha de rede sem código
vira a frase de conexão; `P0001` e um `42501` com frase nossa passam, desde que
tenham até 240 caracteres e não tenham cara de texto técnico; 15 códigos têm
frase padrão; o resto vira a `padrao` do contexto. `registrarFalha` não
registra `P0001`: recusa de regra não é falha técnica.

Em Documentos e Prontuários, a estrutura ausente troca a página pelo card
"Migração pendente". O texto desses cards é de antes do Supabase local: cita só
a 0013 ou a 0010 e manda rodar `npm.cmd run db:push` — comando de produção, do
dono do projeto (§2). Se o card aparecer no seu ambiente, rode
`npx supabase db reset` no banco local.

**Telas de erro.** `TelaDeErro` (`components/layout/tela-de-erro.tsx`) nunca
mostra `error.message`: nem a frase lançada por `falhaDeConsulta` chega à tela.
A pessoa vê uma frase fixa, com o foco no título, e o `digest` como
"Código do erro", para cruzar com o log. "Tentar de novo" faz
`router.refresh()` + `reset()`, porque só `reset()` repetiria o erro guardado.
Uma falha no próprio layout de `(app)` (perfil, pendências) sobe para
`app/error.tsx`, sem menu. A 404 (`app/not-found.tsx`) aparece fora da
estrutura do sistema, inclusive para `notFound()` de uma tela de `(app)`.

**12. Leitura passa por `cache()` do React.**
Quase todas as consultas de `server/consultas/` (e `usuarioAtual()`) são
embrulhadas em `cache`: dentro de um request, layout, página e componentes chamam a mesma
função e o banco responde uma vez — o layout e a lista de pendências dividem
`pendenciasAbertas()`, e `indicadores()` reaproveita `atendimentosDeHoje()` e
`resumoFinanceiro()`. Consulta nova segue o padrão. Tirar o `cache` não quebra
nada visível, só multiplica as idas ao banco. Ele vale por request e compara
argumentos por identidade: passe valores primitivos.

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
aplicação. Quem calcula o centavo é `lib/moeda.ts`. Desde a 0020, o gatilho
`vendas_confere_taxa` confere o único arredondamento da venda,
`taxa_valor = round(valor_final × taxa_percentual / 100, 2)`, e recusa a
gravação se a aplicação tiver arredondado diferente (§8.4).

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

**Nenhuma cor é escrita fora de [`src/app/globals.css`](src/app/globals.css)**,
com uma exceção comentada no código: o `themeColor` da `viewport` em
`src/app/layout.tsx` (`#ffffff`, o `--color-surface`), porque a meta tag não lê
variável de CSS. Nada de `bg-[#ABC123]` em componente.

**Marca (azul)** — navegação, ações principais, links, títulos, foco. Não
comunica estado nenhum: é a cor de "o sistema", não de "a situação".

**Estado — quatro semânticas fixas**, e a regra que as separa é o que importa:

| Semântica | Quando |
|---|---|
| **negativo** (vermelho `#bb0000`) | Não compareceu · cancelado · vencido · falha · pendência crítica |
| **atenção** (laranja `#8f4700`) | Confirmação pendente · aguardando assinatura · retorno próximo · cadastro incompleto |
| **positivo** (verde `#0e7639`; era `#107e3e`, que dava 4,47:1 no `surface-container`) | Confirmado · recebido · concluído |
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

- Todo par texto/fundo **precisa** passar no **WCAG AA** (mínimo 4.5:1).
  Não há mais exceção conhecida nos tokens: desde 23/09/2026
  `--color-outline` é `#5f6369` (era `#72767c`, que caía para 4,22:1 em
  `surface-container-low`) e dá de 4,74 a 6,04:1 em todos os fundos do
  sistema (`#fff`, `#fcfcfd`, `#f9f9fa`, `#f4f6f8`, `#edeff2`).
  `text-outline` é o texto **terciário** (legenda, data, contador); texto
  secundário relevante usa `text-on-surface-variant` (8,88:1).
  `outline-variant` (`#c1c6cd`, 1,72:1) é **só borda, divisória e ícone**,
  nunca texto — os usos que sobraram como `text-outline-variant` são ícones.
- Item indisponível ou inativo (módulo, card, opção de menu) **não** usa
  opacidade sobre texto: usa fundo
  `surface-container-low`, borda tracejada e um selo em texto. Módulo
  provisório no menu é marcado por `ItemMenu.emConstrucao` (`lib/nav.ts`) e
  mostra "em breve". Exceção ainda aberta: o botão desabilitado "Marcar como
  enviada" do Relacionamento fica em 2,71:1 por `opacity-55` — a WCAG isenta
  controle inativo, mas ele carrega significado ("abra a mensagem antes");
  mudar o estilo é decisão de UI.
- **Cor nunca comunica sozinha.** Todo estado leva também texto, ícone próprio
  e forma (preenchido, contornado).
- Foco sempre visível.
- **Conferido por máquina:** `e2e/acessibilidade.spec.ts` roda o axe-core
  (WCAG 2.0, 2.1 e 2.2, níveis A e AA) em toda tela do sistema e nas públicas,
  a 360 e 1440 px, e reprova com qualquer violação. Ele vê a tela como abre;
  erro de formulário, gaveta e diálogo ficam com os specs de fluxo e a revisão
  manual. Região que rola na horizontal (tabela larga) precisa receber foco
  pelo teclado: `tabIndex={0}`, `role="region"` e nome (ver
  `financeiro/fluxo-mensal.tsx`), ou virar lista no celular.
- `aria-current` na navegação; atalho "Ir para o conteúdo".
- `prefers-reduced-motion` respeitado.
- **Botão que não executa nada fica visivelmente indisponível, com a razão à
  vista** (no `title`). Não some, não engana. A primitiva para isso é
  `BotaoIndisponivel` (`ui/button.tsx`: tracejado, `aria-disabled`, razão no
  `title`); hoje não é usada em tela nenhuma, mas é ela que se usa quando
  precisar, em vez de inventar outro estilo de desabilitado.

### 7.5 Idioma

Interface, mensagens de erro, nomes de função, variáveis, comentários, nomes de
coluna, migrações e mensagens de commit: **tudo em português**.
`clienteServidor`, `usuarioAtual`, `validarPaciente`, `taxa_percentual`.

**Nome de arquivo é a exceção, e ela tem forma.** Em `components/ui/`,
`components/layout/` e `components/overview/`, os arquivos mais antigos têm nome
em inglês e o símbolo exportado em português: `button.tsx` exporta `BotaoLink`,
`empty-state.tsx` exporta `EstadoVazio`, `day-rail.tsx` exporta `LinhaDoDia`. Os
acrescentados depois já nasceram em português (`ui/abas.tsx`,
`ui/formulario-acao.tsx`, `ui/segmento.ts`, `layout/botao-sair.tsx`,
`layout/tela-de-erro.tsx`). Nos módulos de
domínio (`pacientes/`, `agenda/`, `financeiro/`, `configuracoes/`,
`prontuarios/`, `documentos/`, `relacionamento/`) o arquivo também é português:
`formulario-venda.tsx`, `lista-despesas.tsx`, `painel-assinatura.tsx`.
**Arquivo novo leva nome em português**, também nas pastas mistas; não renomeie
os antigos só por isso.

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
  interface, não como garantia. Valor fora da lista (vindo da importação)
  aparece na edição como opção própria, "(importada)" — sem ela o `<select>`
  cairia em "—" e salvar a ficha por outro motivo apagaria a origem.
- **Observações são administrativas** (preferência de horário, quem indicou,
  forma de contato). Conteúdo clínico vai para o prontuário — está escrito no
  campo e no comentário da coluna no banco.
- **Endereço em `jsonb`**, lido com tolerância: registro antigo fora do formato
  não quebra a ficha.
- **O banco guarda o cadastro normalizado** (`normalizarPaciente` e
  `paraOBanco`, em `lib/paciente.ts`): CPF, telefone e CEP só com dígitos,
  e-mail em minúsculas, UF em maiúsculas, texto aparado (espaços repetidos nos
  campos de uma linha viram um) e cortado no limite de cada campo — exceto o
  CEP, que **precisa ter 8 dígitos** e é recusado com mensagem, em vez de
  cortado sem aviso, opcional vazio como `NULL` (nunca `""`) e endereço todo vazio
  como `endereco = NULL`. A formatação volta só na exibição, e a busca por
  dígitos depende desse formato: quem gravar paciente por outro caminho (SQL,
  script) grava do mesmo jeito.
- **Não existe excluir paciente.** Atendimentos, vendas, recebimentos,
  prontuários e documentos apontam para o cadastro com `on delete restrict`. E
  desde a 0019 o banco nem concede DELETE em `pacientes` a `authenticated`: a
  tentativa pela API é recusada por permissão (42501) antes de chegar à chave
  estrangeira. **Arquivar** tira da lista, preserva tudo e é reversível no
  clique seguinte.
- **Arquivada some dos seletores, mas não fica bloqueada.** O seletor de
  paciente (agenda, venda, documento, prontuário, convite) usa o filtro padrão
  "ativas" de `listarPacientes`. A ficha da arquivada, porém, continua
  oferecendo "Marcar atendimento" (`/agenda/novo?paciente=`), e nem a página,
  nem a ação, nem o banco recusam. Se a regra passar a ser "arquivada não
  marca", é decisão da clínica, e vale nas três camadas.
- **Ficha inexistente e ficha sem permissão devolvem a mesma tela.** A RLS não
  distingue as duas, e a interface também não deve — dizer que o registro existe
  já é informação.

**Busca** (`/pacientes`): cobre nome, nome social, e-mail e telefone. Quando o
termo tem **3 dígitos ou mais**, a pontuação é ignorada e a busca procura
também no CPF e no telefone só com os dígitos — a recepção digita
`11987654321`, `(11) 98765` ou `529.982.247-25`, sem precisar acertar o formato
guardado. Vírgula, parêntese, aspas, barra invertida, `*` e `%` são
**retirados do termo** antes de virar filtro: os quatro primeiros são a gramática
do PostgREST, os dois últimos viram curinga no `ilike` (quem digitasse `%`
listaria a base inteira); `_`, o curinga de um caractere, também sai. É a
mesma função nas buscas de pacientes, prontuários e documentos:
`termoDeBusca()` em [`src/lib/busca.ts`](src/lib/busca.ts), testada.

**Importação de planilha** (`/pacientes/importar`, restrita à administradora):

- Dois passos. **Nada é gravado antes da confirmação.**
- O arquivo é enviado nos dois passos e **reprocessado no servidor**. Devolver
  as linhas já analisadas seria mais rápido, mas então o que entra no banco
  seria o que o navegador disse ter lido — e não é ele quem decide.
  Por isso o formulário é enviado pelo `onSubmit` (com `startTransition`), e
  não pela prop `action`: com `action`, o React 19 reinicia o formulário ao
  fim da ação, o campo de arquivo (obrigatório) voltava vazio e "Importar" era
  barrado pelo navegador sem aviso. O "ocupado" dos botões vem do terceiro
  valor do `useActionState`, não de `useFormStatus`. Trocar o arquivo depois
  da análise esconde "Importar" até uma análise nova.
- Separador `;` detectado contando **fora das aspas** (Excel pt-BR usa
  ponto-e-vírgula porque a vírgula é o decimal). Conta `;`, `,` e tabulação só
  na primeira linha; no empate vence o primeiro dessa ordem, e arquivo de uma
  coluna só fica com `;`.
- Encoding: **UTF-8 estrito primeiro, Windows-1252 como queda**. A ordem
  importa — Latin-1 nunca falha, então testá-lo antes leria todo arquivo UTF-8
  com acento errado. **`.xlsx`, `.xls` e UTF-16 são recusados** com a
  instrução de salvar como CSV (arquivo binário é reconhecido por byte NUL nos
  primeiros 4 KB).
- Aspa sem fechar faz a análise falhar dizendo a linha; valor preenchido além
  das colunas do cabeçalho vira **erro da linha** (não aviso), para não gravar
  dado deslocado de coluna.
- Linha recusada pelo banco mostra a frase de `mensagemDoBanco` e registra o
  detalhe por `registrarFalha` — nunca a mensagem crua do Postgres.
- BOM removido; data `dd/mm/aaaa` convertida, com a data interpretada na prévia.
  Também aceita `dd-mm-aaaa`, `dd.mm.aaaa` e `aaaa-mm-dd`. Ano com dois dígitos
  entra com aviso: maior que os dois últimos dígitos do ano atual vira 19xx,
  senão 20xx.
- Colunas reconhecidas **pelo nome**, sem acento e sem maiúscula. Coluna
  desconhecida é **listada como ignorada**, não faz falhar. Cada campo fica com
  a primeira coluna que casar na ordem de `SINONIMOS` (`lib/importacao.ts`):
  com "Telefone" e "Celular", vale "Telefone", e "Celular" sai como ignorada.
- Linhas totalmente vazias são descartadas. O número da linha na prévia conta
  o cabeçalho como 1 e só bate com o Excel se não houver linha em branco antes
  ou no meio.
- **Baixar modelo** gera na página um CSV com as 15 colunas de
  `COLUNAS_DO_MODELO` (separador `;`, BOM para o Excel e uma linha de exemplo).
  Essa lista é separada de `SINONIMOS`, e nada no código ou nos testes amarra as
  duas: cabeçalho do modelo precisa continuar sendo nome aceito em `SINONIMOS`.
- **A validação é a mesma do cadastro manual** (`validarPaciente`) — inclusive
  o CEP de 8 dígitos: CEP inválido recusa a linha (decisão em aberto se a
  clínica preferir importar a base antiga sem CEP).
- Duplicata só por CPF — homônimo existe, nome igual não prova nada. CPF
  repetido dentro do próprio arquivo também é detectado. Consequência:
  **reimportar a mesma planilha grava de novo toda linha sem CPF.** Se uma
  importação parou no meio, tire as linhas já gravadas antes de repetir — não
  há exclusão para desfazer cadastro em dobro, só arquivar.
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
  > tela pede para remarcar. Editar um atendimento que **continua** cancelado
  > ou ausente não passa pela conferência — ele não ocupa a vaga
  > (`NAO_OCUPAM_A_VAGA`, `acoes/agenda.ts`) — e salva mesmo com o horário já
  > reocupado.
- **A situação não é máquina de estados rígida.** A interface oferece só os
  caminhos que fazem sentido (`PROXIMAS_SITUACOES` em
  [`src/lib/atendimento.ts`](src/lib/atendimento.ts)), mas **o servidor aceita
  qualquer situação válida** — um "concluído" clicado errado precisa ter volta.
  Cancelado e ausente reabrem como agendado. Na tela, hoje: "Não compareceu"
  só aparece a partir de `confirmado`; Cancelar e Não compareceu pedem
  confirmação do navegador (`window.confirm`); e **`concluido` não tem botão
  nenhum** — a ação aceitaria a volta, mas nenhuma tela a oferece. O
  Relacionamento também muda a situação (`confirmarPelaLista`), só de
  `agendado` ou `aguardando_confirmacao` para `confirmado` ou
  `aguardando_confirmacao`.
- **Toda mudança é gravada por gatilho** em `atendimento_situacoes`, com autor e
  hora.
- Hora é lida como **hora de parede da clínica** (`instanteNaClinica`), nunca do
  servidor.
- Duração: inteiro entre 5 e 480 minutos.
- **Filtro por profissional (`?profissional=<uuid>`).** O seletor só aparece
  com duas ou mais profissionais ativas. Id torto ou desconhecido abre a
  agenda de todas, sem erro. As setas de dia, "Voltar para hoje" e "Marcar
  atendimento" mantêm o filtro, e `/agenda/novo?profissional=` já chega com a
  profissional escolhida (se estiver no catálogo). Quem lê `dia` e
  `profissional` da URL é só `components/agenda/parametros-agenda.ts`.
- **Navegação de dia.** O campo de data navega sozinho com espera de 500 ms
  (`ESPERA_NAVEGACAO_MS`) e só com data válida (`dataValida`): enquanto a
  pessoa digita, a tela não pula de dia a cada tecla. O bloco é um `form method="get"` com o botão
  "Ver", que funciona sem JavaScript.
- **Saída do formulário de atendimento é "Voltar sem salvar"**, não
  "Cancelar": na edição, "Cancelar" se confundiria com cancelar o atendimento.
- **Foco depois de mudar a situação.** O botão clicado some com a situação
  antiga ("Confirmar" vira "Iniciar"); `FocoAposAcao`
  (`components/agenda/foco-apos-acao.tsx`) leva o foco ao próximo botão do
  bloco e anuncia a nova situação ao leitor de tela, em vez de deixar o foco
  cair no `<body>`.

As sete situações: `agendado`, `aguardando_confirmacao`, `confirmado`,
`em_atendimento`, `concluido`, `cancelado`, `ausente`.

### 8.3 Configurações → Procedimentos

- **Todo mundo vê a tabela; só a administradora escreve** — na página e de novo
  na ação, espelhando as políticas `procedimentos_insercao` e
  `procedimentos_edicao` (0019; até então, `procedimentos_escrita`).
- **Procedimento não se apaga.** O histórico aponta para ele
  (`on delete restrict`). *"Tirar da agenda"* esconde das novas marcações — o
  formulário de marcar só lista procedimentos e profissionais ativos — e
  preserva o passado. Na **edição** de um atendimento, o procedimento e o
  profissional dele continuam na lista mesmo inativos; sem isso, desativar
  travaria a edição de todo atendimento antigo. É regra de interface: nem a
  ação nem o banco recusam um procedimento ou profissional inativo que chegue
  no POST.
- **Editar muda o padrão, não o passado.** Duração e valor gravados em cada
  atendimento são cópias do momento da marcação.
- **Regras do catálogo** (`validarProcedimento`, `lib/procedimento.ts`): nome
  com 2 caracteres ou mais; duração de 5 a 480 minutos; valor até
  R$ 1.000.000,00 (vazio vira zero); retorno sugerido de 1 a 3650 dias, ou
  vazio. O banco só exige `duracao_min > 0`: **o teto de 480 minutos é da
  aplicação**, e é dele que vem a janela de 8 horas da agenda (§8.2). Subir o
  teto sem mexer na janela não deixa passar choque — o gatilho da 0021 compara
  o intervalo inteiro —, só troca a mensagem com o nome de quem ocupa pela do
  banco.
- **Não há tela de equipe.** `profissionais` só se preenche por SQL (o card
  "Equipe" de `/configuracoes` está "em breve"). Sem profissional ativa, "Quem
  atende" fica vazio e a agenda não marca nada. `npm run dados:limpar` apaga as
  profissionais e os procedimentos de exemplo: ao sair da demonstração,
  cadastre a equipe real pelo SQL do projeto, e não marque atendimento real com
  profissional ou procedimento de exemplo — o `on delete restrict` de
  `atendimentos` faria a limpeza falhar. Para tirar alguém da agenda,
  `ativo = false`, nunca DELETE.
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
- **A tabela de taxas se edita no lugar.** A administradora muda operadora,
  tipo, parcelas e percentual da própria linha, mesmo já usada (a lista mostra
  "aplicada em N vendas"). A venda guarda a cópia, mas `taxa_cartao_id` passa a
  apontar para dados diferentes, e a tela "Alterar taxa" mostra o percentual
  **atual** da linha como "Taxa padrão da tabela". Linha não se apaga: desativa
  e reativa, e o índice único (operadora, tipo, parcelas) vale só entre as
  ativas — reativar em conflito é recusado com mensagem. O financeiro vê a aba
  e não edita; o formulário de venda só oferece taxas ativas.
- **Taxa manual exige justificativa**, fica marcada na venda e **não toca a
  tabela padrão**. Restrita ao financeiro e à administradora — verificado também
  dentro de `venda_registrar`.
- **Gravação composta é função do banco.** `venda_registrar` e
  `venda_alterar_pagamento` fazem tudo ou nada. O cliente HTTP não tem
  transação: se a segunda escrita falhasse, sobraria meia venda.
- **Um envio, uma venda.** O formulário de venda gera uma chave (uuid) uma vez
  por tela aberta e a manda em todo envio (`chave_envio`); `registrarVenda`
  repassa como `p_chave`. Duplo clique, Enter repetido ou reenvio do navegador
  devolvem a venda já criada, sem segunda venda nem segundo recebimento (0028).
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

**A diferença do ajuste é `novo líquido − valor_recebido`** — contra o que de
fato entrou, não contra o líquido anterior —, e diferença zero não gera ajuste.
Ajustes anteriores não entram na conta. Consequências: com recebimento em
divergência, a primeira alteração absorve a divergência; e uma segunda
alteração depois da confirmação não desconta o ajuste da primeira (de 6% para 3% e de
volta para 6% deixa +R$ 30,00 num caixa que não mudou, numa venda de
R$ 1.000,00). As telas Alterar forma e Alterar taxa mostram o ajuste que o
banco vai gravar (`novo líquido − valor_recebido`); para recebimento
cancelado, nada.

> Quem decide isso é a função SQL `venda_alterar_pagamento` (migração 0008,
> recriada na 0020 e `SECURITY DEFINER` desde a 0023), não a aplicação.
> `decidirEfeito()` em `src/lib/venda.ts` descreve a mesma regra: as telas de
> alteração o usam **só para mostrar** o efeito, e os testes (`venda.test.ts`)
> o usam como especificação. Alterá-lo não muda o que o banco faz — mude os
> dois juntos.

**Situações do recebimento:** `previsto` · `pendente` · `recebido` ·
`recebido_divergencia` (valor efetivo ≠ líquido previsto — **decidido pelo
sistema, não por opinião**) · `cancelado`.

> **`situacao` não é uma coluna solta.** CHECK constraints a amarram a outras
> colunas: `recebimento_coerente` exige que `recebido`/`recebido_divergencia`
> tenham `recebido_em` **e** `valor_recebido`, e que as demais situações tenham
> os dois nulos; `despesa_coerente` faz o mesmo com `paga`/`pago_em`. O banco
> recusa um UPDATE que leve a situação para `recebido`/`recebido_divergencia`
> (ou `paga`) sem esses campos, ou que a tire de lá sem limpá-los. Entre
> `previsto`, `pendente` e `cancelado` basta a situação — é o que
> `mudarSituacaoRecebimento` faz. Ao cruzar essa fronteira, escreva o conjunto.

**Ciclo do recebimento na tela.** Nasce `previsto`, ou `recebido` quando o
pagamento foi no balcão. `pendente` é marcado à mão pelo financeiro ("Marcar
como pendente" / "Voltar para previsto"); nenhuma rotina muda a situação por
data — o "já venceu" dos indicadores é derivado (`vencimento < hoje`).
**Cancelar é terminal na interface**: nenhuma ação sai de `cancelado`, e a
venda não ganha outro recebimento, porque `recebimento_da_venda_criar` recusa
quando já existe qualquer um. A venda continua somando em "Total vendido" e
aparece no filtro "Canceladas".

**Confirmação errada não tem desfazer.** O confirmado é imutável para qualquer
sessão (0020), e nenhuma ação corrige valor ou data de uma confirmação. Desde
a 0023 o banco também recusa, com sessão, confirmação com data futura (fuso da
clínica) e "recebido" com valor diferente do líquido previsto. Campo de valor
**vazio** é recusado ("Informe o valor que entrou"); **zero digitado** continua
aceito — a tela avisa a divergência e fica gravado `recebido_divergencia` com
R$ 0,00 (recusar zero é regra nova, decisão em aberto). Percentual vazio (taxa
manual, alteração de taxa, tabela de taxas) e valor original vazio também são
recusados: quem quer zero digita 0. Consultas que somam `numeric` usam
`somaEmCentavos`/`centavosParaReais` (`lib/moeda.ts`), não `reduce` com
`Number()`. O único caminho que gera ajuste
é alterar a forma ou a taxa da venda. Como corrigir é decisão em aberto (§10).

**Situações da despesa:** `pendente` · `paga` · `cancelada`. **"Vencida" é
derivada** (pendente com prazo no passado), nunca gravada — estado gravado
envelheceria errado à meia-noite.

A lista do mês traz também as **pendentes atrasadas de meses anteriores**.
Pagar pede a data (não futura) e aceita forma opcional; pagar e cancelar só
valem a partir de `pendente`; reabrir volta `paga` ou `cancelada` para
`pendente` e apaga `pago_em` e a forma — por isso pede confirmação do
navegador, dizendo a data e a forma que se perdem e que o mês sai de
"despesas pagas" e do resultado de caixa. **Editar vale em qualquer situação,
inclusive paga**: muda valor e vencimento — e, com ele, a competência — de
despesa de mês já fechado. A mudança fica na auditoria (0019), mas o número
do mês fechado muda.

**Os números:**

```
resultado de caixa = líquido recebido − despesas pagas
líquido recebido   = valor efetivo dos recebimentos confirmados + ajustes
a receber          = estoque, não fluxo: tudo que ainda não entrou,
                     de qualquer período
```

Os demais cartões da visão geral do Financeiro (`consultas/painel-financeiro.ts`):

```
total vendido      = Σ valor_final das vendas com data_venda no mês
                     (inclui venda cujo recebimento foi cancelado)
total recebido     = Σ valor (bruto) dos confirmados com recebido_em no mês
taxas de cartão    = Σ taxa_valor desses mesmos confirmados
despesas pagas     = Σ das pagas com pago_em no mês
despesas pendentes = Σ das pendentes com vencimento antes do fim do mês,
                     inclusive as atrasadas de meses anteriores
```

Com divergência ou ajuste no mês, total recebido − taxas ≠ líquido recebido,
porque o líquido é o que de fato entrou.

**Lucro não entra.** A regra não foi definida pela clínica — falta decidir o que
entra na conta (valor bruto, custo de produto, comissão, impostos, taxa). Não
invente um indicador de lucro.

**Permissões do módulo:**

| Ação | Recepção | Financeiro | Administradora |
|---|:--:|:--:|:--:|
| Registrar venda com taxa padrão | ✓ | ✓ | ✓ |
| Registrar venda já recebida (pagamento no balcão) | ✓ | ✓ | ✓ |
| Confirmar recebimento, lançar despesa | — | ✓ | ✓ |
| Alterar forma de pagamento / taxa (com motivo) | — | ✓ | ✓ |
| Configurar a tabela de taxas | — | — | ✓ |

**"Já recebido" na venda é de todo perfil** — o pagamento no balcão, em
dinheiro ou PIX, é decisão registrada no cabeçalho da 0020. O recebimento
nasce `recebido` por `private.recebimento_da_venda_criar`, com
`valor_recebido` igual ao líquido da venda e a data informada; a ação recusa
data futura, o banco não. Por construção nunca nasce em divergência e, dali em
diante, é imutável como qualquer confirmado. O que a recepção não faz é
confirmar depois um recebimento previsto.

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
  *tirada*, não quando foi enviada. Ela **não pode ser no futuro** (no dia da
  clínica): `motivoDataInvalida`, conferida por `registrarImagem` e
  `atualizarImagem` — e antes, pelo formulário de envio, para nenhum arquivo
  subir com data que o servidor vai recusar. E, desde a 0027, o banco:
  `imagem_registrada_conferida` recusa, com sessão, data de captura depois de
  hoje no INSERT e no UPDATE da data.
- **O caminho tem forma obrigatória:** `<prontuario_id>/<uuid>.<ext>`, com CHECK
  no banco. Sem isso uma linha poderia apontar para o arquivo de outra paciente.
  E o **nome original do arquivo fica fora do caminho, de propósito**: costuma
  trazer o nome da paciente ("maria-antes.jpg"), e o caminho aparece em log, em
  URL assinada e no painel do Storage. Ele fica na coluna `nome_original`,
  atrás da RLS. Não "melhore" o caminho para ficar legível no painel.
- **Existe uma quarta porta.** A RLS da tabela não protege o arquivo: quem sabe
  o caminho fala com `storage.objects`, que tem política própria. A 0011 criou
  as primeiras políticas de Storage do projeto; desde a 0022 são três —
  leitura, envio e eliminação, todas só para a administradora. **Não há
  UPDATE**: a aplicação nunca sobrescreve (envia com `upsert: false`). Não
  recrie essa política. **Toda tabela nova que use Storage precisa das suas.**

##### O que a 0022 fechou no prontuário e nas fotos

As funções da 0010–0012 já faziam a coisa certa; a tabela é que aceitava o que
chegasse pela API. Desde a 0022 (ver o aviso da §4), o banco confere por
qualquer porta:

- **A paciente do prontuário não muda:** UPDATE só em `atendimento_id`,
  `data_registro` e `titulo`.
- **Versão nova é conferida** por `prontuario_versao_conferida`: precisa ser a
  próxima da sequência, e autor, hora e `exemplo = false` são escritos pelo
  banco, não por quem insere.
- **O caminho tem forma exata** (`prontuario_imagens_caminho_forma`), e apagar
  a linha da foto exige o motivo já registrado (`imagem_so_sai_com_motivo`).

Os gatilhos deixam passar quando não há sessão: é a manutenção pelo SQL do
projeto.

**Limites, e onde valem.** Acima do limite, a ação **recusa com mensagem por
campo** (`validarProntuario`); ela não corta mais o texto em silêncio, o que
perdia o fim de uma evolução sem ninguém saber. `normalizarProntuario` só apara
espaços. O formulário usa os mesmos números (`LIMITES_PRONTUARIO`) no
`maxLength`. Com par no banco: título com 3 caracteres ou mais
até 160 (CHECK `prontuarios_titulo_maximo`, 0025), motivo da nova versão de 5 a
240, cada campo clínico até 6.000, legenda até 300, motivo da eliminação de 10
a 500. Só na aplicação: 12 fotos por envio, dimensões até 30.000 px (fora
disso gravam nulas, sem recusar), nome original cortado em 200, 20 prontuários
por página e busca que casa no máximo 50 pacientes. Mudou um número de um
lado, mude o par do outro.

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

A auditoria guarda **a linha inteira** (`to_jsonb`) a cada INSERT, UPDATE e
DELETE. Depois de uma eliminação continuam em `auditoria.dados`, sem a imagem,
o `nome_original` (que costuma trazer o nome da paciente) e cada legenda que a
foto já teve; `prontuario_imagem_eliminacoes` repete caminho, `nome_original` e
data da captura. O texto clínico de cada versão do prontuário também fica
copiado na auditoria. É isso que a clínica diz à titular que pedir a
eliminação: sai a imagem, não o registro de que ela existiu.

Três coisas que a implementação respeita, e que precisam continuar valendo:

1. **Apagar a linha não apaga o arquivo.** São dois lugares, e a ordem importa:
   **arquivo primeiro**. Invertida, se a remoção do arquivo falhar sobra um
   objeto órfão no bucket — dado de saúde sem dono e sem rastro. Quando o
   Storage recusa, `eliminarImagem` para ali e não apaga nada.
2. **`arquivada` não é eliminação.** Ela tira da tela e preserva (foto tremida,
   duplicada, enquadramento errado). Eliminar é DELETE, e só a pedido da
   titular, com motivo (mínimo de 10 caracteres, guardado) e confirmação
   marcada — as duas conferidas de novo no servidor.
3. **O módulo sobrevive a um banco sem as migrações.** Sem as tabelas da
   0010/0011, `/prontuarios` mostra o card "Migração pendente" (§6, regra 11) e
   a busca global, "Prontuários indisponíveis no momento.". Sem a 0012, a
   galeria funciona sem o histórico de eliminações — e `eliminarImagem`
   confere que `prontuario_imagem_eliminacoes` existe **antes** de remover o
   arquivo: sem isso, o arquivo seria destruído e o registro da eliminação
   falharia, perdendo justamente a imagem que o registro deveria explicar.

##### O arquivo não passa pela ação de servidor

O navegador manda o arquivo direto para o Storage; a ação de servidor grava
só a linha. **Não é otimização:** a Vercel corta o corpo de uma requisição de
função em 4,5 MB e o bucket aceita 10 MB — uma foto no meio dessa faixa
morreria com um erro de plataforma que a tela não teria como explicar.

Quem autoriza o envio é a política `prontuario_imagens_storage_envio` (criada
na 0011, refeita na 0022): só a administradora escreve no bucket, e só com nome
no formato `<uuid>/<uuid>.(jpg|png|webp)`, em hexadecimal minúsculo. É a mesma
barreira, em outro lugar.

Duas consequências que a implementação carrega:

- **O servidor não acredita no cliente.** `registrarImagem` lê tamanho e tipo
  de volta do objeto (`storage.list`) antes de gravar a linha. O navegador
  poderia declarar qualquer coisa, e uma linha que descreve um arquivo
  diferente do que está lá é pior do que nenhuma linha. A ida ao Storage
  também confirma que o upload chegou. Depois, **relê os primeiros bytes** do
  objeto (`download`) e confere o tipo pelo conteúdo (`tipoPeloConteudo`:
  assinatura de JPEG, PNG e WebP); a extensão do caminho tem de bater com ele.
  "foto.jpg" que é outra coisa é removido antes de existir linha. Desde a
  0028 o banco também exige o objeto no bucket, no caminho exato, e escreve
  `tipo_mime` e `tamanho_bytes` a partir dos metadados do Storage
  (`private.imagem_nasce_do_arquivo`) — quem chama a API direto não descreve
  um arquivo que não existe. A conferência dos primeiros bytes continua só na
  ação: o banco não lê o conteúdo.
- **Se a linha falha, o arquivo sai junto.** A ordem de criação é o inverso da
  de eliminação, pelo mesmo motivo: arquivo sem linha é dado de saúde sem dono.
  Vale para toda recusa depois do upload — data inválida, `storage.list` que
  falha, tipo que não confere, INSERT recusado. **Uma exceção, de propósito:**
  quando a ação não consegue ler se aquele caminho já tem linha, o arquivo
  **fica** — apagar o arquivo de uma foto já registrada não tem volta, e um
  órfão ainda aparece na Conferência das fotos. Também sobra arquivo quando a
  sessão cai entre o upload e a ação.
- As fotos sobem **uma de cada vez**. A `ordem` de cada foto vem da maior já
  gravada; em paralelo, duas do mesmo dia leriam o mesmo número.
- **Falha parcial deixa rastro no log**, com frase fixa para procurar:
  `fotos: arquivo órfão no bucket (<motivo>)` quando a linha não foi gravada e
  nem o arquivo pôde ser removido (ou, com o motivo "registro não conferido",
  quando a remoção nem foi tentada), e `fotos: linha sem arquivo após
  eliminação` quando o arquivo saiu do bucket e o registro da eliminação
  falhou (registrado mesmo sendo P0001: o que importa é a inconsistência).
- **Conferência das fotos** (`/configuracoes/fotos`, só a administradora):
  lista as duas sobras que a função `prontuario_imagens_reconciliar()` (0024)
  aponta — registro sem arquivo e arquivo sem registro — com link para o
  prontuário. **Só leitura, nenhum botão apaga**: registro sem arquivo sai
  pela eliminação com motivo, no prontuário; arquivo sem registro não tem
  saída pelo sistema (decisão do dono, no painel do Supabase). Item com menos
  de uma hora aparece como "envio possivelmente em andamento": o arquivo sobe
  antes de a linha ser gravada.

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
assinado, que a clínica emite e colhe no módulo Documentos (§8.7) — decidido
em 29/08/2026 que os dois módulos **não se acoplam**: a paciente assina o
termo e tira as fotos, sem o sistema ligar uma coisa à outra. Consequência a assumir: não há, no banco,
registro de qual termo autorizou qual foto. Se isso passar a ser exigido, entra
por migração nova.

### 8.6 Visão Geral

Agrega tudo: indicadores do dia e do mês, linha do dia com marcador "agora",
pendências, próximos retornos, resumo financeiro e aniversariantes.

- O indicador "atendimentos de hoje" **desconta os cancelados**. (Falta confirmar
  com a clínica se é assim que ela pensa — ver seção 10.)
- A Linha do Dia hoje se ajusta aos atendimentos existentes, porque o **horário
  de funcionamento ainda não foi definido**.
- **Os números** (`server/consultas/indicadores.ts`; nenhum é calculado no
  componente): "Confirmados" conta só `confirmado` de hoje; "Confirmações
  pendentes", só `aguardando_confirmacao` de hoje (`agendado` não entra);
  "Aguardando retorno" conta **retornos**, não pacientes, que não estão
  `agendado` nem `recusado`, de qualquer data — inclusive meses adiante;
  "Recebido no mês" soma `valor_recebido` dos confirmados no mês, **sem
  ajustes**; "A receber" é estoque. As bases diferem das do Financeiro (§13).
- **Recortes:** pendências, as 6 primeiras por prioridade e prazo — "Ver todas"
  leva ao Relacionamento, que não lista anamnese, termo nem pagamento; retornos,
  5 pelo progresso na janela de contato; aniversariantes, 5 na ordem do dia do
  mês, inclusive quem já fez.
- **Linha do Dia:** vazio de 15 minutos ou mais vira "N min sem atendimento";
  cancelados e ausentes aparecem esmaecidos e riscados. O marcador "agora" é
  componente de cliente: não renderiza no servidor e reavalia a cada 60 s — é o
  que evita divergência de hidratação. Não mova esse cálculo para o servidor.

### 8.7 Documentos e Contratos (migração 0013)

Contrato, termo, orientação e anamnese: cadastrar o modelo, emitir para a
paciente e colher a assinatura (na anamnese, as respostas). A seção cobre as
migrações 0013 a 0018, com ajustes na 0019 e na 0022. Rota `/formularios`;
modelos em `/formularios/modelos`.

Contrato e anamnese têm naturezas diferentes, e o modelo separa as duas:

- **Modelo** — texto que se corrige. Versionado, com autor, data e motivo em
  cada versão, no mesmo desenho de `prontuarios` + `prontuario_versoes`.
- **Documento emitido** — depois de emitido, **não muda mais**. Correção gera
  documento novo que referencia o anterior (mesma paciente). O anterior vira
  `substituido` só se ainda estava `emitido`; assinado continua `assinado`;
  cancelado ou já substituído não se corrige (`documento_emitir` recusa e manda
  corrigir a partir do documento em vigor). Na ficha, "Emitir correção" leva a
  `/formularios/novo?paciente=…&corrige=…` e aparece também em documento
  cancelado — quem recusa é o banco. O novo mostra "Este documento corrige um
  anterior"; o antigo não mostra o caminho inverso. Anamnese corrigida nasce
  com as perguntas da versão vigente e sem respostas.

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

Nas outras duas camadas: a emissão não oferece modelo de anamnese a quem não é
administradora (`modelosParaEmissao`), e `emitirDocumento` recusa com a razão
antes de chamar o banco. Na lista de modelos, a contagem de emitidos de um
modelo de anamnese é `null` para esses perfis e aparece como "—" — a RLS
esconderia os documentos, e zero seria mentira (§5).

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

**Mas isso vale para a aplicação, não para o banco.** As funções recebem IP e
dispositivo por parâmetro, e `documento_assinar_por_link` é executável por
`anon`, com a chave pública: quem tem o token e a data chama a função direto e
grava o IP que quiser. O banco não distingue a server action de uma chamada
direta, e o IP que o PostgREST enxerga, na chamada da aplicação, é o do
servidor. No canal `link`, trate IP e dispositivo como **informados**, não como
prova (§13, Dívidas conhecidas).

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
   "dez mais o tamanho do pool de conexões". São dez erros **seguidos**, não
   dez no total: `documento_para_assinatura` zera a contagem sempre que a data
   confere, e assinar e responder zeram ao terminar com sucesso. O limite freia
   a varredura; quem a impede é o token de 256 bits, o prazo e a revogação.
5. **Sem data de nascimento cadastrada, não nasce link.** `data_nascimento` é
   opcional no cadastro; emitir link para quem não tem a data daria um link
   protegido só pelo token. A criação recusa e manda cadastrar.

A tela também não ensina nada útil a quem não deveria estar ali. Link
inexistente, revogado, expirado e bloqueado dão respostas distintas — isso
revela que um token existe, mas só a quem já o tem, e 256 bits não se
adivinham. Antes da data de nascimento sai só o tipo do documento; "data
incorreta" é a única resposta que diz o que houve, porque quem errou a própria
data precisa corrigir.

O contrato das funções públicas: todas devolvem `nao_encontrado`, `revogado`,
`expirado`, `bloqueado` ou `ok`; as três que recebem a data acrescentam
`data_incorreta` (conta um erro); `ja_assinado` sai do estado, da abertura e da
assinatura; `indisponivel`, quando o documento foi cancelado ou substituído, ou
quando o tipo não cabe (anamnese não se assina, contrato não se responde);
assinar acrescenta `nome_invalido` e `cpf_invalido`, e responder,
`respostas_invalidas`. A aplicação acrescenta `falhou`, para erro de
infraestrutura ("o link continua valendo"). `documento_link_estado` devolve
também o `tipo`, antes da data, e mais nada.

#### Envio do link

O painel mostra o endereço com **Copiar** e, quando o telefone cadastrado
serve (`numeroWhatsapp`: 10 ou 11 dígitos, ou 12/13 começando com 55),
**Enviar pelo WhatsApp**: um link `https://wa.me/55<número>?text=<mensagem>`
que abre a conversa com a mensagem pronta (`mensagemDoConvite`). A validade
dita na mensagem é a do link efetivamente criado (a gravada no banco, assim que
a página revalida), não a que está no seletor na hora do clique. Quem aperta
enviar é a pessoa; o sistema não manda mensagem. O canal é gravado **no
clique** (`registrarCanalDoLink`, grant de coluna da 0015) como
`WhatsApp (11) 91234-5678`; copiar não registra nada. Desde a 0022, a CHECK
`documento_links_canal_formato` só aceita vazio ou esse formato, e a
verificação de identidade da assinatura por link é escrita pelo banco a partir
dele. **Canal novo (e-mail, SMS) exige migração que amplie a CHECK.**
`registrarCanalDoLink` não devolve nada à tela (é disparada no clique, sem
esperar), mas lê o erro do UPDATE e o registra no log ("assinatura: registrar
canal do link"); um canal fora do formato é recusado antes, também com log. A validade vai de 1 a 90 dias no banco; a tela oferece 7,
15 ou 30.

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
escolhe 7 dias ao gerar o link — a validade é do link, não da emissão.
**Revogar depois da assinatura:** a ficha do documento assinado mostra o cartão
"Via da paciente pelo link" (`link-da-via.tsx`) enquanto houver link vivo, com
o botão **Revogar link da via** (confirmação antes do clique). Revogar não mexe
na assinatura: fecha só a porta de leitura, e o endereço passa a responder
"Link cancelado". Não tem volta pelo sistema — `documento_link_criar` só aceita
documento `emitido`. Coberto pelo E2E (`e2e/assinatura.spec.ts`), inclusive no
WebKit.
Cancelado e substituído continuam sem corpo — não há via de documento que
deixou de valer.

A via diz por onde a assinatura entrou: `documento_para_assinatura` devolve
`assinado_canal` (0027), e a forma impressa é "presencial, na clínica" para
`balcao` e "à distância" para `link` — o link também serve para a paciente
guardar a cópia do que assinou no balcão.

**O arquivo sai pela impressão do navegador**, não por biblioteca de PDF: o
botão chama `window.print()` e a pessoa escolhe "Salvar como PDF". Funciona em
todo aparelho e evita o sistema passar a manter paginação de contrato longo. O
bloco `@media print` do `globals.css` é quem faz isso valer — `.folha` é o que
sai no papel, `.sem-impressao` é o que some, `.folha-texto` perde a rolagem
(senão o papel sairia cortado no mesmo ponto da tela) e `.folha-evidencias` não
se parte entre páginas.

> **Links assinados antes da 0016 continuam revogados.** A migração muda o
> comportamento daqui para frente; ela não ressuscita o que já foi fechado.

A troca para Autentique, ZapSign ou Clicksign está **prevista no modelo de
dados, não no código**: `documento_assinaturas` já tem `provedor`,
`referencia_externa` e `url_comprovante`, vazios enquanto for interna. Não há
camada de conector — as ações chamam `documento_assinar` e
`documento_assinar_por_link` direto —, e desde a 0022 o gatilho
`assinatura_confere_documento` grava `provedor = 'interno'` (e zera os campos
externos) em toda assinatura feita pela sessão de um perfil. Como a
`service_role` não entra na aplicação, um conector vai precisar de função
própria no banco, por migração.

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

O autor, porém, só aparece na consulta. Quem escreve é o banco (gatilho
`campo_resposta_autor`, 0027): quando a resposta muda, `respondido_em = now()`
e `respondido_por = auth.uid()` — mas só quando o UPDATE roda como
`authenticated`. Pelo link, `respondido_por` e o `ator_id` da auditoria ficam
nulos — a paciente não tem perfil —, também quando ela corrige o que foi
respondido na consulta, e também quando ela abre o link num navegador com
alguém da equipe logado (o tablet do balcão). Duas travas garantem isso: o
gatilho decide por `current_user`, não por `auth.uid()` (dentro da função do
link, que é DEFINER, o usuário é a dona da função, enquanto o JWT ainda seria
o da funcionária — o mesmo critério de `assinatura_confere_documento`, 0022);
e as três ações públicas de `acoes/assinatura-link.ts` falam com o banco por
`clienteAnonimo()` (`lib/supabase/server.ts`), sem os cookies da sessão, para
que a auditoria também não registre a funcionária. Ator nulo em `documento_campos` é a
paciente pelo link (ou manutenção direto por SQL). E a auditoria guarda a linha
depois da mudança, não um "antes e depois": o valor anterior é a entrada
anterior do mesmo registro.

**Sete tipos de campo:** `texto`, `texto_longo`, `sim_nao`, `escolha_unica`,
`escolha_multipla`, `data`, `numero`. As perguntas moram em
`modelo_documento_versoes.campos` (jsonb) porque **versionam junto com o
texto** — uma versão do modelo é um enunciado e um conjunto de perguntas, e
separá-los permitiria as duas coisas divergirem.

Cada tipo é conferido no banco. `private.campos_validos` valida a forma das
perguntas na criação do modelo e em cada nova versão. Cada resposta passa por
`private.resposta_de_campo` nas duas funções de resposta — tudo ou nada — e
pelo gatilho `campo_resposta_valida` em qualquer UPDATE: alternativa existente
(inclusive na escolha múltipla, que grava em `respostas` e o CHECK não vê) e
data que existe de fato (a regex sozinha aceitaria 31/02). O CHECK
`documento_campos_resposta` continua como última barreira para o valor único.

**Anamnese não passa a `assinado`.** Fica em `emitido` enquanto não for
cancelada ou substituída por uma correção — e aí para de aceitar resposta: a
ficha mostra as respostas só para leitura, sem Salvar, dizendo por quê.
"Respondida" é **derivada** da contagem de obrigatórias com resposta — estado
gravado envelhece, como "vencida" na §8.4. Na tela o rótulo de `emitido` vira
"Em preenchimento", por `rotuloDaSituacao`.

`documento_assinar_por_link` recusa anamnese explicitamente, mesmo a tela nunca
oferecendo: defesa em profundidade.

**Uma quarta função pública.** `documento_responder_por_link` é a paciente
respondendo de casa, e continua valendo a regra: função, nunca tabela.
`documento_campos` tem `revoke all ... from anon` como todas as outras.

**Perguntas fora da anamnese.** O editor aceita perguntas em qualquer tipo de
modelo ("Contrato, termo e orientação costumam não ter perguntas"), e a emissão
as congela em `documento_campos`. Mas só a anamnese as mostra, na ficha e no
link: num contrato ficam gravadas e invisíveis, `documento_responder_por_link`
recusa (`indisponivel`), e só `documento_campos_responder` as alcança — pela
API e por qualquer perfil ativo, porque a política de `documento_campos` só
restringe à administradora quando o documento é anamnese.

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
numa migração só repetia. Agora cada tabela declara o que `authenticated` faz.
O UPDATE por coluna, onde o resto da linha é congelado, veio na 0022: em
`documentos`, só `situacao` e `motivo_cancelamento`; em `documento_campos`, só
as colunas de resposta; em `prontuarios`, só atendimento, data e título. Em
`documento_links`, só `canal_envio`, desde a 0015 (a 0019 repete o grant depois
do `revoke all`).

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
consulta é `security invoker` e exige sessão (na anamnese, a RLS só deixa a
administradora); a do link é
`security definer` e exige token mais data de nascimento. Dar poder de definer
a quem já tem sessão seria emprestar privilégio sem precisar.

**Limites.** Corpo do modelo até 100.000 caracteres; até 120 perguntas por
modelo; enunciado e texto de apoio até 300; alternativas de uma pergunta de
escolha: o banco aceita de 1 a 50, com até 200 caracteres, e a tela guarda até
40, com até 160; resposta de texto até 4.000; número até 30 caracteres com até
4 casas decimais (a tela, 20); escolha múltipla até 50 marcações; um envio de
respostas até 200 perguntas e 200 mil caracteres. Onde tela e banco diferem,
vale o banco.

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
- Retornos têm data informada pela equipe. O Relacionamento **não** calcula
  período clínico nem recomenda quando chamar a paciente. A equipe registra a
  situação e pode reabrir o acompanhamento. **Exceção a conhecer:** o painel
  "Próximos retornos" da Visão Geral (§8.6) usa
  `procedimentos.retorno_sugerido_dias` (90 quando não há) para desenhar uma
  faixa em volta da mesma data — "No período" a partir de 85% do intervalo,
  "Passou do período" a partir de 115%. Os mesmos retornos aparecem com regras
  diferentes nas duas telas. Os intervalos são demonstrativos (§10, item 2).
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
- **O registro de contato é reconhecido pela coluna `origem`** (0025):
  `contato_avaliacao` ou `contato_aniversario`; tarefa é `tarefa`, o default. A
  descrição virou só o texto que a equipe lê — mudá-la em `REGISTRO_CONTATO`
  (`lib/relacionamento.ts`) não esconde nada. Os registros gravados antes da
  coluna foram reconhecidos na própria migração pela regra de texto antiga
  (tipo + prefixo), só quando tinham a forma de registro (concluído, com
  paciente e hora). O banco garante: registro de contato é sempre concluído,
  com paciente e hora, avaliação é `pesquisa` e aniversário é `outro`
  (`pendencias_origem_coerente`) — por isso **não se reabre nem se cancela**,
  e `mudarSituacaoTarefa` só alcança `origem = 'tarefa'`; e **um por
  paciente, origem e dia da clínica** (`pendencias_contato_um_por_dia`): a
  ação confere antes e trata a recusa 23505 como "já registrado hoje". Os
  registros de aniversário ficam gravados, mas hoje nenhuma tela os mostra.
- **WhatsApp:** `telefoneParaWhatsApp()` tira o `55` inicial **só** quando o
  número tem 12 ou 13 dígitos, exige 10 ou 11 dígitos e prefixa `55`; fora
  disso a linha mostra "Sem telefone válido" e sobra "Copiar mensagem". Número
  de DDD 55 sem o código do país não perde mais o DDD. "Marcar como enviada" só habilita depois de abrir ou
  copiar — trava de interface, que a ação não confere.
- **Recortes:** a fila mostra até 5 tarefas e 5 retornos; as candidatas a
  avaliação vêm dos 100 atendimentos concluídos mais recentes; os convites
  registrados, dos 200 registros de contato mais recentes, filtrados no banco
  pela coluna `origem` (0025).

Desde a 0019, `pendencias` não tem política nem grant de DELETE e entrou na
auditoria (ver §1): o registro de um convite não se apaga pela API, e cada
mudança fica na trilha. Desde a 0025 ele não se reabre, não se cancela e não
troca de origem, mas a descrição e a hora (`resolvida_em`) continuam
**editáveis** pela API, então não é uma prova inviolável de contato. Se for exigida uma trilha imutável de contatos, isso
precisará de uma migração e tabela próprias.

## 9. Invariantes — o que nunca pode ser quebrado

Checklist rápido antes de comitar. Se sua mudança viola algum item, ou está
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
- [ ] Erro de banco virou mensagem em português por `mensagemDoBanco` (§6, regra 11) — nenhuma ação nova interpola `error.message` (o caso que sobrou, na importação, está no §13)
- [ ] Toda consulta lê o `error`; toda escrita confere que alcançou uma linha

**Arquitetura**

- [ ] Nenhum componente conversa com o banco direto (única exceção: o upload das fotos de evolução para o Storage, §6 regra 1)
- [ ] Consulta é `server-only`; ação é `"use server"`
- [ ] Toda escrita valida no servidor com a função de `lib/`; formulário que validar antes usa a mesma função
- [ ] Permissão verificada nas três camadas (interface, ação, banco)
- [ ] `revalidatePath` depois de escrever, inclusive `/`
- [ ] Estado de tela (busca, filtro, página, dia, mês) foi para a URL
- [ ] `tipos-banco.ts` regenerado se o banco mudou, e não editado à mão
- [ ] Regra nova ou bug corrigido ganhou teste; `npm test` passa
- [ ] Tela nova tem `<h1>`, não rola na horizontal em 320 px e entrou em `TELAS_DO_SISTEMA` (`e2e/apoio.ts`), que `telas.spec.ts` e `acessibilidade.spec.ts` percorrem

**Dinheiro**

- [ ] Cálculo em centavos inteiros, um arredondamento por operação
- [ ] Taxa descontada do líquido, nunca somada à paciente, nunca lançada como despesa
- [ ] Cópia congelada da taxa preservada na venda
- [ ] Tabela financeira nova sem política nem grant de DELETE (nenhuma das existentes tem, desde a 0019 — ver §8.4)
- [ ] Alteração pós-confirmação gerou ajuste, sem tocar o original
- [ ] Toda alteração de forma/taxa tem motivo e entrou no histórico

**Tempo e apresentação**

- [ ] Todo cálculo de dia passou por `lib/dates.ts`
- [ ] Nenhuma cor escrita fora de `globals.css` (a única exceção é o `themeColor` do layout raiz)
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
7. **Correção de confirmação errada.** Como corrigir valor ou data digitados
   errado ao confirmar um recebimento? Hoje não há caminho na interface (§8.4).
   Junto: aceitar ou recusar **zero digitado** na confirmação.
8. **Ajustes financeiros.** Descontar os ajustes já lançados numa segunda
   alteração pós-confirmação? Em que mês o ajuste entra (lançamento ou
   recebimento corrigido)? E a competência da despesa (hoje o mês do
   vencimento, provisório)?
9. **Vendas antigas sem recebimento em produção** (depois da 0023): criar
   recebimento, cancelar ou manter — caso a caso.
10. **Arquivos órfãos e fotos sem arquivo** achados pela reconciliação (dado de
    saúde, LGPD): quem elimina ou reenvia, e com que registro.
11. **Venda:** data no futuro permitida? Hoje não há barreira nem na ação nem
    no banco. (A idempotência do envio foi resolvida na 0028.)
12. **Importação:** CEP inválido recusa a linha (regra de `validarPaciente`)
    — ou a base antiga entra sem CEP? CEP de 7 dígitos (o Excel come o zero
    da frente) deve ser completado com zero? Completar também transforma um
    CEP do RJ com um dígito esquecido num de SP. Nome acima de 120 caracteres
    vira erro?
13. **Retornos:** trilha de transição entre situações (hoje tudo é permitido,
    menos regravar a mesma).
14. **Link de assinatura:** revogar depois de assinar é irreversível pelo
    sistema; reabrir a via exige decisão e migração. Token no caminho aparece
    no log da Vercel.
15. **Domínio final** (HSTS com `includeSubDomains`/`preload`) e liberar
    `vercel.live` na CSP só no Preview.
16. **IP e dispositivo da assinatura pelo link.** Hoje são declarados por quem
    chama (comentário das colunas, 0028). Conferir exige que o banco reconheça
    o servidor — um HMAC com segredo só do servidor, guardado no banco e
    conferido pela função pública: configuração nova em produção.
17. **Arquivo de foto no bucket sem linha** (`/configuracoes/fotos`):
    eliminar com motivo, religar a um prontuário ou manter. A 0012 cobre só a
    eliminação de foto **registrada** a pedido da titular; uma ação nova seria
    regra de LGPD e de guarda de prontuário.
18. **Autenticação em dobro por requisição.** O middleware já valida com
    `getUser()` e `usuarioAtual` repete a ida ao Auth. Com token ES256, a
    segunda poderia ser `getClaims()` (assinatura conferida localmente; a
    revogação continua no middleware), o que corta pela metade as idas ao
    Auth medidas no §2. Contraria a regra "sempre `getUser()`" (§6): só com o
    dono, e a regra reescrita junto.
19. **SLO de produção.** Os tetos de TTFB do orçamento (§2) refletem o Auth
    local no Docker do Windows; falta decidir a meta e medir na Vercel com o
    Supabase hospedado.
20. **Logs:** qual coletor, quanto tempo reter e quem recebe o alerta (§3);
    e se existe um nível de aviso separado do erro (hoje só `registrarFalha`).
21. **Subir para o Next >= 16.3.0 (próximo passo, rodada própria).** A tela
    que não se atualizava no build já está corrigida por
    `scripts/corrigir-ping-react.mjs` (§13); a subida tira essa correção do
    `postinstall`. Quando e como fazer (com `npm install`, build e E2E
    completos) é decisão do dono; o que muda está na §13, "Dependências".
22. **Números do dia divergem entre telas:** a Visão Geral mostra
    "Atendimentos de hoje" e "horários" com uma contagem, a Agenda com outra
    (cancelados e ausências à parte). Liga-se ao item 3: definido o que conta,
    as três telas usam o mesmo número.
23. **Proteção do branch `jamal-do-mal`:** exigir o job da CI
    (`.github/workflows/ci.yml`) como status check obrigatório. Hoje a
    proteção está ativa, mas sem checks exigidos: a CI roda e não barra o
    merge. É configuração do repositório no GitHub, do dono.
23. **Prontuário em atendimento futuro:** a ficha oferece "Registrar
    prontuário" em atendimento confirmado de data futura. Só a partir do dia do
    atendimento?
24. **Agenda:** abrir já filtrada pela profissional logada, quando existir o
    perfil Profissional (hoje abre com todas)? Esconder cancelados e ausências
    da lista (hoje aparecem, contados à parte)? Forma neutra de "Todas as
    profissionais" se a equipe tiver homens.
25. **Relacionamento, cartão "Convites de avaliação":** convite pendente não
    tem definição; `candidatasAAvaliacao` são as últimas 100 atendidas, não
    convites. Que número mostrar?
26. **Cartão-indicador:** hoje há três estilos (Visão Geral, Financeiro e
    Relacionamento). Qual vira o padrão antes de unificar.
27. **Despesa:** forma de pagamento obrigatória ao pagar? Hoje, forma fora da
    lista vira `null` (coberto por teste). Reabrir despesa ou taxa desativada
    só troca a situação, sem outra conferência.

Já decididas e **fechadas** — não reabra sem motivo novo: divisão de permissões
(três perfis), método de assinatura (interna; troca de provedor prevista só no
modelo de dados, §8.7), fuso
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
das pendências (navegam para o módulo) · telas de auditoria e de gestão de
usuários (não existem; ver §5).

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

**Só comite ou dê push quando o usuário pedir.** O repositório tem hoje **um
único branch, `jamal-do-mal`**, que é o branch padrão (`origin/HEAD`) — não
existe `main`. **Não crie branch nenhum** (nem `main`): o dono decidiu, em
23/09/2026, que o trabalho entra direto no `jamal-do-mal`. Como a CI então só
avisa depois do push (§2), rode os gates antes de comitar. Qual branch a Vercel publica
em produção é configuração do painel da Vercel, não do repositório
(`vercel.json` só fixa região e framework): confirme com o dono antes de supor
que um push publica.

### Ao mexer no banco

1. Escreva a migração nova (`00NN_nome_descritivo.sql`), com cabeçalho
   comentado explicando o **porquê** — é o padrão de todos os arquivos
   existentes.
2. Aplique no Supabase local (`npx supabase db reset`), rode
   `npm run test:banco` e acrescente ao `supabase/testes/permissoes.sql` o que a
   migração passou a garantir.
3. Se mudou tabela ou função pública, `npm run db:tipos:local` e
   `npm run typecheck`.
4. Atualize [`supabase/README.md`](supabase/README.md) (tabela de migrações) e
   este arquivo, se a regra mudou.
5. **Produção é com o dono do projeto** (§2): ele roda `npm run db:push` e
   `npm run db:tipos`, conferindo o `git diff` dos tipos. Agente não roda
   nenhum dos dois.

### Ao terminar um módulo

Atualize [`docs/overview-sistema.md`](docs/overview-sistema.md) com o que passou
a existir, o que saiu da lista de provisório e as decisões tomadas. É o documento
de produto — a memória de por que o sistema é como é.

---

## 13. Erros conhecidos e dívidas — não imite, não "conserte" em silêncio

Levantado por auditoria do código contra este documento em **28/08/2026** e
refeito, contra o schema efetivo e o código, em **22/09/2026** e
**23/09/2026**. O que foi corrigido fica registrado abaixo para ninguém tomar o
comportamento antigo por padrão.

### Resolvidos em 23/09/2026

| Era | Como ficou |
|---|---|
| Venda sem recebimento pela API (INSERT direto em `vendas`) | Sem INSERT/UPDATE direto em `vendas`, `venda_alteracoes` e `ajustes_financeiros`; as duas funções de venda viram `SECURITY DEFINER` com o perfil conferido na entrada (0023) |
| `dados:limpar` não cobria `vendas` nem `ajustes_financeiros` e parava no meio por FK | Um único bloco `do`, das filhas para as mães; exemplo apontado por dado real fica; dado clínico nunca sai; exercitado pelo `test:banco` (`supabase/README.md`) |
| Importação devolvia `erroDaLinha.message` cru | `mensagemDoBanco` + `registrarFalha` (`acoes/importar-pacientes.test.ts`) |
| Importação nunca gravava: o React 19 reiniciava o formulário e o arquivo voltava vazio | Envio pelo `onSubmit` (§8.1); coberto pelo E2E |
| Digitação perdida no seletor de paciente antes da hidratação | Corrigido (`seletor-paciente.test.tsx`) |
| `mudarSituacaoTarefa`, `mudarSituacaoRetorno` e `confirmarPelaLista` fora do contrato | `ResultadoAcao`/`FormularioDeAcao`, com condição de estado no UPDATE |
| Registro de contato do Relacionamento reconhecido pelo texto | Coluna `pendencias.origem` e índice de um por dia (0025) |
| `text-outline` (`#72767c`) abaixo de AA dentro de painel | Token escurecido para `#5f6369` (§7.4) |
| Revogar a via depois da assinatura não tinha tela; `registrarCanalDoLink` não lia o erro | Card `LinkDaVia` na ficha; canal validado e com log (§8.7) |
| Link público montado só pelo `Host` | `ORIGEM_PUBLICA` (§3), obrigatória em produção; `Host` validado só fora dela |
| Foto registrada sem conferir o arquivo; sobras entre Storage e tabela invisíveis | Bytes mágicos, extensão e tamanho conferidos; reconciliação só de leitura para a administradora (0024, §8.5) |
| Playwright só no Chromium; E2E de assinatura preso a setembro; importação, Relacionamento, procedimentos, fotos e busca sem E2E | Chromium + WebKit + iPhone 13; data lida da ficha; `modulos.spec.ts` e `permissoes.spec.ts` (§2) |
| 10 de 47 ações com teste de unidade | 44 de 47 (§2) |
| Sem CI | `.github/workflows/ci.yml` (§2) — ainda não executada no GitHub |
| Transbordo em 320 px na Visão Geral e em Despesas | Corrigido; `telas.spec.ts` confere 320 px |
| Venda duplicada por duplo envio | Chave do envio (`vendas.chave_envio`, `p_chave` em `venda_registrar`, 0028) |
| Foto registrada sem o arquivo no bucket, com tipo e tamanho declarados | Gatilho `private.imagem_nasce_do_arquivo` confere o objeto e lê os metadados do Storage (0028) |
| CSP com `'unsafe-inline'` em script e estilo | Nonce por requisição + `'strict-dynamic'`; `'unsafe-inline'` só em `style-src-attr` (§6) |
| Log em texto livre, difícil de filtrar | Uma linha JSON por falha, com `app`, `codigo` e `id` (§3) |
| `npm audit` com alertas (`postcss` do Next, `vercel` CLI, `vitest`) | Zero: `overrides` de `postcss` (8.5.x), Vitest 5, CLI da Vercel fora das dependências (use `npx vercel`) |
| Branch único sem proteção | `jamal-do-mal` recusa force push e exclusão, inclusive de administradores (§2) |
| `/recuperar-senha` com 178 kB de First Load JS | 109 kB: o cliente do Supabase carrega só no envio (§2) |
| Tela parada na versão anterior depois de `router.refresh()`/revalidação, só no build do Chromium | Ping perdido no `react-dom` do Next 15.5.x; `scripts/corrigir-ping-react.mjs` no `postinstall` + `testes/react-ping.test.ts` (§13) |

### Resolvidos em 22/09/2026

| Era | Como ficou |
|---|---|
| `alterarTaxaManual` gravava taxa em venda de PIX/dinheiro | Recusado na ação e no banco (gatilho `vendas_confere_taxa`, 0020) |
| Ações `Promise<void>` descartavam o erro (reativar taxa, situação, arquivar…) | Devolvem `ResultadoAcao`; a recusa aparece ao lado do botão (§6, regra 9) |
| `instanteNaClinica` aceitava 31/02 como 03/03 | Toda data de formulário passa por `dataValida()` (§7.2) |
| 10 ações interpolavam `error.message` | Passaram a usar `lib/erros-banco.ts`. O último caso, a linha recusada na importação em massa, fechou em 23/09/2026 |
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

`decidirEfeito` (`lib/venda.ts`) é a mesma regra da função SQL
`venda_alterar_pagamento`, escrita em TypeScript. Desde 23/09/2026 as telas de
alteração a usam para mostrar o ajuste que o banco vai gravar; alterá-la não
muda o que o banco faz.

### Dívidas conhecidas

- **As migrações 0019 a 0028 não estão em produção.** Motivo: só o dono aplica
  (§2, §4). Roteiro em `supabase/README.md`.
- **IP e dispositivo da assinatura são informados por quem chama a função.**
  Pelo link, `anon` chama `documento_assinar_por_link` direto com o IP e o
  user-agent que quiser; no balcão, qualquer perfil ativo chama
  `documento_assinar` do mesmo jeito. Só a server action lê os cabeçalhos. A
  0028 deixou isso escrito no comentário das colunas ("declarados, não
  conferidos"); fechar exige um segredo só do servidor conferido pelo banco —
  decisão do dono (§10, item 16).
- **Vendas antigas sem recebimento em produção** (entraram pela porta que a
  0023 fechou): a migração não mexe em dado; a clínica decide caso a caso
  (consulta no `supabase/README.md`).
- **`despesas.competencia` é `not null` sem default**, preenchida por uma regra
  que a aplicação adotou (o mês do vencimento, `competenciaDoVencimento` em
  `lib/despesa.ts`). Não há acordo da clínica sobre ela; editar o vencimento de
  despesa paga muda o número de um mês fechado.
- **Ajuste financeiro entra no período pela data da correção (`criado_em`)**, não
  pela data do recebimento corrigido. Corrigir em setembro uma venda de agosto
  move dinheiro para setembro. É decisão de regra contábil — pergunte.
- **Alteração repetida depois da confirmação acumula ajuste.**
  `venda_alterar_pagamento` compara o novo líquido só com `valor_recebido`, sem
  os ajustes já lançados (§8.4). O tratamento também é regra contábil —
  pergunte.
- **Confirmação errada não tem fluxo de correção**, e **zero digitado** na
  confirmação entra como `recebido_divergencia` (§8.4). Regra de negócio em
  aberto.
- **Regra de lucro não definida**: nenhum indicador de lucro existe, de
  propósito, até a clínica definir.
- **Storage × Postgres não é transacional.** Foto e linha podem divergir numa
  falha parcial; a reconciliação (0024) **detecta** e a administradora vê, mas
  nada apaga nem reenvia sozinho — quem decide o destino de arquivo órfão (dado
  de saúde, LGPD) é decisão em aberto.
- **Deduplicação de contato**: o índice `pendencias_contato_um_por_dia` só
  existe se o histórico não tiver duplicatas no dia; sem ele, a dedup é só da
  ação (duas abas no mesmo instante podem gravar dois).
- **Data da venda no futuro** não é barrada (decisão em aberto).
- **Correção local no React empacotado pelo Next (até subir para o 16.3).**
  Causa provada: no `react-dom` que o Next 15.5.x traz empacotado, um
  thenable que se resolve **durante** o render de uma transição suspensa (o
  `router.refresh()` ou a revalidação de uma ação numa rota com
  `loading.tsx`) não era anotado em `workInProgressRootPingedLanes` — o
  "ping" se perdia, a faixa ficava suspensa sem ninguém para acordá-la e a
  tela seguia na versão anterior, embora o RSC novo já tivesse chegado. Só
  aparecia no build de produção, no Chromium, com página lenta e lista
  grande (`/`, `/financeiro`, `/financeiro/despesas`, `/financeiro/fluxo`,
  `/busca` e `/prontuarios/[id]`). Bisseção num app Next puro: ok até o
  15.4.11, quebrado do 15.5.0 ao 16.2.x, corrigido no 16.3.0. **Corrigido**
  por `scripts/corrigir-ping-react.mjs`, que roda no `postinstall` (CI e
  Vercel), troca a linha em 8 arquivos de `node_modules/next/dist/compiled`,
  é idempotente e falha (código 1) se o formato não bater enquanto o Next
  for < 16.3; `testes/react-ping.test.ts` reprova se a troca não estiver
  aplicada. Com a correção, o teste de CSP de foto, documento e agenda de
  `e2e/seguranca.spec.ts` passa contra `next start`. **Não edite
  `node_modules` à mão nem remova o `postinstall`** antes de subir o Next;
  no 16.3+, apague o script, a linha do `postinstall` e o teste.
- **Token de assinatura no caminho** (`/assinar/<token>`) aparece no log de
  requisição da Vercel, que o app não controla. Mudar exige outro desenho —
  decisão do dono.
- **CI:** o workflow existe mas não rodou no GitHub. A proteção do
  `jamal-do-mal` está aplicada (§2), mas não exige checagem: a CI avisa, não
  barra.
- **Autenticação em dobro** por tela interna (middleware + `usuarioAtual`):
  é o gargalo medido (§2). Mudar é decisão de segurança (§10, item 18).
- **Foto: o banco confere o objeto, não o conteúdo.** Os primeiros bytes
  continuam conferidos só em `registrarImagem`; o gatilho da 0028 depende dos
  metadados (`mimetype`, `size`) que o storage-api grava no envio — confira o
  primeiro envio em produção depois do `db:push`.
- **A exclusão direta de foto pela API (administradora) exige o motivo** desde a
  0022, mas não apaga o arquivo do bucket — isso continua sendo papel de
  `eliminarImagem`, que remove o arquivo antes.
- **Dependências (`npm audit`: zero em 23/09/2026).** O `postcss` que o Next
  fixa por dentro é forçado para 8.5.x pelo `overrides` do `package.json` —
  ao subir o Next, confira se o override ainda é preciso. O CLI da Vercel saiu
  das devDependencies (trazia tar, undici, path-to-regexp…): quando precisar,
  `npx vercel`. Vitest está na 5, e `@axe-core/playwright` entrou para o
  `acessibilidade.spec.ts`. **Não rode `npm audit fix --force`.**
- **Próximo passo: migrar para o Next >= 16.3.0** (rodada própria, decisão
  do dono — exige `npm install`; §10, item 21). O que muda: (1)
  `src/middleware.ts` vira `src/proxy.ts` (arquivo e função exportada
  renomeados; o teste `src/middleware.test.ts` acompanha); (2) ESLint flat
  nativo do `eslint-config-next` 16 no lugar do `FlatCompat` de
  `eslint.config.mjs` — ele liga `react-hooks/set-state-in-effect`, que
  acusa **7 avisos** a tratar um a um (o `lint` roda com
  `--max-warnings=0`; nada de `eslint-disable`); (3) Turbopack também no
  `next build`; (4) o orçamento de `scripts/desempenho.mjs` lê a tabela de
  First Load JS da saída do `next build` (`lerTabelaDoBuild`) — confira se
  o build novo ainda a imprime e, se não, troque a fonte da medida antes de
  confiar no gate; (5) apague a correção do ping (item acima) e confira se o
  `overrides` de `postcss` ainda é preciso. Feche com os gates completos:
  lint, tipos, Vitest, build, `test:banco`, E2E nos três projetos contra
  `next start` e o orçamento.

### Sobre os indicadores: estoque vs fluxo

`aReceber` e `aReceberVencido` são **estoque** — somam tudo em aberto de qualquer
período, não só do mês na URL, e vêm de `valor_liquido` (já sem a taxa). Os
demais são **fluxo do mês**. Misturar os dois numa conta produz número sem
significado.

**Rótulos parecidos, bases diferentes.** No mesmo mês os números podem não
bater, e não é erro de soma:

- Visão Geral → "Recebido no mês" e "Entradas do mês" somam o
  `valor_recebido` dos confirmados, **sem** ajustes; Financeiro → "Líquido recebido" é a mesma soma **com** os
  ajustes do mês.
- Visão Geral → "Despesas do mês" soma as não canceladas (pagas e pendentes)
  **por competência**; Financeiro → "Despesas pagas" soma só as pagas, **por
  `pago_em`**.
- Ficha da paciente → "Total recebido" e "Em aberto" somam o **valor bruto**
  (`valor`), antes da taxa.
