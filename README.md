# Cockpit — Consultório Dra. Érika Passos

Sistema de gestão da clínica: agenda, pacientes, prontuários, documentos,
financeiro, relacionamento e indicadores em um só lugar.

Next.js 15 na Vercel, Postgres no Supabase (São Paulo), com autenticação real e
permissões na RLS do banco. Visão Geral, Pacientes, Agenda, Financeiro,
Prontuários, Documentos e Relacionamento têm fluxos próprios; Relatórios ainda
têm página provisória e Configurações é parcial. O conteúdo em tela vem de
dados de demonstração, marcados como tais no banco.

## Executar localmente

Precisa de Node 20+ e Docker (para o Supabase local).

```bash
npm ci
npx supabase start       # banco local: aplica todas as migrações e os dados de exemplo
npm run local:usuarios   # cria as contas de teste (administradora, financeiro, recepção)
cp .env.local.example .env.local   # e preencha com a URL e a chave anônima locais
npm run dev
```

A aplicação abre em <http://localhost:3000>. O `supabase start` imprime a URL
(`http://127.0.0.1:55321`) e a chave anônima de demonstração para o
`.env.local`. As contas e a senha de teste estão em
[`supabase/usuarios-locais.json`](supabase/usuarios-locais.json) — só existem no
banco local.

Para apontar para o projeto de produção, use a URL e a chave anônima do painel
do Supabase no `.env.local`. Os scripts `db:*` e `dados:*` falam com produção:
leia o [`AGENTS.md`](AGENTS.md) §2 antes de rodar qualquer um.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (não rode com o `dev` no ar — ver AGENTS.md §2) |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint, sem aviso tolerado |
| `npm run typecheck` | Verificação de tipos |
| `npm test` | Testes de unidade e de componente (Vitest) |
| `npm run test:banco` | Permissões e regras do banco, por perfil, no Supabase local |
| `npm run test:e2e` | Fluxos e telas no navegador (Playwright), no Supabase local |
| `npm run local:usuarios` | Cria/confere as contas de teste locais |
| `npm run db:tipos:local` | Regenera os tipos do banco a partir do Supabase local |

Na primeira vez que for rodar o E2E: `npx playwright install chromium`.

## Documentação

| Arquivo | Assunto |
|---|---|
| [`AGENTS.md`](AGENTS.md) | **Documento-chave.** Regras de negócio, hospedagem, banco, permissões, arquitetura, testes e invariantes. Leitura obrigatória antes de mexer no código |
| [`docs/overview-sistema.md`](docs/overview-sistema.md) | Produto: cada módulo em detalhe, decisões de design, o que ainda é provisório |
| [`supabase/README.md`](supabase/README.md) | Banco: migrações, banco local, como aplicar, como criar usuário |
| [`docs/prompt-onboarding-codex.md`](docs/prompt-onboarding-codex.md) | Prompt pronto para dar a um agente de IA novo antes de ele mexer no projeto |

O funcionamento de **Relacionamento, busca global, recuperação de senha e a
correção do aviso de hidratação** está nas seções 16 a 19 do
[`overview-sistema.md`](docs/overview-sistema.md); a auditoria de setembro de
2026 (banco, erros, testes e interface) está na seção 20. A configuração do
e-mail de recuperação no Supabase está em
[`supabase/README.md`](supabase/README.md#recuperação-de-senha).
