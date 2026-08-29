# Cockpit — Consultório Dra. Érika Passos

Sistema de gestão da clínica: agenda, pacientes, prontuários, documentos,
financeiro, relacionamento e indicadores em um só lugar.

Next.js 15 na Vercel, Postgres no Supabase (São Paulo), com autenticação real e
permissões na RLS do banco. Visão Geral, Pacientes, Agenda e Financeiro estão
prontos; os demais módulos têm página provisória. O conteúdo em tela vem de
dados de demonstração, marcados como tais no banco.

## Executar

```bash
npm install
npm run dev
```

A aplicação abre em <http://localhost:3000>.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | Verificação de tipos |

A aplicação exige `.env.local` — copie de
[`.env.local.example`](.env.local.example) e preencha com os valores do projeto
Supabase.

## Documentação

| Arquivo | Assunto |
|---|---|
| [`AGENTS.md`](AGENTS.md) | **Documento-chave.** Regras de negócio, hospedagem, banco, permissões, arquitetura e invariantes. Leitura obrigatória antes de mexer no código |
| [`docs/overview-sistema.md`](docs/overview-sistema.md) | Produto: cada módulo em detalhe, decisões de design, o que ainda é provisório |
| [`supabase/README.md`](supabase/README.md) | Banco: migrações, como aplicar, como criar usuário |
| [`docs/prompt-onboarding-codex.md`](docs/prompt-onboarding-codex.md) | Prompt pronto para dar a um agente de IA novo antes de ele mexer no projeto |
