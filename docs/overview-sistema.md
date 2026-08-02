# Cockpit — Consultório Dra. Érika Passos

Documento de referência do sistema. Registra o propósito, o que já existe e o que
ainda é provisório. Atualizado ao final da **Etapa 1**.

> Todo o conteúdo exibido no sistema hoje é fictício. Nenhum dado real da clínica
> foi utilizado.

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

A Etapa 2 implementa **dois perfis**. O perfil Profissional fica para quando a
equipe crescer.

| Perfil | Quem é | O que pode fazer |
|---|---|---|
| **Administradora** | Dra. Érika Passos | Acesso completo, incluindo despesas, relatórios, configurações e trilha de auditoria |
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
| Prontuários | `/prontuarios` | Registro clínico do atendimento |
| Financeiro | `/financeiro` | Recebimentos, despesas e valores em aberto |
| Formulários e Termos | `/formularios` | Contratos de prestação de serviços, anamneses, termos e orientações |
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

- **Ações rápidas** — cinco atalhos que navegam de verdade para os módulos.
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

### Páginas provisórias

As oito rotas de módulo existem e são acessíveis. Cada uma mostra o nome do
módulo, sua finalidade, a lista do que vai trazer nas próximas etapas, o aviso de
que está em construção e um botão de volta para a Visão Geral.

### Base técnica

- Next.js 15 com App Router, TypeScript em modo estrito e Tailwind CSS v4.
- `lucide-react` como única dependência além do próprio framework, para manter os
  ícones consistentes.
- Tipografia Hanken Grotesk, carregada por `next/font` — sem requisição a serviço
  externo em tempo de execução.
- Cores, raios e sombras definidos como tokens em `src/app/globals.css`.
- Valores em reais e datas no padrão brasileiro; interface inteira em português.

### Identidade visual

A interface segue o mockup em `docs/redesign`, gerado no Google Stitch. É um
sistema Material 3 de verde clínico sobre branco:

| Papel | Cor |
|---|---|
| Página | `#FFFFFF` |
| Painel | `#F9F9F9` com borda `#E5E5E5` |
| Cartão interno | `#FFFFFF` |
| Verde principal | `#334537` |
| Verde de ação | `#4A5D4E` |
| Verde claro de apoio | `#D8E8CA` |
| Texto | `#1C1B1B` · secundário `#434843` · terciário `#737872` |
| Erro | `#BA1A1A` |

Decisões tomadas a partir do mockup:

- **Ícones**: o mockup usa Material Symbols, que o `next/font` não hospeda. Ficou
  `lucide-react` com traço 1.5, que imita o peso 300 do Material sem exigir
  requisição externa nem provocar piscada no carregamento.
- **Situações do atendimento**: o mockup define três (Concluído, Em atendimento,
  Confirmado). As outras quatro foram derivadas dentro da mesma paleta, com
  matizes distintas entre si — e todas continuam levando ícone e texto, nunca só
  cor.
- **Foto do usuário**: o mockup usa uma foto de banco de imagens. Foi mantido o
  avatar de iniciais, para não apresentar a foto de outra pessoa como sendo a
  Dra. Érika.
- **Menu**: o mockup mostra cinco itens; o sistema mantém os nove módulos
  previstos para a Etapa 1.

---

## 5. O que ainda é provisório

| Item | Situação |
|---|---|
| Todos os dados | Fictícios, em `src/data/`. Nenhuma persistência. |
| Usuário "Dra. Érika Passos — Administradora" | Fixo no código, sem autenticação. |
| Busca global no cabeçalho | Apenas visual, marcada como indisponível. |
| Ícone de notificações | Mostra a contagem de pendências altas, mas não abre nada. |
| Menu de perfil | Opções visíveis e desabilitadas, com a razão no `title`. |
| Botões "Resolver" das pendências | Navegam para o módulo correspondente; não resolvem nada. |
| Botão "Enviar mensagem" dos aniversariantes | Visivelmente indisponível. |
| Ações rápidas | Navegam para as páginas provisórias; não abrem formulário. |
| Oito páginas de módulo | Só descrevem o que virá. |
| Períodos de retorno | Demonstrativos. Não são recomendação clínica. |
| Números financeiros | Identificados como demonstrativos na própria tela. |

---

## 6. O que não faz parte desta etapa

Banco de dados real · login e autenticação · controle definitivo de permissões ·
cadastro completo de pacientes · prontuário funcional · upload de fotos ·
assinatura de termos · integração com Google Calendar · integração com WhatsApp ·
envio de e-mails · emissão de nota fiscal · processamento de pagamentos · regras
de lucro ou saldo · automações · inteligência artificial · dados reais.

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
9. **Método de assinatura dos contratos.** Assinatura eletrônica simples feita
   dentro do próprio sistema, com trilha de evidências, ou integração com uma
   plataforma especializada. Ver a seção 10.

---

## 8. Organização do código

```
src/
  app/
    layout.tsx            fontes e idioma
    globals.css           tokens de cor, tipografia, raio e sombra
    (app)/
      layout.tsx          estrutura principal
      page.tsx            Visão Geral
      agenda/ …           oito páginas provisórias
  components/
    layout/               estrutura, menu, cabeçalho, perfil, selo, placeholder
    ui/                   cartão, botão, situação, prioridade, lista, avatar, estado vazio
    overview/             indicadores, Linha do Dia, pendências, retornos, financeiro,
                          gráfico, aniversariantes, ações rápidas
  data/                   dados fictícios e indicadores derivados
  lib/                    menu, formatação pt-BR, datas, utilidades
docs/
  overview-sistema.md     este documento
  redesign                mockup do Google Stitch que define a identidade visual
```

Regras que valem para as próximas etapas:

- Nenhum número da interface é escrito direto no componente: tudo passa por
  `src/data/selectors.ts`.
- Cor nenhuma fora de `globals.css`.
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

## 10. Contratos e documentos assinados (Etapa 5)

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

Decisão pendente — ver seção 7, item 9. A modelagem acima serve aos dois
caminhos: `documento_assinaturas` guarda a evidência local, e o campo de
referência externa acomoda o identificador da plataforma, se ela for adotada.
