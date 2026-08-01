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
    proximosPassos: [
      "Visualização por dia, semana e profissional",
      "Bloqueio de horários e intervalos",
      "Confirmação de presença pela recepção",
      "Sincronização com o Google Calendar",
    ],
  },
  {
    href: "/pacientes",
    rotulo: "Pacientes",
    icone: Users,
    finalidade:
      "Cadastro e histórico de cada paciente, com contatos, procedimentos realizados e observações.",
    proximosPassos: [
      "Cadastro completo com dados de contato",
      "Busca e filtros por procedimento e período",
      "Linha do tempo de atendimentos",
      "Anexos e fotos de evolução",
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
    rotulo: "Formulários e Termos",
    icone: FileSignature,
    finalidade:
      "Modelos de anamnese, termos de consentimento e orientações entregues às pacientes.",
    proximosPassos: [
      "Biblioteca de modelos por procedimento",
      "Preenchimento pela paciente antes do atendimento",
      "Assinatura e arquivamento do termo",
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

export const USUARIO_DEMO = {
  nome: "Dra. Érika Passos",
  papel: "Administradora",
  registro: "Responsável técnica",
} as const;
