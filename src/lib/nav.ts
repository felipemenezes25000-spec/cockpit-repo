import {
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardPlus,
  FileSignature,
  LayoutGrid,
  MessageCircleHeart,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Frase curta usada no cabeçalho da página e no placeholder do módulo. */
  finalidade: string;
  /** O que este módulo vai passar a fazer nas próximas etapas. */
  proximosPassos: string[];
};

/**
 * Fonte única do menu. Sidebar, cabeçalho e páginas provisórias leem daqui —
 * assim rótulo, ícone e rota nunca saem de sincronia.
 */
export const MENU: ItemMenu[] = [
  {
    href: "/",
    rotulo: "Visão Geral",
    icone: LayoutGrid,
    finalidade:
      "O dia da clínica em uma tela: atendimentos, pendências e resultados.",
    proximosPassos: [],
  },
  {
    href: "/agenda",
    rotulo: "Agenda",
    icone: CalendarDays,
    finalidade:
      "Marcar, remarcar e acompanhar os atendimentos da clínica por dia, semana e profissional.",
    // Marcar, remarcar, confirmar e mudar situação já existem. Fica o que falta.
    proximosPassos: [
      "Visualização por semana e por profissional",
      "Bloqueio de horários e intervalos",
      "Sincronização com o Google Calendar",
    ],
  },
  {
    href: "/pacientes",
    rotulo: "Pacientes",
    icone: Users,
    finalidade:
      "Cadastro e histórico de cada paciente, com contatos, procedimentos realizados e observações.",
    // Cadastro, busca, ficha e linha do tempo já existem — o módulo não usa
    // mais a página provisória. Aqui fica só o que ainda falta.
    proximosPassos: [
      "Filtros por procedimento e período",
      "Anexos e fotos de evolução",
      "Junção de cadastros duplicados",
      "Exportação da ficha em PDF",
      "Importação de planilha em .xlsx, sem converter para CSV",
    ],
  },
  {
    href: "/prontuarios",
    rotulo: "Prontuários",
    icone: ClipboardPlus,
    finalidade:
      "Registro clínico de cada atendimento: anamnese, avaliação, conduta e evolução.",
    proximosPassos: [
      "Anamnese por tipo de procedimento",
      "Registro de conduta e produtos aplicados",
      "Evolução entre sessões",
      "Controle de acesso por perfil profissional",
    ],
  },
  {
    href: "/financeiro",
    rotulo: "Financeiro",
    icone: Wallet,
    finalidade:
      "Recebimentos, despesas, formas de pagamento e acompanhamento do que está em aberto.",
    proximosPassos: [
      "Lançamento de recebimentos e despesas",
      "Parcelamentos e formas de pagamento",
      "Contas a receber e cobrança",
      "Fechamento mensal e exportação",
    ],
  },
  {
    href: "/formularios",
    rotulo: "Documentos e Contratos",
    icone: FileSignature,
    finalidade:
      "Contratos de prestação de serviços, anamneses, termos de consentimento e orientações entregues às pacientes.",
    proximosPassos: [
      "Modelos de contrato, anamnese e termo por procedimento",
      "Envio para a paciente ler e assinar",
      "Assinatura com registro de data, hora e autoria",
      "Arquivo do que foi assinado, sem alteração posterior",
      "Histórico de versões de cada modelo",
    ],
  },
  {
    href: "/relacionamento",
    rotulo: "Relacionamento",
    icone: MessageCircleHeart,
    finalidade:
      "Acompanhamento antes e depois do atendimento: confirmações, retornos, aniversários e pesquisas.",
    proximosPassos: [
      "Régua de contato por etapa do atendimento",
      "Lembretes de confirmação e de retorno",
      "Pesquisa de satisfação",
      "Mensagens de aniversário",
    ],
  },
  {
    href: "/relatorios",
    rotulo: "Relatórios",
    icone: ChartNoAxesColumn,
    finalidade:
      "Indicadores de atendimento, faturamento, procedimentos mais realizados e retorno de pacientes.",
    proximosPassos: [
      "Faturamento por período e por procedimento",
      "Taxa de comparecimento e de retorno",
      "Desempenho por profissional",
      "Exportação dos resultados",
    ],
  },
  {
    href: "/configuracoes",
    rotulo: "Configurações",
    icone: Settings,
    finalidade:
      "Dados da clínica, equipe, procedimentos, horários de atendimento e preferências do sistema.",
    proximosPassos: [
      "Dados da clínica e da equipe",
      "Tabela de procedimentos e valores",
      "Horários de funcionamento",
      "Perfis de acesso e permissões",
    ],
  },
];

export function itemPorHref(href: string): ItemMenu | undefined {
  return MENU.find((item) => item.href === href);
}

/** Item ativo considerando subrotas (/pacientes/123 → Pacientes). */
export function itemAtivo(caminho: string): ItemMenu | undefined {
  if (caminho === "/") return MENU[0];
  return MENU.find((item) => item.href !== "/" && caminho.startsWith(item.href));
}

/** Identidade da clínica, exibida no topo do menu lateral e no login. */
export const CLINICA = {
  nome: "Dra. Érika Passos",
  descricao: "Consultório de estética",
  monograma: "ÉP",
} as const;
