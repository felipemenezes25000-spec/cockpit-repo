# Cockpit — Consultório Dra. Érika Passos

Documento de referência do sistema. Registra o propósito, o que já existe e o que
ainda é provisório. Atualizado em **agosto de 2026**.

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
| Documentos e Contratos | `/formularios` | Contratos de prestação de serviços, anamneses, termos e orientações |
| Relacionamento | `/relacionamento` | Confirmações, retornos, aniversários e pesquisas |
| Relatórios | `/relatorios` | Indicadores de atendimento e faturamento |
| Configurações | `/configuracoes` | Clínica, equipe, procedimentos e preferências |

---

## 4. O que foi implementado nesta etapa

### Estrutura e navegação

- Estrutura principal reutilizável, com menu lateral, cabeçalho e área de conteúdo.
- Menu lateral com os nove módulos, indicação da página atual (cor de fundo, cor do
  texto, barra à esquerda e `aria-current`), recolhimento para faixa de ícones no
  computador e gaveta sobreposta no celular e no tablet.
- Cabeçalho com título da página, data de hoje por extenso, campo de busca apenas
  visual, ícone de notificações com a contagem de pendências de prioridade alta e
  menu de perfil do usuário demonstrativo.
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

As rotas de módulo ainda sem implementação existem e são acessíveis. Cada uma
mostra o nome do módulo, sua finalidade, a lista do que vai trazer nas próximas
etapas, o aviso de que está em construção e um botão de volta para a Visão Geral.

### Base técnica

- Next.js 15 com App Router, TypeScript em modo estrito e Tailwind CSS v4.
- `lucide-react` como única dependência além do próprio framework, para manter os
  ícones consistentes.
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
| Busca global no cabeçalho | Apenas visual, marcada como indisponível. A busca dos módulos Pacientes e Prontuários funciona. |
| Ícone de notificações | Mostra a contagem de pendências altas, mas não abre nada. |
| Menu de perfil | Opções visíveis e desabilitadas, com a razão no `title`. |
| Botões "Resolver" das pendências | Navegam para o módulo correspondente; não resolvem nada. |
| Botão "Enviar mensagem" dos aniversariantes | Visivelmente indisponível. |
| Ações rápidas | Nova paciente, novo agendamento, prontuário e venda abrem fluxo real; criar tarefa ainda para em Relacionamento. |
| Páginas de módulo restantes | Documentos, Relacionamento e Relatórios só descrevem o que virá. Configurações ainda é parcial. |
| Períodos de retorno | Demonstrativos. Não são recomendação clínica. |
| Números financeiros | Identificados como demonstrativos na própria tela. |

---

## 6. O que não faz parte desta etapa

Assinatura de termos · integração com Google Calendar ·
integração com WhatsApp · envio de e-mails · emissão de nota fiscal ·
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
7. **Tratamento do fuso horário.** As datas fictícias são criadas como horário de
   parede local. Se o sistema for hospedado em servidor com fuso diferente do
   Brasil, essa decisão precisa ser revista.
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
    layout.tsx            fontes e idioma
    globals.css           tokens de cor, tipografia, raio e sombra
    entrar/               login: página, formulário e ação
    sem-acesso/           conta existe mas não foi liberada
    (app)/
      layout.tsx          estrutura principal, exige sessão válida
      page.tsx            Visão Geral
      pacientes/          lista, cadastro, ficha, edição e importação
      agenda/ …           sete páginas provisórias
  components/
    layout/               estrutura, menu, cabeçalho, perfil, selo, placeholder
    ui/                   cartão, botão, campo, situação, prioridade, lista, avatar, vazio
    overview/             indicadores, Linha do Dia, pendências, retornos, financeiro,
                          gráfico, aniversariantes, ações rápidas
    pacientes/            busca, lista, paginação, formulário, ficha, importador
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
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

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

## 15. Contratos e documentos assinados (planejado)

A clínica precisa de contratos de prestação de serviços assinados pela paciente,
além das anamneses e termos de consentimento. Contrato e anamnese têm naturezas
diferentes e o modelo separa as duas:

- **Anamnese e ficha clínica** — conteúdo que evolui. Versionado, com autor e
  data em cada versão.
- **Contrato e termo** — depois de assinado, não muda mais. Uma correção gera um
  novo documento que referencia o anterior.

### Modelo previsto

| Tabela | Papel |
|---|---|
| `modelos_documento` | Texto-base de contrato, anamnese, termo ou orientação. Versionado — alterar o modelo não altera o que já foi assinado. |
| `documentos` | Documento emitido para uma paciente, com o **texto congelado** no momento da emissão e o hash desse texto. |
| `documento_assinaturas` | Evidência da assinatura: quem assinou, data e hora, IP, dispositivo, como a identidade foi verificada e o hash do que foi assinado. |
| `documento_campos` | Respostas de formulário, quando o documento for anamnese. |

O ponto central é **congelar o texto na emissão**. Se o modelo de contrato mudar
em março, o contrato assinado em janeiro continua exibindo exatamente o que a
paciente leu e aceitou.

### Assinatura

A Lei 14.063/2020 reconhece três níveis de assinatura eletrônica. Para contrato
entre particulares, a assinatura simples é válida — a diferença entre os níveis
está na força da prova, caso alguém conteste.

| Caminho | Custo | Força da prova |
|---|---|---|
| Assinatura dentro do sistema, com trilha de evidências | R$ 0 | Simples. Válida, mas contestável. |
| Plataforma especializada (ZapSign, Clicksign, Autentique) | R$ 30 a R$ 50/mês | Trilha auditável independente e PDF com log próprio. |

**Decidido:** a assinatura será feita dentro do sistema, com trilha de evidências
própria, e o passo da assinatura fica isolado atrás de uma interface. Trocar para
Autentique, ZapSign ou Clicksign depois é implementar um novo conector — não
redesenhar o módulo. Por isso `documento_assinaturas` já nasce com os campos de
referência externa (`provedor`, `referencia_externa`, `url_comprovante`), vazios
enquanto a assinatura for interna.
