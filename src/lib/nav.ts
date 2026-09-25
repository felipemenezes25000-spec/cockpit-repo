import {
  CalendarDays,
  ChartNoAxesColumn,
  ClipboardPlus,
  FileSignature,
  LayoutGrid,
  MessageCircleHeart,
  Settings,
  Target,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Papel } from "./perfil";

export type ItemMenu = {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Nome curto para a barra de módulos, quando o nome inteiro não cabe. */
  rotuloCurto?: string;
  /** Frase curta usada no cabeçalho da página e no placeholder do módulo. */
  finalidade: string;
  /** O que este módulo vai passar a fazer nas próximas etapas. */
  proximosPassos: string[];
  /**
   * Módulo que ainda é só a página provisória. O menu mostra "em breve" ao
   * lado, para ninguém clicar esperando uma tela pronta.
   */
  emConstrucao?: boolean;
};

/**
 * Fonte única do menu. Barra de módulos, gaveta, paleta e páginas provisórias
 * leem daqui — assim rótulo, ícone e rota nunca saem de sincronia.
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
      "Cobrança automática do que venceu",
      "Exportação para contabilidade",
      "Emissão de nota fiscal",
    ],
  },
  {
    href: "/formularios",
    rotulo: "Documentos e Contratos",
    rotuloCurto: "Documentos",
    icone: FileSignature,
    finalidade:
      "Contratos de prestação de serviços, anamneses, termos de consentimento e orientações entregues às pacientes.",
    proximosPassos: ["PDF montado pelo sistema, com paginação própria"],
  },
  {
    href: "/relacionamento",
    rotulo: "Relacionamento",
    icone: MessageCircleHeart,
    finalidade:
      "Acompanhamento antes e depois do atendimento: confirmações, retornos, aniversários e pesquisas.",
    proximosPassos: [
      "Envio automático de lembretes, quando a clínica definir canal e cadência",
      "Consulta das avaliações recebidas no Google",
    ],
  },
  {
    href: "/captacao",
    rotulo: "Captação",
    icone: Target,
    finalidade:
      "Funil de novos contatos, meta financeira, conversões e origem dos leads até a venda.",
    proximosPassos: [
      "Metas específicas por procedimento",
      "Integração automática com campanhas e formulários de anúncios",
      "Tempo médio entre as etapas do funil",
    ],
  },
  {
    href: "/relatorios",
    rotulo: "Relatórios",
    icone: ChartNoAxesColumn,
    emConstrucao: true,
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
      "Horários de funcionamento",
      "Perfis de acesso e permissões",
    ],
  },
];

/**
 * A barra de módulos do topo mostra os oito módulos do dia a dia; Relatórios
 * e Configurações ficam em "Mais". A gaveta do celular mostra todos.
 */
export const MODULOS_DA_BARRA: ItemMenu[] = MENU.slice(0, 8);
export const MODULOS_EM_MAIS: ItemMenu[] = MENU.slice(8);

export type Atalho = {
  tecla: string;
  rotulo: string;
  href: string;
  /** Perfis que podem usar; sem a lista, todos. */
  so?: Papel[];
};

/**
 * Atalhos de uma tecla, válidos em qualquer tela logada quando o foco não
 * está num campo. Dá para desligar (WCAG 2.1.4) no painel de atalhos.
 */
export const ATALHOS: Atalho[] = [
  { tecla: "n", rotulo: "Nova paciente", href: "/pacientes/novo" },
  { tecla: "a", rotulo: "Novo agendamento", href: "/agenda/novo" },
  { tecla: "v", rotulo: "Registrar venda", href: "/financeiro/vendas/nova" },
  { tecla: "t", rotulo: "Criar tarefa", href: "/relacionamento/tarefas/nova" },
];

export function itemPorHref(href: string): ItemMenu | undefined {
  return MENU.find((item) => item.href === href);
}

/** Item ativo considerando subrotas (/pacientes/123 → Pacientes). */
export function itemAtivo(caminho: string): ItemMenu | undefined {
  if (caminho === "/") return MENU[0];
  return MENU.find((item) => item.href !== "/" && caminho.startsWith(item.href));
}

/**
 * Identidade da clínica, exibida no topo, no menu lateral, no login e na
 * página pública de assinatura. A logo é `MarcaDaClinica`
 * (`components/ui/marca-da-clinica.tsx`), sempre ao lado do nome.
 */
export const CLINICA = {
  nome: "Dra. Érika Passos",
  descricao: "Consultório de estética",
} as const;
