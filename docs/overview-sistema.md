# Cockpit — Consultório Dra. Érika Passos

Documento de referência do sistema. Registra o propósito, o que já existe e o que
ainda é provisório. Atualizado em **setembro de 2026**.

> O conteúdo exibido hoje vem de dados de demonstração, marcados como tais no
> banco. Nenhum dado real da clínica foi utilizado.

---

## 1. Propósito do sistema

O cockpit é o centro de operação da clínica. Reúne em um único lugar o que hoje
fica espalhado entre agenda, caderno, conversas e planilha.

O sistema existe para:

- Centralizar informações que hoje ficam em lugares diferentes.
- Reduzir tarefas manuais e retrabalho da recepção e da equipe clínica.
- Acompanhar a paciente antes, durante e depois do atendimento.
- Mostrar, em uma tela, os compromissos do dia e o que precisa de atenção.
- Identificar quem está no período de voltar.
- Permitir que a clínica cresça sem aumentar o trabalho operacional na mesma
  proporção.

A experiência busca transmitir organização, segurança, agilidade, acolhimento e
clareza — daí a escolha por muito espaço em branco, pouca cor e hierarquia feita
por tipografia em vez de enfeite.

---

## 2. Perfis de usuário previstos

Hoje existem **três perfis**. O perfil Profissional fica para quando a equipe
crescer.

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| **Administradora** | Dra. Érika Passos | Acesso completo, incluindo despesas, relatórios, configurações e trilha de auditoria |
| **Financeiro** | Quem opera o caixa | Vendas, recebimentos, despesas e alteração de taxa com justificativa. Não configura tabela de taxas nem gerencia usuários |
| **Recepção** | Atendimento e agendamento | Agenda, cadastro de pacientes, confirmações, retornos, pendências e lançamento de recebimentos. Não acessa despesas, o consolidado financeiro nem conteúdo clínico |

As regras estão nas políticas de acesso do próprio banco, não apenas na
interface: mesmo que alguém contorne a tela, o banco recusa.

---

## 3. Módulos principais

| Módulo | Rota | Finalidade |
|---|---|---|
| Visão Geral | `/` | O dia da clínica em uma tela |
| Agenda | `/agenda` | Marcar, remarcar e acompanhar atendimentos |
| Pacientes | `/pacientes` | Cadastro e histórico de cada paciente |
| Prontuários | `/prontuarios` | Registro clínico versionado e fotos de evolução, restritos à administradora |
| Financeiro | `/financeiro` | Recebimentos, despesas e valores em aberto |
| Documentos e Contratos | `/formularios` | Contratos, termos e orientações emitidos e assinados pelas pacientes |
| Relacionamento | `/relacionamento` | Confirmações, retornos, tarefas, aniversários e convites para avaliação no Google |
| Relatórios | `/relatorios` | Indicadores de atendimento e faturamento |
| Configurações | `/configuracoes` | Clínica, equipe, procedimentos e preferências |

---

## 4. O que foi implementado nesta etapa

### Estrutura e navegação

- Estrutura principal reutilizável, com menu lateral, cabeçalho e área de conteúdo.
- Menu lateral com os nove módulos, indicação da página atual (cor de fundo, cor do
  texto, barra à esquerda e `aria-current`), recolhimento para faixa de ícones no
  computador e gaveta sobreposta no celular e no tablet.
- Cabeçalho com título da página, data de hoje por extenso, busca global para
  pacientes, atendimentos, documentos e prontuários conforme o perfil, ícone de
  notificações com a contagem de pendências de prioridade alta e menu do usuário.
- Faixa de contexto no topo de cada tela, com o aviso permanente **"Ambiente de
  demonstração — dados fictícios"** à esquerda e a etapa atual à direita.
- Atalho "Ir para o conteúdo" para navegação por teclado e página de rota inexistente.

### Visão Geral

- **Ações rápidas** — cinco atalhos que navegam de verdade para os fluxos dos módulos.
- **Indicadores** — seis cartões, todos calculados a partir dos dados fictícios:
  atendimentos de hoje, confirmados, confirmações pendentes, pacientes aguardando
  retorno, recebido no mês e valores a receber.
- **Agenda de hoje** — os atendimentos na ordem do relógio sobre uma linha do
  tempo, com o intervalo livre entre eles ganhando altura proporcional à duração,
  marcador "agora", destaque no atendimento em curso e legenda das situações.
- **Pendências da clínica** — tipo, paciente, detalhe, prazo, prioridade e botão
  que leva ao módulo responsável.
- **Próximos retornos** — paciente, último procedimento, data do último
  atendimento, situação do acompanhamento e uma barra mostrando onde a paciente
  está dentro do período sugerido de contato.
- **Resumo financeiro** — entradas, despesas, valores pendentes e a evolução dos
  recebimentos nos últimos seis meses.
- **Aniversariantes do mês** — nome, data, último atendimento e botão de contato.

### Prontuários

- **Listagem** — busca por título do prontuário e por dados da paciente.
- **Novo registro** — pode começar pela listagem, pela ficha da paciente ou por
  um atendimento específico.
- **Ficha clínica** — queixa/anamnese, avaliação, conduta, evolução, orientações
  e observações clínicas.
- **Versionamento** — alteração não sobrescreve conteúdo; cria nova versão com
  motivo, autor e data.
- **Fotos de evolução** — envio em lote, galeria em ordem cronológica, ampliação
  sem sair da página, legenda e data corrigíveis, arquivar e eliminar.
- **Permissão** — acesso restrito à administradora em interface, ação de servidor
  e RLS/função do banco — inclusive no armazenamento das fotos.

### Páginas provisórias

Relatórios ainda têm uma rota acessível que descreve o planejado, avisa que
está em construção e oferece um botão de volta para a Visão Geral.

### Base técnica

- Next.js 15 com App Router, TypeScript em modo estrito e Tailwind CSS v4.
- `lucide-react` para manter os ícones consistentes.
- Tipografia Hanken Grotesk, carregada por `next/font` — sem requisição a serviço
  externo em tempo de execução.
- Cores, raios e sombras definidos como tokens em `src/app/globals.css`.
- Valores em reais e datas no padrão brasileiro; interface inteira em português.

### Identidade visual

A estrutura, a tipografia e o espaçamento vêm do mockup em `docs/redesign`,
gerado no Google Stitch. **A paleta não**: o mockup era verde sobre branco, e o
verde passou a significar "deu certo" — não podia continuar sendo também a cor
do menu e dos botões.

Duas famílias de cor, com papéis que não se misturam.

#### 1. Marca — azul

Navegação, ações principais, links, títulos e foco. Não comunica estado nenhum:
é a cor de "o sistema", não de "a situação".

| Papel | Cor | Contraste |
|---|---|---|
| Azul escuro — título e texto | `#0854A0` | 7.54:1 sobre branco |
| Azul de ação — botão | `#0A6ED1` | 5.04:1 com texto branco |
| Azul claro de apoio | `#D6E9FB` | — |
| Página | `#FFFFFF` · painel `#F9F9FA` com borda `#E3E5E8` |  |
| Texto | `#1B1C1E` · secundário `#43474D` · terciário `#72767C` | 9.35:1 · 4.57:1 |

#### 2. Estado — quatro semânticas fixas

Cada uma quer dizer uma coisa só, e a regra que as separa é o que importa:
**vermelho é para o que deu errado, laranja é para o que falta fazer.** Se toda
pendência normal for vermelha, o valor vencido deixa de se destacar.

| Semântica | Texto | Fundo | Borda | Quando |
|---|---|---|---|---|
| **Negativo** | `#BB0000` | `#FCEAEA` | `#E6A3A3` | Não compareceu · cancelado · vencido · falha · pendência crítica · prazo perdido |
| **Atenção** | `#8F4700` | `#FFF3D6` | `#F1C40F` | Confirmação pendente · aguardando assinatura · retorno próximo · cadastro incompleto |
| **Positivo** | `#107E3E` | `#EAF5EA` | `#A9D3A9` | Confirmado · recebido · concluído · finalizado |
| **Informativo** | `#0854A0` | `#EAF3FB` | `#A3C4E6` | Agendado · em atendimento · aviso neutro |

O laranja tem **dois tons de propósito**: `#E9730C` fica em ícone e borda,
`#8F4700` fica em texto. `#E9730C` sobre `#FFF3D6` dá **2.75:1** e reprova no
WCAG AA — ilegível para quem tem baixa visão. O tom escuro dá 6.20:1 e lê como
a mesma família.

#### Situações do atendimento

| Situação | Semântica | Por quê |
|---|---|---|
| Agendado | informativo | Só informa; nada a fazer ainda |
| Aguardando confirmação | atenção | Falta ligar para a paciente. Não é erro |
| Confirmado | positivo | Deu certo |
| Em atendimento | informativo, preenchido | Está acontecendo neste minuto |
| Concluído | positivo | Terminou bem |
| Cancelado | negativo | Perdeu-se o horário |
| Não compareceu | negativo, em contorno | Perdeu-se o horário sem aviso |

Cancelado e não compareceu dividem o vermelho porque são a mesma má notícia. O
que as separa é o ícone, o rótulo e o preenchimento.

#### Acessibilidade da cor

Todo par de texto sobre fundo passa no WCAG AA (mínimo 4.5:1); o mais apertado é
o verde positivo, em 4.60:1. As bordas ficam entre 1.5:1 e 2.1:1, abaixo do
mínimo de 3:1 para elemento não-textual — **aceitável porque nenhuma borda
carrega significado sozinha**: todo estado é identificado por texto, ícone
próprio e preenchimento.

#### Outras decisões do mockup

- **Ícones**: o mockup usa Material Symbols, que o `next/font` não hospeda. Ficou
  `lucide-react` com traço 1.5, que imita o peso 300 do Material sem exigir
  requisição externa nem provocar piscada no carregamento.
- **Foto do usuário**: o mockup usa uma foto de banco de imagens. Foi mantido o
  avatar de iniciais, para não apresentar a foto de outra pessoa como sendo a
  Dra. Érika.
- **Menu**: o mockup mostra cinco itens; o sistema mantém os nove módulos
  previstos para a Etapa 1.
- **O mockup não é fonte para o Tailwind.** `globals.css` traz
  `@source not "../../docs"`: a detecção automática varria o HTML do Stitch e
  gerava utilitários mortos no CSS de produção — 12 classes de cor escrita à
  mão, que reintroduziam o verde antigo no pacote mesmo depois da troca.

---

## 5. O que ainda é provisório

| Item | Situação |
|---|---|
| Dados de demonstração | Marcados com a coluna `exemplo` no banco. `npm run dados:limpar` remove, e o aviso na tela some junto. |
| Ícone de notificações | Mostra a contagem de pendências altas, mas não abre nada. |
| Menu de perfil | Opções visíveis e desabilitadas, com a razão no `title`. |
| Botões "Resolver" das pendências | Navegam para o módulo correspondente; não resolvem nada. |
| Páginas de módulo restantes | Relatórios ainda descreve o que virá. Configurações segue parcial. |
| Períodos de retorno | Demonstrativos. Não são recomendação clínica. |
| Números financeiros | Identificados como demonstrativos na própria tela. |

---

## 6. O que não faz parte desta etapa

Provedor externo de assinatura · integração com Google Calendar ·
envio automático pelo WhatsApp ou de campanhas por e-mail · emissão de nota fiscal ·
processamento de pagamentos · regras de lucro ou saldo · automações ·
inteligência artificial · dados reais.

Nenhuma recomendação clínica automática é exibida, por decisão de escopo.

---

## 7. Decisões que ainda precisam ser validadas

1. **Regra de lucro.** Não foi definida, por isso o indicador não aparece. É preciso
   decidir o que entra na conta: valor bruto, custo de produto, comissão,
   impostos, taxa de cartão.
2. **Períodos de retorno por procedimento.** Os intervalos usados na demonstração
   são exemplos. A equipe clínica precisa definir os valores reais antes de virarem
   regra do sistema.
3. ~~**Divisão de permissões.**~~ Definida na Etapa 2: administradora e recepção,
   com as despesas e a auditoria restritas à administradora. O perfil Profissional
   entra quando a equipe crescer.
4. **Definição de "atendimento do dia".** Hoje o indicador desconsidera os
   cancelados e conta o restante. Falta confirmar se é assim que a clínica pensa.
5. **Canal de contato preferencial** para confirmação, retorno e aniversário.
6. **Horário de funcionamento.** A Linha do Dia hoje se ajusta aos atendimentos
   existentes. Com o horário oficial definido, ela pode passar a mostrar o
   expediente inteiro, inclusive as pontas vazias do dia.
7. ~~**Tratamento do fuso horário.**~~ Definido: todo cálculo de dia usa o relógio
   de São Paulo (`lib/dates.ts`), qualquer que seja o fuso do servidor — e os
   testes rodam de propósito com o processo em UTC, como na Vercel.
8. **Situações do atendimento.** As sete atuais cobrem a rotina? Falta alguma, como
   "remarcado"?
9. ~~**Método de assinatura dos contratos.**~~ Definido: assinatura interna, com
   o passo isolado atrás de uma interface para permitir conectar uma plataforma
   externa depois. Ver a seção 10.

---

## 8. Organização do código

```
src/
  middleware.ts           renova a sessão e barra rota protegida
  app/
    layout.tsx            fontes, idioma e aviso de hidratação no html
    globals.css           tokens de cor, tipografia, raio e sombra
    entrar/               login: página, formulário e ação
    recuperar-senha/      solicitação do link de recuperação
    redefinir-senha/      nova senha após validação do link
    sem-acesso/           conta existe mas não foi liberada
    (app)/
      layout.tsx          estrutura principal, exige sessão válida
      page.tsx            Visão Geral
      pacientes/          lista, cadastro, ficha, edição e importação
      agenda/             marcação, remarcação e situações
      busca/              busca global conforme o perfil
      relacionamento/     confirmações, retornos, tarefas e convites
  components/
    layout/               estrutura, menu, cabeçalho, perfil, selo, placeholder
    ui/                   cartão, botão, campo, situação, prioridade, lista, avatar, vazio
    overview/             indicadores, Linha do Dia, pendências, retornos, financeiro,
                          gráfico, aniversariantes, ações rápidas
    pacientes/            busca, lista, paginação, formulário, ficha, importador
    relacionamento/       botões de situação e preparo dos convites
  server/
    consultas/            leitura do banco — `server-only`, uma função por assunto
    acoes/                escrita no banco — `"use server"`, validação de verdade
  lib/
    supabase/             clientes de servidor, navegador e middleware; tipos gerados
    auth.ts               usuário da sessão com o perfil carregado
    dates.ts              todo cálculo de dia, no fuso da clínica
    format.ts             pt-BR: moeda, data, hora
    paciente.ts           regras do cadastro: CPF, telefone, endereço, validação
    csv.ts                leitor de CSV: separador, aspas, BOM, Latin-1
    importacao.ts         planilha → linhas validadas, sem gravar nada
    busca.ts              higienização do termo e interpretação de datas
    relacionamento.ts     validação de tarefas/retornos e mensagem de convite
    nav.ts                fonte única do menu
supabase/
  migrations/             estrutura do banco, versionada
docs/
  overview-sistema.md     este documento
  redesign                mockup do Google Stitch que define a identidade visual
```

Regras que valem para as próximas etapas:

- **Componente não conversa com o banco.** Leitura passa por
  `src/server/consultas/`, escrita por `src/server/acoes/`.
- **Toda escrita valida no servidor.** A validação do formulário é conveniência;
  quem envia por fora não passa por ela.
- **A chave `service_role` não entra na aplicação.** Quem decide o que cada
  pessoa enxerga é a RLS, a partir do usuário da sessão.
- Cor nenhuma fora de `globals.css`. Nada de `bg-[#ABC123]` no componente.
- **Vermelho tem dois papéis, e só dois.** Estado negativo (cancelado, vencido,
  não compareceu) e **dinheiro saindo** — todo valor de despesa é vermelho, na
  convenção contábil, por decisão da clínica. Pendência comum, confirmação em
  aberto e prazo se aproximando continuam sendo atenção, não erro.
- **Verde para o positivo e para dinheiro entrando.** Não é cor de marca — é
  resultado. O chip de situação segue semântico: despesa "paga" é verde no chip
  (tarefa resolvida) com o valor vermelho (saiu do caixa) — são eixos diferentes.
- **A taxa de cartão não herda o vermelho de despesa**: ela não é despesa — é
  dedução do líquido, mostrada como "−" na conta da venda.
- Situação e prioridade nunca são comunicadas só por cor — sempre acompanham texto
  e uma forma própria.
- Botão que não executa nada fica visivelmente indisponível, com a razão à vista.

---

## 9. Como executar

```bash
npm ci
npx supabase start       # banco local com todas as migrações e os dados de exemplo
npm run local:usuarios   # contas de teste dos três perfis
npm run dev              # http://localhost:3000
npm run lint             # ESLint, sem aviso tolerado
npm run typecheck        # TypeScript
npm test                 # unidade e componente
npm run test:banco       # permissões do banco, por perfil
npm run test:e2e         # fluxos e telas no navegador
```

O passo a passo completo está no [`README.md`](../README.md) e no
[`AGENTS.md`](../AGENTS.md) §2.

---

## 10. Módulo Pacientes (Etapa 3)

Primeiro módulo que escreve no banco. Serve de modelo para os próximos: mesma
divisão entre consulta, ação e componente, e a mesma postura de validar no
servidor.

### Telas

| Rota | O que faz |
|---|---|
| `/pacientes` | Lista em ordem alfabética, 20 por página, com busca e filtro por situação |
| `/pacientes/novo` | Cadastro. Só o nome é obrigatório |
| `/pacientes/[id]` | Ficha: cadastro, histórico de atendimentos, resumo, pendências e retornos |
| `/pacientes/[id]/editar` | Edição do mesmo formulário do cadastro |
| `/pacientes/importar` | Importação de planilha. Restrita à administradora |

### Busca

Cobre nome, nome social, e-mail e telefone. Quando o termo é só dígito, procura
também no CPF — a recepção digita `11987654321`, não o formato exato guardado.

O termo, o filtro e a página ficam na **URL**, não em memória: dá para recarregar,
voltar pelo navegador e mandar o link para outra pessoa. A digitação navega
sozinha depois de uma pausa de 350 ms, e o formulário continua sendo um
`form method="get"` — sem JavaScript, o Enter ainda busca.

Vírgula, parêntese, aspas, barra invertida, `*` e `%` são retirados do termo
antes de ele virar filtro. Os quatro primeiros são a gramática do próprio
PostgREST; os dois últimos viram curinga no `ilike`, e quem digitasse `%`
listaria a base inteira.

### Validação

O formulário valida antes de enviar, mas **a validação que vale é a do
servidor** — quem envia o formulário por fora não passa pela primeira. As duas
usam as mesmas funções de `src/lib/paciente.ts`, que por isso não é
`server-only`.

| Campo | Regra |
|---|---|
| Nome | Obrigatório, mínimo de 3 caracteres |
| CPF | Opcional. Quando informado, confere os dois dígitos verificadores e recusa sequências de um dígito só |
| Telefone | Opcional. DDD a partir de 11; celular com 11 dígitos precisa do 9 |
| E-mail | Opcional, checagem de forma |
| Data de nascimento | Não pode estar no futuro nem antes de 1900 |
| UF | Precisa estar na lista dos 27 estados |
| Origem | Lista fechada — texto livre não vira relatório depois |

CPF repetido é recusado pelo índice único do banco, não só pela tela: o erro
`23505` vira "Já existe uma paciente cadastrada com este CPF".

### Importação em massa

É como a clínica sai da planilha e entra no sistema. Dois passos: o primeiro lê
e mostra, o segundo grava. **Nada é gravado antes da confirmação.**

O leitor de CSV é escrito à mão, sem dependência nova, porque o que uma planilha
brasileira produz tem três particularidades que uma biblioteca genérica não
resolve sozinha:

| Particularidade | Tratamento |
|---|---|
| Separador `;` | O Excel em pt-BR usa ponto-e-vírgula, porque a vírgula já é o separador decimal. O separador é detectado, contando apenas fora das aspas — um endereço "Rua X, 100" não faz a vírgula vencer |
| Acento em Windows-1252 | "Salvar como CSV" grava em Latin-1. Tentamos UTF-8 em modo estrito primeiro; se os bytes não formarem UTF-8 válido, caímos em Windows-1252. A ordem importa: Latin-1 nunca falha, então testá-lo antes leria todo arquivo UTF-8 com acento errado. A tela avisa quando não era UTF-8 |
| BOM | O "CSV UTF-8" do Excel começa com uma marca invisível que grudaria no nome da primeira coluna |
| Data `dd/mm/aaaa` | Convertida para o formato do banco. Ano de dois dígitos é aceito com aviso, e a data interpretada aparece na prévia para conferência |

**As colunas são reconhecidas pelo nome**, sem acento e sem maiúscula:
"Celular", "Data de Nascimento", "E-mail", "Endereço" chegam ao campo certo. Só
a coluna do nome é obrigatória. Coluna que o sistema não usa é listada como
ignorada, em vez de fazer a importação falhar — a planilha da clínica tem
"Convênio" e o sistema ainda não tem onde guardar isso.

**A validação é a mesma do cadastro manual.** `validarPaciente` é chamada pelos
dois caminhos: um CPF recusado no formulário precisa ser recusado aqui também,
senão a importação vira a porta dos fundos das regras.

O que a prévia separa:

| Situação | O que acontece |
|---|---|
| Pronta | Entra |
| Com erro | Fica de fora, com o motivo por linha e o número da linha como aparece no Excel |
| Já cadastrada | Pulada. Só o CPF marca duplicata — homônimo existe, nome igual não prova que é a mesma pessoa |

CPF repetido **dentro do próprio arquivo** também é detectado: a primeira
ocorrência entra, as seguintes apontam para a linha original.

O arquivo é enviado nos dois passos e reprocessado no servidor. Devolver as
linhas já analisadas seria mais rápido, mas então o que entra no banco seria o
que o navegador disse ter lido — e não é ele quem decide.

A gravação vai em lotes de 100. Se um lote cair por causa de uma linha (alguém
cadastrou o mesmo CPF durante a importação), aquele lote é reenviado linha a
linha, para gravar o que dá e dizer exatamente qual ficou de fora.

**Restrita à administradora.** Isto é regra da aplicação, não do banco: a RLS
permite que a recepção cadastre paciente, porque cadastrar uma a uma é trabalho
dela. Trazer uma base inteira de uma vez é outra coisa. A checagem existe na
página e **de novo na ação de servidor** — esconder o botão não é proteger a rota.

Limites: 2 MB e 2000 linhas por arquivo.

### Arquivar em vez de apagar

Não existe excluir paciente. Ela tem atendimento, recebimento e — mais adiante —
documento assinado apontando para o cadastro; o banco recusaria a exclusão
(`on delete restrict`), e apagar histórico não é o que a clínica quer. Arquivar
tira da lista de ativas, preserva tudo e é reversível no clique seguinte.

### Decisões desta etapa

- **Nome social tem precedência em toda a interface.** O nome de registro só
  aparece na ficha e na lista, identificado como tal.
- **Observações são administrativas.** Preferência de horário, quem indicou,
  forma de contato. Conteúdo clínico vai para o prontuário — está escrito no
  próprio campo e no comentário da coluna no banco.
- **Endereço em `jsonb`**, lido com tolerância: registro antigo fora do formato
  não quebra a ficha.
- **Ficha inexistente e ficha sem permissão devolvem a mesma tela.** A RLS não
  distingue as duas, e a interface também não deve — dizer que o registro existe
  já é informação.

---

## 11. Módulo Agenda (Etapa 4)

Marcar, remarcar e acompanhar o dia. Mesma arquitetura do módulo Pacientes:
consulta, ação e componente, com validação de verdade no servidor.

### Telas

| Rota | O que faz |
|---|---|
| `/agenda?dia=AAAA-MM-DD` | O dia na ordem do relógio, com as ações de situação em cada cartão. O dia mora na URL |
| `/agenda/novo` | Marcar. Aceita `?paciente=` (vem da ficha) e `?dia=` (vem da agenda) |
| `/agenda/[id]/editar` | Remarcar, editar e a trilha de situações |

### Decisões

- **Escolher o procedimento preenche duração e valor da tabela**, editáveis
  caso a caso — o combinado pode ser outro.
- **Seletor de paciente busca no servidor** (mesma consulta e RLS da listagem),
  devolve até 8 opções e guarda só o `paciente_id`. A base nunca desce inteira.
- **Choque de horário é recusado** para o mesmo profissional, com o nome de
  quem já ocupa o horário. Cancelados e ausências liberam a vaga.
- **A situação não é máquina de estados rígida.** A interface oferece só os
  caminhos que fazem sentido (confirmar → iniciar → concluir; cancelado
  reabre como agendado), mas o servidor aceita qualquer situação válida —
  engano precisa ter volta. Toda mudança é gravada por gatilho no banco, com
  autor e hora, e aparece na tela de edição.
- **Os botões de situação funcionam sem JavaScript**: são formulários de
  verdade, um por transição.
- Hora é lida como **hora de parede da clínica** (`instanteNaClinica`), nunca
  do servidor.

---

## 12. Configurações: tabela de procedimentos

Primeira seção real do módulo Configurações. `/configuracoes` virou um hub —
Procedimentos funciona; equipe, dados da clínica, horário e permissões estão
marcados como "em breve".

| Rota | O que faz |
|---|---|
| `/configuracoes/procedimentos` | A tabela: nome, duração, valor de tabela, retorno sugerido e quantos atendimentos já usaram cada um |
| `/configuracoes/procedimentos/novo` | Cadastro. Restrito à administradora |
| `/configuracoes/procedimentos/[id]/editar` | Edição, com o aviso de que mudar o padrão não altera o que já foi marcado |

Decisões:

- **Todo mundo vê a tabela; só a administradora escreve** — na página e de novo
  na ação, espelhando a política `procedimentos_escrita` do banco. Quem não
  pode editar não vê os botões: botão que vai falhar é pior que botão ausente.
- **Procedimento não se apaga.** O histórico de atendimentos aponta para ele e
  o banco recusaria (`on delete restrict`). "Tirar da agenda" esconde das novas
  marcações — o formulário da Agenda só lista ativos — e preserva o passado.
- **Editar muda o padrão, não o passado.** Duração e valor gravados em cada
  atendimento são cópias do momento da marcação.
- **Produtos não existem no sistema.** "Produtos" hoje é só categoria de
  despesa. Estoque e venda de produto são decisão futura, com migration própria.

---

## 13. Módulo Financeiro (Etapa 5)

Vendas, recebimentos, despesas, taxas de cartão, movimentações e fluxo de
caixa. Seis áreas em abas dentro de `/financeiro`, todas com o mês na URL —
e as listas com filtros também na URL: situação, forma e busca por paciente
nas vendas; situação (incluindo a vencida derivada) e categoria nas despesas;
tipo nas movimentações. O filtro acontece depois da consulta, no servidor:
o volume é mensal, dezenas de linhas.

### O modelo

| Tabela | Papel |
|---|---|
| `vendas` | O fato gerador: paciente, procedimento, valores, forma, parcelas e a **cópia congelada da taxa** |
| `taxas_cartao` | Tabela padrão por operadora, tipo e parcelas. Alterar aqui vale só para as próximas vendas |
| `recebimentos` | Ganharam `venda_id`, `taxa_valor`, `valor_recebido` e o líquido calculado pelo banco |
| `venda_alteracoes` | Histórico imutável (sem UPDATE nem DELETE no banco): fotografia de antes e depois, motivo, autor e hora |
| `ajustes_financeiros` | A diferença quando a mudança acontece depois de o recebimento já estar confirmado |

### As regras que valem dinheiro

- **Cartão parcelado, repasse único.** A paciente parcela, a operadora
  antecipa, a clínica recebe uma vez — a taxa já inclui a antecipação. Uma
  venda em 5x gera UM recebimento. Não existem parcelas mensais de repasse.
- **A taxa é da clínica, não da paciente**: desconta do valor final, nunca
  acrescenta. `líquido = final − (final × taxa)`.
- **Centavos inteiros.** Todo cálculo em `lib/moeda.ts` usa inteiros; o
  percentual vira pontos-base (6,5% = 650) e há um único arredondamento por
  operação. E o banco confere de novo: `original − desconto = final` e
  `final − taxa = líquido` são CHECK constraints.
- **A taxa nunca conta duas vezes.** Ela é dedução do líquido; não existe como
  despesa. Resultado de caixa = líquido recebido − despesas pagas.
- **Gravação composta é função do banco.** `venda_registrar` e
  `venda_alterar_pagamento` fazem tudo ou nada, SECURITY INVOKER — a RLS de
  quem chama continua valendo.
- **Registro financeiro não se apaga.** Nenhuma tabela nova tem política de
  DELETE. Corrigir é cancelar, ajustar ou reabrir.

### Mudança de forma de pagamento e de taxa

Antes de confirmar, a tela mostra o comparativo antes → depois (forma,
parcelas, taxa, líquido) e exige motivo. Depois:

- Recebimento **ainda previsto**: é reescrito com os valores novos.
- Recebimento **já confirmado**: o registro original não é tocado — a
  diferença vira uma linha em `ajustes_financeiros`.
- Tudo entra em `venda_alteracoes`, com autor, data e hora.

Taxa manual exige justificativa, fica marcada na venda
("Taxa alterada manualmente") e **não toca a tabela padrão**.

### Situações

Recebimento: previsto · pendente · recebido · recebido com divergência
(valor efetivo ≠ líquido previsto — decidido pelo sistema, não por opinião) ·
cancelado. Despesa: pendente · paga · cancelada — "vencida" é derivada
(pendente com prazo no passado), nunca gravada, para não envelhecer errado.

### Permissões

| Ação | Recepção | Financeiro | Administradora |
|---|---|---|---|
| Registrar venda com taxa padrão | ✓ | ✓ | ✓ |
| Confirmar recebimento, lançar despesa | — | ✓ | ✓ |
| Alterar forma de pagamento / taxa (com motivo) | — | ✓ | ✓ |
| Configurar a tabela de taxas | — | — | ✓ |

Nas três camadas: interface (não oferece a porta), ação de servidor (recusa
com mensagem) e RLS/função do banco (recusa mesmo sem as outras duas).

---

## 14. Módulo Prontuários

O prontuário guarda o conteúdo clínico que evolui ao longo do atendimento. A rota
principal é `/prontuarios`; também há criação por paciente
(`/prontuarios/novo?paciente=`) e por atendimento
(`/prontuarios/novo?atendimento=`).

### O modelo

| Tabela | Papel |
|---|---|
| `prontuarios` | Cabeçalho atual: paciente, atendimento opcional, data do registro e título |
| `prontuario_versoes` | Conteúdo clínico versionado, com motivo, autor e data |

### Regras

- O acesso fica restrito à administradora até existir perfil clínico próprio.
- Criar prontuário grava cabeçalho e versão 1 na mesma transação.
- Editar cria nova versão; não há edição nem exclusão de versão existente.
- O conteúdo clínico tem seis campos: queixa/anamnese, avaliação, conduta,
  evolução, orientações e observações clínicas.
- Pelo menos um campo clínico precisa estar preenchido.

### Fotos de evolução

O registro visual do antes, durante e depois do tratamento. A galeria fica no
fim da página do prontuário.

| Onde | O quê |
|---|---|
| Bucket `prontuario-imagens` | O arquivo. Privado, 10 MB, só jpeg/png/webp. Exibição por URL assinada que expira em 15 minutos — nunca URL pública |
| `prontuario_imagens` | Caminho e metadados: nome original, tipo, tamanho, dimensões, legenda, data da captura e ordem |
| `prontuario_imagem_eliminacoes` | Por que cada foto foi eliminada, e a pedido de quem. Não se corrige nem se apaga |

Na tela:

- **Enviar** — várias fotos de uma vez (até 12), com a data da captura e uma
  legenda que valem para o lote. A data vem preenchida com a do registro do
  prontuário, que é o palpite mais provável.
- **Ampliar** — clique na foto abre em tamanho cheio, sem sair da página e sem
  expor o endereço da imagem na barra do navegador.
- **Corrigir** — legenda e data da captura mudam a qualquer momento.
- **Arquivar** — tira da ficha e preserva.
- **Eliminar** — pede motivo escrito e confirmação marcada.

Decisões:

- **A imagem pertence ao prontuário, não à versão do texto.** Versionar serve
  para o que se corrige; foto se acrescenta ou se remove. O eixo da evolução é a
  data da captura de cada foto — quando foi tirada, não quando foi enviada.
- **A galeria vai da mais antiga para a mais recente**, ao contrário do resto do
  sistema. Evolução se lê do antes para o depois.
- **Arquivar e eliminar são coisas diferentes.** Arquivar tira da tela e
  preserva (foto tremida, duplicada, mal enquadrada). Eliminar apaga de verdade,
  e existe por causa da LGPD: o art. 18 dá à paciente o direito de pedir a
  remoção da própria imagem. É a única exceção do sistema à regra de que
  registro não se apaga. Ficam guardados o motivo, quem eliminou e quando —
  prova de que a foto existiu e foi eliminada, sem a foto.
- **O arquivo sai antes da linha.** Se o armazenamento recusar a remoção, nada é
  eliminado: uma imagem no bucket sem nenhum registro apontando para ela seria
  dado de saúde sem dono e sem rastro.
- **Mesmo alcance do prontuário**: só a administradora, também no Storage.
- **Consentimento não está ligado ao sistema.** A paciente assina o termo (no
  módulo Documentos, quando existir) e tira as fotos; o banco não registra qual
  termo autorizou qual imagem. Decisão de 29/08/2026 — os dois módulos não se
  acoplam.
- **Não há reordenação manual** das fotos: dentro do mesmo dia, vale a ordem de
  envio.

## 15. Documentos e Contratos

Contratos de prestação de serviços, termos de consentimento e orientações
entregues às pacientes. A rota principal é `/formularios`; os modelos ficam em
`/formularios/modelos`.

### O modelo

| Tabela | Papel |
|---|---|
| `modelos_documento` | Texto-base de contrato, termo ou orientação. Cabeçalho: tipo, nome, descrição, se está em uso. |
| `modelo_documento_versoes` | Versões imutáveis do texto do modelo, com autor, data e motivo. |
| `documentos` | Documento emitido para uma paciente, com o **texto congelado** no momento da emissão e o hash desse texto. |
| `documento_assinaturas` | Evidência da assinatura: quem assinou, data e hora, IP, dispositivo, como a identidade foi conferida e o hash do que foi assinado. |
| `documento_campos` | Respostas da anamnese, com a pergunta congelada em cada linha. |

### Na tela

- **Modelos** — a administradora cadastra o texto-base e grava novas versões com
  motivo. A recepção consulta, para saber o que existe. Modelo se aposenta,
  nunca se apaga: ele explica os documentos que gerou.
- **Emitir** — escolhe a paciente e o modelo, confere a prévia e emite. O texto
  é copiado para o documento naquele instante.
- **Assinar** — a paciente lê na tela da clínica e a recepção registra nome, CPF
  (opcional) e como conferiu a identidade.
- **Cancelar** — para documento emitido por engano, com motivo. Assinado não
  cancela: emite-se um novo corrigindo, e o antigo fica marcado como
  substituído.

### Anamnese

A anamnese é um documento como os outros, com uma diferença de natureza:
**ela não se assina, ela se preenche** — e a resposta pode ser corrigida
sempre que for preciso. Contrato é um acordo que congela; anamnese é ficha
clínica, que acompanha a paciente.

O modelo define as perguntas, e cada pergunta tem um tipo:

| Tipo | Para quê |
|---|---|
| Texto curto | Nome de medicamento, profissão |
| Texto longo | "Descreva sua rotina de cuidados" |
| Sim ou não | "Faz uso de anticoncepcional?" |
| Escolha uma opção | Tipo de pele, frequência |
| Escolha várias opções | "Marque o que já fez": botox, preenchimento, peeling |
| Data | Última menstruação, data de uma cirurgia |
| Número | Peso, altura, há quantos anos |

Cada pergunta pode ser marcada como obrigatória e ganhar um texto de apoio.

**Dois caminhos para preencher**, e os dois gravam no mesmo lugar:

- **Na consulta** — a administradora abre a anamnese e preenche com a paciente
  ao lado.
- **Pelo link** — a paciente recebe o mesmo tipo de link dos contratos,
  confirma a data de nascimento e responde de casa, antes de vir. Pode salvar
  pela metade e voltar para completar enquanto o link valer.

Salvar não exige ter respondido tudo: anamnese se preenche aos poucos, e
guardar metade é melhor do que perder tudo porque falta uma resposta. A tela
mostra quantas foram respondidas e quantas obrigatórias faltam.

**A pergunta congela; a resposta, não.** Se o modelo mudar depois, a anamnese
já emitida continua mostrando exatamente o que foi perguntado — senão a
resposta passaria a responder outra coisa. E cada mudança de resposta fica na
auditoria, com autor, data e valor anterior: "ela declarou que não tinha
alergia" continua tendo prova.

### Congelar o texto é o ponto central

Se o modelo de contrato mudar em março, o contrato assinado em janeiro continua
exibindo exatamente o que a paciente leu e aceitou. O documento guarda a cópia
integral do texto e a impressão digital dela (SHA-256).

Duas garantias sustentam isso, e as duas moram no banco, não na tela:

- **O texto que congela é lido do banco na emissão**, não enviado pela tela. Se
  viesse de fora, quem chamasse a interface de programação escolheria o que o
  hash iria atestar.
- **Alterar o corpo de um documento emitido é recusado pelo banco.** Não é uma
  promessa da aplicação — é um gatilho que levanta erro.

### Assinatura

A Lei 14.063/2020 reconhece três níveis de assinatura eletrônica. Para contrato
entre particulares, a assinatura simples é válida — a diferença entre os níveis
está na força da prova, caso alguém conteste.

| Caminho | Custo | Força da prova |
|---|---|---|
| Assinatura dentro do sistema, com trilha de evidências | R$ 0 | Simples. Válida, mas contestável. |
| Plataforma especializada (ZapSign, Clicksign, Autentique) | R$ 30 a R$ 50/mês | Trilha auditável independente e PDF com log próprio. |

**Decidido:** a assinatura é feita dentro do sistema, e o passo da assinatura
fica isolado atrás de uma interface. Trocar para Autentique, ZapSign ou
Clicksign depois é implementar um novo conector — não redesenhar o módulo. Por
isso `documento_assinaturas` já nasce com os campos de referência externa
(`provedor`, `referencia_externa`, `url_comprovante`), vazios enquanto a
assinatura for interna.

**Há dois caminhos, e o registro diz qual foi usado**, porque a força da prova
não é a mesma:

| Caminho | Como a identidade é conferida | Prova |
|---|---|---|
| **Link** — a paciente assina de onde estiver | Posse do link + data de nascimento | Mais fraca |
| **Balcão** — a paciente assina na clínica | Alguém confere documento com foto | Mais forte |

O IP e o dispositivo são capturados da própria requisição, não digitados:
evidência que o assinante pudesse escrever não serviria de evidência.

### O link de assinatura

A recepção gera um link, escolhe a validade (7, 15 ou 30 dias) e anota por onde
vai enviá-lo — esse canal entra na evidência da assinatura. A paciente abre,
**confirma a própria data de nascimento**, lê o documento e assina escrevendo o
nome completo.

Três cuidados, porque um link de WhatsApp é encaminhado, fotografado e vai parar
em backup de nuvem:

- **A data de nascimento é um segundo fator.** Sem ela, quem recebesse o link
  encaminhado por engano leria o contrato e poderia assinar no lugar da
  paciente.
- **O link se fecha após dez tentativas erradas.** Data de nascimento tem poucas
  combinações; sem esse limite, quem tivesse o link poderia varrê-las.
- **O endereço aparece uma vez só.** O sistema guarda apenas uma impressão
  digital do link, não o link. Se a clínica perder o endereço, gera outro — e o
  anterior é cancelado automaticamente. Um link só fica vivo por documento.

A clínica pode cancelar o link a qualquer momento, e vê na ficha do documento
se já foi aberto e quantas vezes.

### A via da paciente

Assim que assina, a paciente vê o documento assinado por inteiro, com a data, a
hora e a identificação do texto, e um botão **"Salvar em PDF ou imprimir"**.
Quem assina um contrato tem direito à via do que assinou.

O link **continua valendo até o prazo dele**, em modo leitura: ela pode voltar
depois, confirmar a data de nascimento de novo e salvar a via outra vez. É o
mesmo grau de acesso de antes de assinar — a proteção não mudou.

Se a clínica quiser encurtar essa janela, escolhe 7 dias na emissão, ou cancela
o link depois que a paciente confirmar que guardou o arquivo.

O arquivo sai pela impressão do navegador, com "Salvar como PDF" — o caminho
que funciona em qualquer aparelho. O que sai no papel é só o documento e o bloco
da assinatura; cabeçalho, botões e avisos ficam de fora.

**A paciente não faz login em nada** e não cria conta. A página de assinatura é
a única rota pública que serve conteúdo de paciente; o que ela mostra depende
inteiramente do link e da data de nascimento. As outras rotas públicas de
recuperação de senha atendem apenas aos usuários internos da clínica.

### Quem pode o quê

| O quê | Quem |
|---|---|
| Criar, versionar e aposentar modelos | Só a administradora |
| Consultar modelos | Todos os perfis |
| Emitir, assinar e cancelar contrato, termo e orientação | Todos os perfis |
| Anamnese — emitir, preencher e corrigir | Só a administradora, como o prontuário |

### O que ainda não existe

- **PDF montado pelo sistema.** Hoje o arquivo sai pela impressão do navegador, que basta para a via da paciente. Um PDF com cabeçalho fixo e paginação própria fica para quando houver necessidade.

## 16. Relacionamento

A rota `/relacionamento` reúne a fila de acompanhamento e cinco frentes de
trabalho: confirmações de consultas nos próximos 15 dias, retornos, tarefas,
aniversários e convites para avaliação no Google. Confirmações atualizam a
situação da agenda; retornos usam a data combinada pela equipe; tarefas podem
ser criadas, concluídas, canceladas e reabertas. Nenhuma data de retorno é
calculada como recomendação clínica.

O convite de avaliação usa o [link direto da clínica no Google](https://g.page/r/CYXDzsOMXUv5ECE/review).
A lista traz pacientes ativas com atendimento concluído recente e a equipe
também pode buscar outra paciente ativa. Ela abre o WhatsApp com o texto pronto
ou copia a mensagem e a envia pelo canal adequado.
Depois marca o envio; o sistema grava paciente, responsável e hora em uma
pendência concluída e evita outro registro do mesmo contato para a mesma
paciente no dia. O mesmo fluxo vale para a mensagem de aniversário. Não há
envio automático nem leitura das avaliações recebidas no Google. O registro
representa a confirmação da equipe, não uma prova de entrega ou de avaliação.

As tarefas são criadas em `/relacionamento/tarefas/nova`, com tipo, prioridade,
descrição, paciente e prazo opcionais. Os retornos são criados em
`/relacionamento/retornos/novo`, sempre com paciente e data escolhida pela
equipe. Os botões de situação verificam sessão e dados no servidor antes de
escrever. A agenda registra a trilha da confirmação pelo gatilho já existente.

O módulo usa as tabelas `atendimentos`, `retornos` e `pendencias`, sem migração
nova. Como `pendencias` ainda permite exclusão pela RLS, o registro de contato
não deve ser tratado como uma trilha imutável de auditoria.

## 17. Busca global

O campo do cabeçalho envia um formulário GET para `/busca?q=...`, sem depender
de JavaScript; no celular há um atalho para a mesma página. A pesquisa exige
pelo menos dois caracteres, corta o termo em 80 e higieniza caracteres que
alterariam a gramática dos filtros do PostgREST. A página mantém o termo na URL
e reúne resultados por categoria:
pacientes (incluindo arquivadas), atendimentos, documentos e, apenas para a
administradora, prontuários. A consulta usa a sessão atual e a RLS de cada
tabela; não inclui conteúdo clínico nem indicadores financeiros.

Atendimentos podem ser encontrados pelo nome ou contato da paciente, pelo
procedimento ou por uma data em `dd/mm/aaaa` ou `aaaa-mm-dd`. O resultado abre
o cartão correspondente na Agenda. A prévia limita-se a oito atendimentos;
quando houver mais, a equipe refina o termo. Pacientes, documentos e
prontuários têm links para as respectivas listagens com a mesma busca.
Não houve migração: a busca lê as tabelas e respeita as permissões existentes.

## 18. Recuperação de senha

O link **“Esqueci minha senha”** no login abre `/recuperar-senha`. A pessoa
informa o e-mail; o navegador pede ao Supabase Auth um link que retorna a
`/redefinir-senha`. Após um pedido aceito, a resposta da tela é igual para
e-mail cadastrado ou desconhecido, para não revelar quem tem acesso ao sistema.
Erros de limite de tentativas e de conexão recebem mensagens próprias.

A página de nova senha valida o link de recuperação pelo `token_hash` ou pelo
evento `PASSWORD_RECOVERY` do fluxo PKCE. Retira o token da barra de endereços,
guarda na aba uma marca de 15 minutos vinculada ao usuário e mostra o formulário
somente após essa validação. Link inválido ou vencido leva a pedir outro. A
senha precisa ter pelo menos 12 caracteres e coincidir com a confirmação.
Depois de `updateUser()`, o cliente encerra a sessão local e volta ao login com
o aviso de sucesso. Uma sessão comum, sem o fluxo de recuperação, não abre o
formulário de troca.

As duas rotas são públicas no middleware e só usam o Supabase Auth; não houve
migração. Para operar fora do ambiente local, ainda é preciso cadastrar a URL
exata de retorno e configurar SMTP no projeto Supabase. O modelo de e-mail, o
redirecionamento e os limites do SMTP padrão estão em
[`supabase/README.md`](../supabase/README.md#recuperação-de-senha).

## 19. Aviso de hidratação causado por extensão

O aviso observado na rota de Relacionamento apontava para o `<html>`: uma
extensão do navegador havia inserido o atributo
`data-gitmind-ai-assistant-color-mode="light"` antes de o React hidratar a
página. O layout raiz passou a usar `suppressHydrationWarning` nesse elemento.
Isso silencia a divergência de atributos no `<html>`; não alcança componentes
internos nem substitui a correção de uma diferença real entre HTML do servidor
e do cliente. Se surgir um aviso em outro nó, confira esse nó e os valores que
o geraram.

## 20. Auditoria de setembro de 2026

Revisão completa do sistema contra o schema efetivo (as migrações aplicadas em
ordem num banco limpo) e contra o código, com correção do que era técnico e
registro do que depende da clínica. O detalhe de cada regra está no
[`AGENTS.md`](../AGENTS.md); aqui fica o que mudou para quem usa e o porquê.

### O banco passou a garantir o que antes era só da tela

- **Nada se apaga pela API**, exceto foto de prontuário a pedido da titular
  (LGPD). Recebimento, despesa, taxa, paciente, atendimento e tarefa de contato
  perderam o DELETE que ainda tinham. Mudanças em despesas, taxas, retornos,
  tarefas, procedimentos, profissionais e perfis passaram a entrar na auditoria.
- **Taxa de cartão conferida na origem.** Uma venda no cartão só grava o
  percentual da tabela padrão (ou taxa manual, pelo financeiro), e o valor da
  taxa precisa bater com o arredondamento do sistema. Venda em PIX ou dinheiro
  não tem taxa.
- **Recebimento confirmado não muda mais** — a diferença de uma correção
  posterior entra como ajuste, como sempre foi a regra.
- **Duas recepcionistas não marcam o mesmo horário.** A conferência de choque
  passou a valer no banco, com uma trava por profissional. Reabrir um
  atendimento cancelado cujo horário foi ocupado pede para remarcar.
- **Documento e assinatura à prova da API.** Documento só nasce do texto do
  modelo e só muda de situação; a evidência da assinatura (hash, hora, canal,
  quem colheu) é escrita pelo banco; a pergunta da anamnese não muda depois de
  emitida. No link público, dez tentativas de data errada são exatamente dez.

### Erros que se veem

- Nenhuma mensagem do banco em inglês ou com detalhe técnico chega à tela. O
  que falha diz em português o que fazer; o detalhe vai para o log do servidor,
  sem dado de paciente.
- Os botões de ação (mudar situação, arquivar, ativar, revogar, pagar) mostram
  a recusa ao lado do botão. Antes, se o banco recusasse, nada acontecia e
  ninguém era avisado.
- Toda tela tem estado de carregamento e de erro, com "Tentar de novo". O login
  distingue senha errada de serviço fora do ar.

### Interface

- Campo com erro fica com borda vermelha (a regra de CSS perdia para a borda
  neutra) e é anunciado junto do campo pelo leitor de tela.
- A navegação de dias da Agenda voltou a ser uma linha (setas e data).
- Nada rola na horizontal no celular: filtros e abas rolam dentro de si, ações
  de cabeçalho quebram de linha, o nome do aniversariante não é mais espremido.
- O seletor de paciente funciona pelo teclado (setas, Enter, Esc).
- O menu do celular prende o foco enquanto está aberto e some da ordem do Tab
  quando fechado.
- O Relacionamento passou a usar os mesmos componentes do resto do sistema.
- A faixa de demonstração vem do layout e fala com quem usa o sistema.
- O atalho de registro clínico só aparece para a administradora.

### Testes

O sistema passou a ter suíte automatizada: regras de dinheiro, datas,
validações, CSV e erros; ações de servidor e componentes; permissões do banco
por perfil; e fluxos de ponta a ponta com todas as telas em três larguras.
Nada roda contra produção — tudo usa o Supabase local.

### Pendente de aplicação em produção

As migrações 0019 a 0022 foram escritas e testadas no banco local, **não
aplicadas em produção**. O dono do projeto aplica com `npm run db:push` e
confere com `npm run db:tipos` (os tipos públicos não mudam). Ver
[`supabase/README.md`](../supabase/README.md).

