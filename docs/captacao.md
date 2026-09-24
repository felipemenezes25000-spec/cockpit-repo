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

Cada estágio do funil leva para a carteira filtrada pela etapa atual. O card explica a diferença: o volume do funil mede quem chegou à etapa dentro da coorte; a carteira mostra quem está nela agora.

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

Quando ainda não existe uma meta salva, a interface trata isso como estado próprio. Não mostra `R$ 0` como se fosse uma meta válida e não finge que `+0 leads` significa planejamento concluído.

## Ritmo e projeção do mês

O painel **Ritmo do mês** transforma o gap em cadência operacional:

- média de faturamento por dia já decorrido;
- projeção de faturamento até o fim do mês no ritmo atual;
- percentual projetado da meta;
- ritmo financeiro necessário por dia;
- vendas necessárias por dia;
- leads necessários por dia;
- dias restantes no período.

A projeção é deliberadamente simples: extensão linear do realizado até hoje. Ela é apresentada como **projeção no ritmo atual**, nunca como previsão estatística ou IA.

O cálculo de dias usa o calendário da clínica. O dia atual entra no saldo de dias restantes, e o sistema não inventa feriados, sábados úteis ou horários de funcionamento que não foram configurados.

## Inteligência de origem, campanha e gargalo

A tela separa quatro leituras comerciais:

### Gargalo

Localiza a menor conversão entre etapas que já têm volume e, quando existe meta configurada, compara a taxa atual com a premissa planejada em pontos percentuais.

### Origem

Para cada origem são mostrados:

- quantidade de leads;
- vendas da mesma coorte;
- conversão Lead → Venda;
- receita atribuída.

### Campanha

Campanhas são agrupadas pelo texto informado no cadastro do lead e ordenadas pela receita real atribuída, com volume e conversão como contexto.

### Receita atribuída

Receita atribuída não é `leads × ticket médio`. Ela só existe quando o lead possui `venda_id` e essa venda real pertence ao período consultado. O valor vem de `vendas.valor_final`.

Isso mantém duas leituras distintas e honestas:

- **faturamento da meta:** todas as vendas reais do Financeiro no mês;
- **receita atribuída à captação:** apenas vendas que conseguem ser ligadas a um lead/origem/campanha da coorte.

## Carteira comercial

A lista inferior não é limitada a um bloco fixo de leads recentes. Ela é uma carteira paginada do período, com:

- busca por nome, telefone, e-mail, origem e campanha;
- filtro por etapa;
- paginação, inclusive correção de URL fora do alcance para a última página válida;
- WhatsApp direto quando existe telefone válido;
- procedimento de interesse e campanha visíveis;
- alerta a partir de 3 dias de calendário sem movimento para leads ainda abertos;
- motivo de perda visível quando o lead está encerrado como `perdido`;
- histórico das mudanças de etapa, com data e hora;
- motivo histórico de cada passagem para `perdido`.

O histórico vem de `lead_etapas`; ele não é reconstruído a partir do estado atual.

## Lead → paciente → agenda → venda

Lead e paciente continuam entidades diferentes, mas a carteira fecha o ciclo sem exigir redigitação.

Quando ainda não existe paciente vinculada, a recepção tem duas opções na própria linha:

- **Criar paciente com dados do lead:** chama `lead_converter_em_paciente`, que numa única transação cria a paciente com nome, telefone, e-mail e origem, vincula `paciente_id` e promove `novo` para `qualificado`. A linha do lead é bloqueada durante a conversão para dois cliques simultâneos não criarem duas pacientes. Repetir a operação é idempotente.
- **Vincular a uma paciente:** usa o seletor existente para ligar o lead a um cadastro que já existia, evitando duplicidade.

Lead `perdido` precisa ser reaberto antes de criar uma paciente diretamente.

Depois do vínculo:

- a própria linha do lead oferece acesso à ficha da paciente;
- o botão **Agendar** abre `/agenda/novo` com a paciente já selecionada;
- ao nascer um atendimento para uma paciente vinculada, o lead aberto mais recente avança automaticamente para `agendamento`;
- ao nascer uma venda para a mesma paciente, o lead aberto mais recente vai para `ganho` e grava `venda_id`.

A conversão e as duas automações ficam no banco, não espalhadas entre telas. Assim Captação, Agenda e Financeiro compartilham a mesma regra independentemente de qual fluxo criou o atendimento ou a venda.

## Venda concluída é evidência financeira

`ganho` não é uma etapa manual.

A interface não oferece **Venda concluída** no seletor de mudança de etapa, a server action recusa essa transição e o banco exige a equivalência:

`etapa = ganho ⇔ venda_id existe`

Portanto:

- a carteira não pode fabricar uma venda;
- chamada direta à API também não pode fabricar uma venda;
- um lead que já tem venda real não pode ser manualmente retrocedido para outra etapa deixando `venda_id` para trás.

A origem da verdade continua sendo o Financeiro.

## Motivos de perda

`leads.motivo_perda` representa o motivo da perda **atual**.

Além disso, cada transição para `perdido` grava o motivo em `lead_etapas.motivo`. Assim, se o lead for reaberto e depois perdido de novo, a trilha mantém cada motivo histórico.

O painel agrega o último motivo de perda registrado para cada lead da coorte e mostra os motivos mais recorrentes com quantidade e percentual.

## Perfis

- **Administradora:** lê tudo, cadastra/move/vincula/converte leads e altera meta.
- **Recepção:** lê tudo, cadastra/move/vincula/converte leads; não altera meta.
- **Financeiro:** lê tudo e altera meta; não altera carteira de leads.

As mesmas regras existem na interface, nas server actions e nas políticas RLS. As permissões SQL são por coluna para não permitir pela API a fabricação de autoria, timestamps ou `venda_id`. A função de conversão é `security definer`, portanto faz uma checagem explícita do papel antes de tocar qualquer linha e só é executável por `authenticated`.

## Histórico e auditoria

Cada mudança de `leads.etapa` gera uma linha imutável em `lead_etapas` por gatilho. `leads` e `metas_comerciais` também entram na auditoria geral do sistema.

Não existe DELETE no módulo. Um lead encerrado sem conversão vai para `perdido` com motivo obrigatório.

## Visual e movimento

A tela segue o sistema visual Cockpit: superfícies planas, borda de 1 px, uma cabine azul dominante e sem vidro/blur decorativo. O movimento fica restrito ao próprio funil e desaparece com `prefers-reduced-motion`.

As partículas do fluxo só aparecem quando existem leads no período; um funil vazio não simula atividade.

O `loading.tsx` reproduz a composição real do dashboard — cabine, ritmo, inteligência e carteira — para reduzir salto de layout durante a navegação.

## Arquivos principais

- `src/app/(app)/captacao/page.tsx`
- `src/app/(app)/captacao/loading.tsx`
- `src/components/captacao/`
- `src/lib/captacao.ts`
- `src/lib/captacao-banco.ts`
- `src/server/consultas/captacao.ts`
- `src/server/consultas/captacao-leads.ts`
- `src/server/acoes/captacao.ts`
- `supabase/migrations/0029_captacao_e_metas.sql`
