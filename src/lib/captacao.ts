import { diferencaEmDias, inicioDoDia } from "./dates";
import { apenasDigitos, ORIGENS, telefoneValido } from "./paciente";
import type { EtapaLead } from "./captacao-banco";

export { type EtapaLead } from "./captacao-banco";

export const ORIGENS_CAPTACAO = ORIGENS;

export const ETAPAS_FUNIL: readonly EtapaLead[] = [
  "novo",
  "qualificado",
  "agendamento",
  "ganho",
  "perdido",
] as const;

export const ROTULO_ETAPA: Record<EtapaLead, string> = {
  novo: "Entrada de leads",
  qualificado: "Lead qualificado",
  agendamento: "Agendamento",
  ganho: "Venda concluída",
  perdido: "Perdido",
};

export type ValoresLead = {
  nome: string;
  telefone: string;
  email: string;
  origem: string;
  campanha: string;
  procedimento_interesse_id: string;
  observacoes: string;
};

export type ErrosLead = Partial<Record<keyof ValoresLead | "geral", string>>;

export const LEAD_EM_BRANCO: ValoresLead = {
  nome: "",
  telefone: "",
  email: "",
  origem: "Instagram",
  campanha: "",
  procedimento_interesse_id: "",
  observacoes: "",
};

function linha(valor: string, limite: number): string {
  return valor.trim().replace(/\s+/g, " ").slice(0, limite);
}

export function normalizarLead(v: ValoresLead): ValoresLead {
  return {
    nome: linha(v.nome, 120),
    telefone: apenasDigitos(v.telefone),
    email: v.email.trim().toLowerCase().slice(0, 160),
    origem: linha(v.origem, 60),
    campanha: linha(v.campanha, 120),
    procedimento_interesse_id: v.procedimento_interesse_id.trim(),
    observacoes: v.observacoes.trim().slice(0, 2000),
  };
}

export function validarLead(v: ValoresLead): ErrosLead {
  const erros: ErrosLead = {};
  if (v.nome.length < 3) erros.nome = "Informe o nome do lead.";
  if (v.telefone && !telefoneValido(v.telefone)) {
    erros.telefone = "Telefone inválido. Use DDD + número.";
  }
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) {
    erros.email = "E-mail inválido.";
  }
  if (!v.origem) erros.origem = "Informe a origem do lead.";
  return erros;
}

export type PremissasMeta = {
  metaFaturamento: number;
  faturamentoAtual: number;
  ticketMedio: number;
  taxaLeadQualificado: number;
  taxaQualificadoAgendamento: number;
  taxaAgendamentoVenda: number;
};

export type PlanoDaMeta = {
  gapFinanceiro: number;
  percentualMeta: number;
  vendasNecessarias: number;
  agendamentosNecessarios: number;
  qualificadosNecessarios: number;
  leadsNecessarios: number;
};

function taxaValida(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0 && valor <= 100;
}

/**
 * Faz o funil ao contrário: parte do que falta faturar e sobe até descobrir
 * quantos leads precisam entrar. Resultado calculado nunca é persistido.
 */
export function calcularPlanoDaMeta(p: PremissasMeta): PlanoDaMeta {
  const meta = Math.max(0, Number.isFinite(p.metaFaturamento) ? p.metaFaturamento : 0);
  const atual = Math.max(0, Number.isFinite(p.faturamentoAtual) ? p.faturamentoAtual : 0);
  const gapFinanceiro = Math.max(0, meta - atual);
  const percentualMeta = meta > 0 ? Math.min(100, (atual / meta) * 100) : 0;

  if (gapFinanceiro === 0 || p.ticketMedio <= 0) {
    return {
      gapFinanceiro,
      percentualMeta,
      vendasNecessarias: 0,
      agendamentosNecessarios: 0,
      qualificadosNecessarios: 0,
      leadsNecessarios: 0,
    };
  }

  const t1 = taxaValida(p.taxaLeadQualificado) ? p.taxaLeadQualificado / 100 : 1;
  const t2 = taxaValida(p.taxaQualificadoAgendamento) ? p.taxaQualificadoAgendamento / 100 : 1;
  const t3 = taxaValida(p.taxaAgendamentoVenda) ? p.taxaAgendamentoVenda / 100 : 1;

  const vendasNecessarias = Math.ceil(gapFinanceiro / p.ticketMedio);
  const agendamentosNecessarios = Math.ceil(vendasNecessarias / t3);
  const qualificadosNecessarios = Math.ceil(agendamentosNecessarios / t2);
  const leadsNecessarios = Math.ceil(qualificadosNecessarios / t1);

  return {
    gapFinanceiro,
    percentualMeta,
    vendasNecessarias,
    agendamentosNecessarios,
    qualificadosNecessarios,
    leadsNecessarios,
  };
}

export type RitmoMensal = {
  situacao: "atual" | "passado" | "futuro";
  diasNoMes: number;
  diasDecorridos: number;
  diasRestantes: number;
  mediaFaturamentoDia: number;
  ritmoFinanceiroDia: number;
  vendasPorDia: number;
  leadsPorDia: number;
  projecaoFaturamento: number;
  projecaoPercentualMeta: number;
};

function umaCasa(valor: number): number {
  return Math.round(valor * 10) / 10;
}

/**
 * Ritmo operacional da meta. Para o mês corrente, a projeção é uma extensão
 * linear simples do realizado até hoje — não é previsão estatística e por isso
 * fica nomeada como "projeção no ritmo atual" na interface.
 *
 * `diasRestantes` inclui o dia de hoje. Isso evita assumir horário comercial,
 * sábado útil ou feriado: a clínica decide como distribuir o esforço restante.
 */
export function calcularRitmoMensal({
  inicio,
  fim,
  referencia = new Date(),
  faturamentoAtual,
  metaFaturamento,
  plano,
}: {
  inicio: Date;
  fim: Date;
  referencia?: Date;
  faturamentoAtual: number;
  metaFaturamento: number;
  plano: PlanoDaMeta;
}): RitmoMensal {
  const diasNoMes = Math.max(1, diferencaEmDias(fim, inicio));
  const hoje = inicioDoDia(referencia);
  const situacao: RitmoMensal["situacao"] =
    hoje.getTime() < inicio.getTime()
      ? "futuro"
      : hoje.getTime() >= fim.getTime()
        ? "passado"
        : "atual";

  const diasDecorridos =
    situacao === "futuro"
      ? 0
      : situacao === "passado"
        ? diasNoMes
        : Math.min(diasNoMes, Math.max(1, diferencaEmDias(hoje, inicio) + 1));

  const diasRestantes =
    situacao === "passado"
      ? 0
      : situacao === "futuro"
        ? diasNoMes
        : Math.max(1, diasNoMes - diasDecorridos + 1);

  const realizado = Math.max(0, Number.isFinite(faturamentoAtual) ? faturamentoAtual : 0);
  const meta = Math.max(0, Number.isFinite(metaFaturamento) ? metaFaturamento : 0);
  const mediaFaturamentoDia = diasDecorridos > 0 ? realizado / diasDecorridos : 0;
  const projecaoFaturamento =
    situacao === "atual"
      ? mediaFaturamentoDia * diasNoMes
      : situacao === "passado"
        ? realizado
        : 0;
  const divisorRitmo = Math.max(1, diasRestantes);

  return {
    situacao,
    diasNoMes,
    diasDecorridos,
    diasRestantes,
    mediaFaturamentoDia,
    ritmoFinanceiroDia:
      situacao === "passado" ? 0 : plano.gapFinanceiro / divisorRitmo,
    vendasPorDia:
      situacao === "passado" ? 0 : umaCasa(plano.vendasNecessarias / divisorRitmo),
    leadsPorDia:
      situacao === "passado" ? 0 : umaCasa(plano.leadsNecessarios / divisorRitmo),
    projecaoFaturamento,
    projecaoPercentualMeta: meta > 0 ? (projecaoFaturamento / meta) * 100 : 0,
  };
}

export function percentual(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

export type ValoresMeta = {
  meta_faturamento: string;
  ticket_medio_planejado: string;
  taxa_lead_qualificado: string;
  taxa_qualificado_agendamento: string;
  taxa_agendamento_venda: string;
};

export type ErrosMeta = Partial<Record<keyof ValoresMeta | "geral", string>>;

function numeroPt(valor: string): number {
  const limpo = valor.trim().replace(/\./g, "").replace(",", ".");
  return Number(limpo);
}

export function lerValoresMeta(v: ValoresMeta):
  | { valor: Omit<PremissasMeta, "faturamentoAtual"> }
  | { erros: ErrosMeta } {
  const meta = numeroPt(v.meta_faturamento);
  const ticket = numeroPt(v.ticket_medio_planejado);
  const taxa1 = numeroPt(v.taxa_lead_qualificado);
  const taxa2 = numeroPt(v.taxa_qualificado_agendamento);
  const taxa3 = numeroPt(v.taxa_agendamento_venda);
  const erros: ErrosMeta = {};

  if (!Number.isFinite(meta) || meta < 0) erros.meta_faturamento = "Informe uma meta válida.";
  if (!Number.isFinite(ticket) || ticket <= 0) erros.ticket_medio_planejado = "O ticket precisa ser maior que zero.";
  if (!taxaValida(taxa1)) erros.taxa_lead_qualificado = "Use uma taxa entre 0,01% e 100%.";
  if (!taxaValida(taxa2)) erros.taxa_qualificado_agendamento = "Use uma taxa entre 0,01% e 100%.";
  if (!taxaValida(taxa3)) erros.taxa_agendamento_venda = "Use uma taxa entre 0,01% e 100%.";

  if (Object.keys(erros).length > 0) return { erros };

  return {
    valor: {
      metaFaturamento: meta,
      ticketMedio: ticket,
      taxaLeadQualificado: taxa1,
      taxaQualificadoAgendamento: taxa2,
      taxaAgendamentoVenda: taxa3,
    },
  };
}
