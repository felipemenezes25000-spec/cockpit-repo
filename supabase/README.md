# Banco de dados

O banco é um Postgres gerenciado pelo Supabase, na região **South America
(São Paulo)**. Toda alteração de estrutura passa por um arquivo de migração
versionado nesta pasta — nada é alterado direto pelo painel.

## Migrações

| Arquivo | O que faz |
|---|---|
| `0001_fundacao.sql` | Perfis e acesso, equipe, catálogo de procedimentos, pacientes, agenda, relacionamento, financeiro e auditoria. RLS ligada em todas as tabelas. |

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

- **RLS ligada em toda tabela nova.** Sem exceção: dado de paciente é dado
  pessoal sensível.
- **Nunca escrever `DROP` de coluna com dado dentro** sem uma migração de
  transição que preserve o conteúdo.
- **Toda tabela com dado de paciente entra na auditoria.**
- Migração é imutável depois de aplicada em produção. Correção vira arquivo novo.

## Perfis de acesso

| Perfil | Alcance |
|---|---|
| `administradora` | Tudo, inclusive despesas, auditoria e gestão de usuários |
| `recepcao` | Pacientes, agenda, retornos, pendências e recebimentos. Sem despesas, sem auditoria |

O papel fica em `public.perfis.papel` e é lido pelas funções `papel_atual()`,
`e_administradora()` e `tem_acesso()`, usadas por todas as políticas.

Usuário novo entra como `recepcao` por padrão — promover é decisão da
administradora.
