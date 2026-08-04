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

## Projeto

`Cockpit-Consultorio2` · ref `khoaluytzzagtwmpaukx` · região **sa-east-1
(São Paulo)**.

A região não pode ser alterada depois da criação — trocar exige projeto novo e
migração de dados. O primeiro projeto foi criado em `us-east-1` e descartado por
isso, antes de existir qualquer dado.

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

O papel fica em `public.perfis.papel` e é lido pelas funções
`private.papel_atual()`, `private.e_administradora()` e `private.tem_acesso()`,
usadas por todas as políticas.

Elas ficam no schema `private` de propósito: o PostgREST só publica os schemas
configurados, então nada ali vira endpoint em `/rest/v1/rpc/`. Toda função
auxiliar de política nova deve nascer nesse schema.

Usuário novo entra como `recepcao` por padrão — promover é decisão da
administradora.

## Validação executada

Depois de aplicar as três migrações, o banco foi testado com dois usuários de
teste (uma administradora e uma recepcionista), removidos ao final:

| Verificação | Resultado |
|---|---|
| 11 tabelas com RLS ligada e política associada | ok |
| Gatilho cria o perfil no cadastro do usuário, respeitando o papel | ok |
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
