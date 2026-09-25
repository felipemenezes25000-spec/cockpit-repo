# Captação — funil comercial, meta financeira e acompanhamento dos leads

Implementado nas migrações `0029_captacao_e_metas.sql` (funil, metas e conversão),
`0030_contatos_comerciais.sql` (contatos e retornos) e
`0031_acompanhamento_comercial_conferido.sql` (as regras do acompanhamento conferidas
pelo banco), e na rota `/captacao`.

> **Produção:** 0029, 0030 e 0031 aplicadas em 25/09/2026, antes do deploy do código
> (banco primeiro, código depois — roteiro em
> [`supabase/README.md`](../supabase/README.md#próxima-onda-0029--0031-captação)).

## Propósito

Captação cobre o trecho anterior ao cadastro clínico: uma pessoa pode demonstrar interesse, conversar com a clínica e nunca virar paciente. Por isso `lead` é entidade própria e `paciente` continua sendo cadastro de quem efetivamente entrou na operação da clínica.

A tela cruza quatro verdades diferentes sem duplicá-las:

- `leads` + `lead_etapas`: entrada e avanço comercial — **onde** o lead está;
- `lead_interacoes`: cada contato feito e o próximo combinado — **quando** a equipe falou com ele e quando vai falar de novo;
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

### Gargalo

Localiza a menor conversão entre etapas que já têm volume e, quando existe meta configurada, compara a taxa atual com a premissa planejada em pontos percentuais.

### Origem

Para cada origem são mostrados: quantidade de leads, vendas da mesma coorte, conversão Lead → Venda e receita atribuída.

### Campanha

Campanhas são agrupadas pelo texto informado no cadastro do lead e ordenadas pela receita real atribuída, com volume e conversão como contexto.

## Modelo de atribuição: coorte de entrada

Receita atribuída não é `leads × ticket médio`. Ela só existe quando o lead possui `venda_id` e essa venda real pertence ao período consultado. O valor vem de `vendas.valor_final`.

O recorte é **por coorte de entrada**: a tela olha os leads que **entraram** no mês e pergunta quanto deles virou venda. O Financeiro, por sua vez, soma as vendas **feitas** no mês. Consequência, e não erro de soma:

> um lead que entrou em agosto e comprou em setembro entra no faturamento de setembro, mas **não** na receita atribuída da coorte de setembro — ele conta na coorte de agosto.

Por isso o Pulso separa duas leituras:

- **faturamento da meta:** todas as vendas reais do Financeiro no mês;
- **receita atribuída:** apenas as vendas do mês ligadas a um lead que também entrou no mês. "Receita sem lead atribuído" não quer dizer orgânica — só que a venda não se liga a um lead desta coorte.

A alternativa — atribuir cada venda do mês ao lead de onde veio, qualquer que seja o mês de entrada ("de onde vieram as vendas de setembro?") — é a leitura típica de ROI de marketing. É **decisão em aberto da clínica** (`AGENTS.md` §10); não troque o modelo em silêncio.

## Carteira comercial

A lista inferior não é limitada a um bloco fixo de leads recentes. Ela é uma carteira paginada (15 por página) do período, com:

- busca por nome, telefone, e-mail, origem e campanha (operadores do PostgREST saem do termo);
- filtros por etapa, origem e acompanhamento, todos na URL;
- paginação, inclusive correção de URL fora do alcance para a última página válida;
- WhatsApp direto quando existe telefone válido;
- procedimento de interesse e campanha visíveis;
- alerta a partir de 3 dias de calendário sem movimento para leads ainda abertos;
- **estado do retorno, último contato, registro de contato e histórico comercial** (abaixo);
- motivo de perda visível quando o lead está encerrado como `perdido`;
- histórico das mudanças de etapa, com data, hora e o motivo de cada perda.

O histórico do funil vem de `lead_etapas`; ele não é reconstruído a partir do estado atual.

## Acompanhamento comercial: contatos e retornos (0030 e 0031)

### Etapa não é interação

A etapa diz **onde** a oportunidade está. O contato diz **quando** a equipe falou com a pessoa, por qual canal, o que ficou combinado e **quando** vai falar de novo. Registrar um contato **não muda a etapa** — e mudar a etapa não apaga os contatos.

### O que se registra

Na linha de cada lead aberto, **Registrar contato** (recepção e administradora):

- **Canal:** WhatsApp, telefone, Instagram, e-mail, presencial ou outro — a mesma lista da CHECK de `lead_interacoes.canal`;
- **Observação:** até 1000 caracteres, sem informação clínica (o lead ainda não é paciente);
- **Próximo contato:** opcional; hoje ou depois, no calendário da clínica.

A ação `registrarContatoLead` (`src/server/acoes/captacao.ts`) valida com `validarContato` (`src/lib/captacao.ts`) e grava **só** `lead_id`, `canal`, `observacao` e `proximo_contato` — exatamente o grant de INSERT. Autor (`por`) e hora (`em`) são do banco; o resumo no lead (`ultimo_contato_em`, `proximo_contato`) é do gatilho. Recusada, o campo com erro fica marcado (`aria-invalid`), descrito e recebe o foco; a resposta aparece numa região viva (`role="status"`/`role="alert"`).

### O resumo no lead

`leads.ultimo_contato_em` e `leads.proximo_contato` são resumo do contato mais recente, para a carteira ordenar e alertar sem reconstruir o histórico:

- escritos **só** pelo gatilho `private.lead_interacao_atualiza_resumo` — a sessão não tem grant de INSERT nem de UPDATE nessas colunas;
- desde a 0031 o resumo **só anda para a frente**: uma interação mais antiga (importada pelo SQL do projeto) não troca o último contato;
- um contato **sem** próximo contato limpa o retorno anterior — o combinado foi cumprido ou desfeito;
- o contato também conta como movimento: `atualizado_em` do lead avança, e ele sai de "parados".

### Lead encerrado não tem retorno

Ganho ou perdido, o lead não é mais acompanhado pela Captação (depois da venda, o acompanhamento segue pela ficha da paciente e pelo Relacionamento; perdido precisa ser reaberto). Três camadas:

- **Interface:** "Registrar contato" não aparece em lead encerrado, e o selo de retorno some;
- **Ação:** a frase do banco chega à tela ("Reabra o lead antes de registrar um novo contato.");
- **Banco:** a política de INSERT da 0030 exige lead aberto; o gatilho `private.lead_interacao_conferida` (0031) **trava a linha do lead** antes de conferir a etapa — um contato registrado no instante em que outra pessoa encerra o lead não passa — e responde com frase legível. Ao encerrar, `private.lead_encerrado_sem_retorno` limpa `proximo_contato`, e a CHECK `leads_encerrado_sem_retorno` torna isso invariante. Os contatos ficam: só o resumo sai. Lead reaberto volta **sem retorno programado**.

### Data do próximo contato

Nova data antes de hoje é recusada na ação e no banco (0031), com "hoje" sendo o dia de São Paulo — às 23h30 da clínica o UTC já virou, e o dia ainda é o mesmo. Uma data que ficou no passado continua existindo: é o **retorno atrasado**, e só existe porque nasceu válida e o tempo andou. Sem sessão (manutenção pelo SQL do projeto, como a importação de um histórico antigo) a regra não se aplica, como nos demais gatilhos de sessão (`AGENTS.md` §4, regra 8).

### Estados na tela

Cada lead aberto mostra um selo, com texto e ícone próprios — a cor só reforça (`AGENTS.md` §7.3):

| Estado | Selo | Tom |
|---|---|---|
| Retorno já passou | "Retorno atrasado há N dias" | negativo (vermelho) + barrinha à esquerda |
| Retorno é hoje | "Retorno hoje" | atenção (laranja) + barrinha à esquerda |
| Retorno futuro | "Próximo contato em DD/MM" | informativo |
| Nada combinado | "Sem retorno programado" | neutro |

Ao lado: "Último contato: DD/MM às HH:MM" ou "Sem contato registrado".

### Histórico comercial

Separado do **Histórico do funil**: o funil lê `lead_etapas`; o comercial lê `lead_interacoes`. Cada contato mostra data e hora, canal, observação e o próximo contato combinado naquele momento. A linha mostra os 8 mais recentes e diz quantos existem ("Mostrando os 8 contatos mais recentes de 12").

A consulta (`listarLeadsCaptacao`) busca os contatos da página inteira numa única ida ao banco (`in (ids)`, ordem `em desc, id desc`), em blocos de 500 (`todasAsLinhas`), e agrupa por lead — nenhuma consulta por lead.

### Filtros de acompanhamento (`?atencao=`)

| Valor | Quem aparece | Ordem | Escopo |
|---|---|---|---|
| `parados` | aberto e 3+ dias de calendário sem movimento | o mais antigo primeiro | coorte do mês |
| `retorno_hoje` | aberto e próximo contato = hoje da clínica | mais antigo primeiro | **carteira aberta inteira** |
| `retorno_atrasado` | aberto e próximo contato < hoje da clínica | o mais atrasado primeiro | **carteira aberta inteira** |

Os retornos **não** se limitam ao mês de entrada: um retorno combinado com um lead que entrou no mês passado vence hoje do mesmo jeito, e escondê-lo atrás da coorte seria perder o contato. A carteira avisa quando esse recorte está ativo. Valor desconhecido na URL cai em "todos" (`lerFiltroAtencao`), e trocar de mês limpa o recorte.

### Pulso comercial

Seis cartões, em duas leituras:

- o que o faturamento explica: **Receita atribuída**, **Cobertura de atribuição**, **Receita sem lead atribuído**;
- o que pede ação: **Leads pedindo atenção** (parados, da coorte), **Retornos para hoje** e **Retornos atrasados** (carteira aberta inteira).

Os três últimos abrem o recorte correspondente da carteira. Os retornos são contados no banco (`count: "exact", head: true`) — nenhuma linha trafega e o limite de linhas do PostgREST não corta a conta.

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
- ao nascer uma venda para a mesma paciente, o lead aberto mais recente vai para `ganho` e grava `venda_id` — e, desde a 0031, perde o retorno programado.

A conversão e as duas automações ficam no banco, não espalhadas entre telas. Assim Captação, Agenda e Financeiro compartilham a mesma regra independentemente de qual fluxo criou o atendimento ou a venda.

## Venda concluída é evidência financeira

`ganho` não é uma etapa manual.

A interface não oferece **Venda concluída** no seletor de mudança de etapa, a server action recusa essa transição e o banco exige a equivalência:

`etapa = ganho ⇔ venda_id existe`

Portanto:

- a carteira não pode fabricar uma venda;
- chamada direta à API também não pode fabricar uma venda (`venda_id` fora do grant);
- um lead que já tem venda real não pode ser manualmente retrocedido para outra etapa deixando `venda_id` para trás.

A origem da verdade continua sendo o Financeiro.

## Motivos de perda

`leads.motivo_perda` representa o motivo da perda **atual**.

Além disso, cada transição para `perdido` grava o motivo em `lead_etapas.motivo`. Assim, se o lead for reaberto e depois perdido de novo, a trilha mantém cada motivo histórico.

O painel agrega o último motivo de perda registrado para cada lead da coorte e mostra os motivos mais recorrentes com quantidade e percentual.

## Perfis

- **Administradora:** lê tudo, cadastra/move/vincula/converte leads, registra contatos e altera meta.
- **Recepção:** lê tudo, cadastra/move/vincula/converte leads e registra contatos; não altera meta.
- **Financeiro:** lê tudo e altera meta; não altera a carteira nem registra contato.

As mesmas regras existem na interface, nas server actions e nas políticas RLS. As permissões SQL são por coluna para não permitir pela API a fabricação de autoria, timestamps, `venda_id` ou do resumo de contato. A função de conversão é `security definer`, portanto faz uma checagem explícita do papel antes de tocar qualquer linha e só é executável por `authenticated`.

## Histórico e auditoria

- Cada mudança de `leads.etapa` gera uma linha imutável em `lead_etapas` por gatilho. A sequência dessa trilha não tem privilégio para a sessão (0031, como as outras trilhas na 0024).
- `lead_interacoes` é **só de inserção** pela API: sem grant de UPDATE nem de DELETE. Corrigir o próximo passo é registrar um contato novo.
- `leads`, `metas_comerciais` e — desde a 0031 — `lead_interacoes` entram na auditoria geral. Pela API a interação já traz autor e hora escritos pelo banco; a auditoria existe porque a observação é dado pessoal de quem ainda não é paciente e porque uma correção pelo SQL do projeto, que passa por cima dos grants, precisa deixar rastro.

Não existe DELETE no módulo. Um lead encerrado sem conversão vai para `perdido` com motivo obrigatório.

## Dados de exemplo

`dados-exemplo-limpar.sql` segue a regra "linha de exemplo apontada por dado real fica" também para a Captação: a paciente e o procedimento de exemplo que um lead real aponta não saem (o `on delete set null` apagaria o vínculo em silêncio); a venda de exemplo ganha por um lead não sai (o lead ficaria "ganho" sem venda, que a CHECK recusa); e o procedimento de exemplo com meta comercial própria não sai (a FK é `restrict` e abortaria a limpeza inteira). O `test:banco` cobre os três casos.

## Visual e movimento

A tela segue o sistema visual Cockpit: superfícies planas, borda de 1 px e uma cabine azul dominante. **A exceção é o funil** (decisão do dono em 25/09/2026, AGENTS.md §7.3): um funil 3D vivo, desenhado em SVG, dentro de um palco azul profundo na cabine.

- **O desenho** (`components/captacao/funil-3d-cena.tsx`) é decorativo (`aria-hidden`): quatro faixas em tronco de cone com degradê espelhado e lábio de luz, frisos que giram em perspectiva (o funil "roda"), uma varredura de brilho em cascata, o vórtice na boca com partículas sugadas, leads entrando pelas trilhas com seta, energia descendo em espiral pela superfície e moedas "R$" saindo pela ponta numa plataforma com ondas. As cores são os tokens `--color-funil-*` de `globals.css`.
- **A geometria** (`lib/funil-3d.ts`) é função pura: o desenho e os botões por cima dele usam os mesmos números (viewBox 620 × 500; funil em x 0–400, balões a partir de x 432).
- **Quem opera** usa os botões: uma faixa horizontal por etapa (`aria-pressed`, nome "Etapa: volume"), com o rótulo dentro da faixa e o balão de volume e conversão ao lado; a etapa escolhida levanta no desenho e o painel abaixo mostra conversão, o necessário a partir de agora e o link para a carteira filtrada.
- **Container query:** abaixo de 520 px de largura do cartão, o desenho é recortado em x 0–400 (o funil ocupa a largura toda) e os balões e traços saem; o painel continua embaixo.
- **Movimento:** todo em SMIL, com períodos que dividem 6 s (a cena se repete a cada 6 s; `svg.setCurrentTime(t)` congela qualquer instante — é o que a captura de vídeo usa). O desenho só monta no navegador, depois da hidratação (hidratar as centenas de nós junto atrasava a página ~270 ms no `next dev`); no servidor vão os botões, rótulos, balões e o painel. O movimento some com `prefers-reduced-motion` e pausa fora da tela (`IntersectionObserver`). A entrada das faixas em cascata é CSS e também respeita o movimento reduzido.
- **Qualidade adaptativa** (`proximaQualidade`, `lib/funil-3d.ts`): o funil começa **leve** (sem estrelas piscando, frisos parados, metade das partículas), mede 1,2 s de quadros com ele na tela e sobe para **plena** com folga (45+ fps) ou **para** abaixo de 30 — decoração engasgando é pior que parada. A decisão fica no `localStorage` (`cockpit.funil.qualidade`), por aparelho. Medido em 25/09/2026: Chromium no Windows fica na plena a 60 fps; o WebKit do Playwright no Windows (renderização por software) para.
- **Sem filtro SVG na cena:** blur e sombra em elementos que se mexem faziam o WebKit refazer o desfoque na CPU a cada quadro (9 fps). Brilho é degradê radial ou traço em camadas.
- **Sem leads no período, não há fluxo:** leads, espiral e moedas só aparecem com entradas; o funil vazio só gira. Os números não animam (a contagem de 0 até o valor piscava na hidratação).

O `loading.tsx` reproduz a composição real do dashboard — cabine, pulso com seis cartões, ritmo, inteligência e carteira — para reduzir salto de layout durante a navegação.

## Testes

| Camada | Arquivo | O que confere |
|---|---|---|
| Regras | `src/lib/captacao.test.ts` | funil inverso, ritmo, `validarContato` (canal, teto, data inexistente, passado), `situacaoDoRetorno`, `lerFiltroAtencao` |
| Ações | `src/server/acoes/captacao.test.ts` | as cinco ações: sessão, perfil, UUID, validação, frase do banco × frase segura, log, zero linhas, revalidação; o contato grava só as colunas do grant, com "hoje" no fuso da clínica |
| Consultas | `src/server/consultas/captacao-leads.test.ts`, `captacao.test.ts` | cada recorte (coorte × carteira aberta), ordem, combinação de filtros, busca com operador, página além do fim, contatos em lote e agrupados, lead encerrado sem retorno, retornos contados no banco, 0030 ausente |
| Componentes | `src/components/captacao/*.test.tsx` | selos de retorno, último contato, formulário só para lead aberto e para quem opera, históricos separados, erro por campo com foco, estados vazios, links do Pulso |
| Funil 3D | `src/lib/funil-3d.test.ts`, `src/components/captacao/funil-vivo.test.tsx` | faixas empilhadas e contíguas, rótulo dentro da faixa, traço saindo de fora do funil, frisos que somem atrás, espiral em tempo uniforme; um botão por etapa, seleção, painel, link sem a página antiga, desenho `aria-hidden`, parado com movimento reduzido e sem fluxo quando não há leads |
| Banco | `supabase/testes/permissoes.sql` (seção Captação) | RLS e grants das quatro tabelas, sequências, ganho ⇔ venda, trilha de etapas e de perdas, RPC de conversão (perfil, idempotência, perdido), gatilhos de agenda e venda, contato append-only, autor e hora do banco, retorno no passado, lead encerrado, resumo que não volta no tempo, auditoria, limpeza de exemplo |
| Ponta a ponta | `e2e/captacao.spec.ts` | lead → contato → retorno hoje → qualificado → paciente → agenda → venda (ganho e receita atribuída); retorno recusado no passado, retorno que venceu, perda, reabertura e as duas trilhas; financeiro só acompanha; axe (WCAG 2.2 AA) e sem rolagem lateral de 320 a 1440 px com tudo aberto |

## Fora desta fase

Aparecem como próximos passos em `src/lib/nav.ts` e **não** estão prontos: metas específicas por procedimento (o banco já aceita `procedimento_id`; a interface trabalha só com a meta geral), tempo médio entre etapas (o dado existe em `lead_etapas.em`, o painel não) e integração automática com campanhas e formulários de anúncios (origem e campanha são digitadas).

## Arquivos principais

- `src/app/(app)/captacao/page.tsx` e `loading.tsx`
- `src/components/captacao/` (`leads-do-funil.tsx`, `filtros-leads.tsx`, `pulso-comercial.tsx`, …)
- `src/lib/captacao.ts` — regras puras (meta, ritmo, contato, retorno, filtros)
- `src/server/consultas/captacao.ts` — painel, atribuição e contagem de retornos
- `src/server/consultas/captacao-leads.ts` — carteira, recortes, históricos
- `src/server/acoes/captacao.ts`
- `supabase/migrations/0029_captacao_e_metas.sql`, `0030_contatos_comerciais.sql`, `0031_acompanhamento_comercial_conferido.sql`

Os tipos vêm de `src/lib/supabase/tipos-banco.ts`, gerado do banco local com 0029–0031 (`npm run db:tipos:local`). As extensões temporárias `captacao-banco.ts` e `captacao-contatos-banco.ts` saíram.
