# Captação — funil comercial e meta financeira

Implementado na migração `0029_captacao_e_metas.sql` e na rota `/captacao`.

## Propósito

Captação cobre o trecho anterior ao cadastro clínico: uma pessoa pode demonstrar interesse, conversar com a clínica e nunca virar paciente. Por isso `lead` é entidade própria e `paciente` continua sendo cadastro de quem efetivamente entrou na operação da clínica.

A tela cruza três verdades diferentes sem duplicá-las:

- `leads` + `lead_etapas`: entrada e avanço comercial;
- `metas_comerciais`: alvo mensal e premissas planejadas;
- `vendas`: faturamento realizado, que continua pertencendo ao Financeiro.

## Funil visual

A cabine central mostra quatro estágios agregados:

1. Entrada de leads;
2. Lead qualificado;
3. Agendamento;
4. Venda concluída.

`perdido` existe no banco e na carteira, mas fica fora do corpo do funil porque é uma saída, não um estágio rumo à venda.

As taxas usam somente a coorte de leads que entrou no próprio período selecionado, impedindo que um lead antigo avançando neste mês produza uma conversão acima de 100% contra os novos contatos do mês.

## Funil inverso da meta

`src/lib/captacao.ts` calcula, sem persistir resultado derivado:

`gap financeiro → vendas necessárias → agendamentos → qualificados → leads`

Os dados persistidos são apenas:

- meta de faturamento;
- ticket médio planejado;
- taxa lead → qualificado;
- taxa qualificado → agendamento;
- taxa agendamento → venda.

O faturamento atual vem de `vendas.valor_final`. O módulo de Captação nunca mantém um total financeiro paralelo.

## Perfis

- **Administradora:** lê tudo, cadastra/move leads e altera meta.
- **Recepção:** lê tudo, cadastra/move leads; não altera meta.
- **Financeiro:** lê tudo e altera meta; não altera carteira de leads.

As mesmas regras existem na interface, nas server actions e nas políticas RLS. As permissões SQL são por coluna para não permitir pela API a fabricação de autoria, timestamps ou `venda_id`.

## Histórico e auditoria

Cada mudança de `leads.etapa` gera uma linha imutável em `lead_etapas` por gatilho. `leads` e `metas_comerciais` também entram na auditoria geral do sistema.

Não existe DELETE no módulo. Um lead encerrado sem conversão vai para `perdido` com motivo obrigatório.

## Integração com venda

Se um lead estiver vinculado a `paciente_id`, a criação de uma venda para a mesma paciente move automaticamente o lead aberto mais recente para `ganho` e grava `venda_id`. O gatilho fica no banco para o resultado não depender de qual tela registrou a venda.

## Visual e movimento

A tela segue o sistema visual Cockpit: superfícies planas, borda de 1 px, uma cabine azul dominante e sem vidro/blur decorativo. O movimento fica restrito ao próprio funil e desaparece com `prefers-reduced-motion`.

As partículas do fluxo só aparecem quando existem leads no período; um funil vazio não simula atividade.

## Arquivos principais

- `src/app/(app)/captacao/page.tsx`
- `src/components/captacao/`
- `src/lib/captacao.ts`
- `src/server/consultas/captacao.ts`
- `src/server/acoes/captacao.ts`
- `supabase/migrations/0029_captacao_e_metas.sql`
