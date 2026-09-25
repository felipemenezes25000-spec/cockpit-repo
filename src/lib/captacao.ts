import { dataValida, diferencaEmDias, inicioDoDia } from "./dates";
import { apenasDigitos, ORIGENS, telefoneValido } from "./paciente";
import type { EtapaLead } from "./dominio";

export { type EtapaLead } from "./dominio";

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

/** Lead que ainda se acompanha: nem venda concluída nem perda. */
export function leadAberto(etapa: EtapaLead): boolean {
  return etapa !== "ganho" && etapa !== "perdido";
}

// ---------------------------------------------------------------------
// Contato comercial (0030): quando a equipe falou com o lead e quando
// combinou falar de novo. Não confundir com a etapa, que diz ONDE ele está.
// ---------------------------------------------------------------------

/** A mesma lista da CHECK de `lead_interacoes.canal`. */
export const CANAIS_CONTATO = [
  "whatsapp",
  "telefone",
  "instagram",
  "email",
  "presencial",
  "outro",
] as const;

export type CanalContatoLead = (typeof CANAIS_CONTATO)[number];

export const ROTULO_CANAL: Record<CanalContatoLead, string> = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  instagram: "Instagram",
  email: "E-mail",
  presencial: "Presencial",
  outro: "Outro",
};

/** O teto da CHECK de `lead_interacoes.observacao`. */
export const LIMITE_OBSERVACAO_CONTATO = 1000;

export function canalValido(valor: string): valor is CanalContatoLead {
  return (CANAIS_CONTATO as readonly string[]).includes(valor);
}

export type ValoresContato = {
  canal: string;
  observacao: string;
  proximo_contato: string;
};

export type ErrosContato = Partial<Record<keyof ValoresContato | "geral", string>>;

export function normalizarContato(v: ValoresContato): ValoresContato {
  return {
    canal: v.canal.trim().toLowerCase(),
    observacao: v.observacao.trim(),
    proximo_contato: v.proximo_contato.trim(),
  };
}

/**
 * Canal da lista, observação dentro do teto e, se houver, um próximo contato
 * que existe no calendário e não ficou no passado. `hoje` é a chave
 * "AAAA-MM-DD" do dia da clínica (`chaveDoDia()`): a comparação é de texto,
 * que nesse formato segue a ordem do calendário. O banco confere a mesma
 * data desde a 0031 — uma data que já passou só existe porque nasceu válida
 * e o tempo andou: é o retorno atrasado.
 */
export function validarContato(v: ValoresContato, hoje: string): ErrosContato {
  const erros: ErrosContato = {};
  if (!canalValido(v.canal)) erros.canal = "Escolha o canal do contato.";
  if (v.observacao.length > LIMITE_OBSERVACAO_CONTATO) {
    erros.observacao = `Use até ${LIMITE_OBSERVACAO_CONTATO} caracteres.`;
  }
  if (v.proximo_contato) {
    if (!dataValida(v.proximo_contato)) {
      erros.proximo_contato = "Data inválida.";
    } else if (v.proximo_contato < hoje) {
      erros.proximo_contato = "O próximo contato não pode ficar no passado.";
    }
  }
  return erros;
}

/**
 * Recortes de atenção da carteira (`?atencao=`). `parados` é da coorte do
 * mês, como o resto da carteira. Os retornos valem para a carteira aberta
 * inteira: um retorno combinado com um lead que entrou no mês passado vence
 * hoje do mesmo jeito, e escondê-lo atrás do mês de entrada é perder o
 * contato.
 */
export const FILTROS_ATENCAO = ["todos", "parados", "retorno_hoje", "retorno_atrasado"] as const;
export type FiltroAtencaoLead = (typeof FILTROS_ATENCAO)[number];

export const ROTULO_ATENCAO: Record<FiltroAtencaoLead, string> = {
  todos: "Todos os leads",
  parados: "Parados há 3+ dias",
  retorno_hoje: "Retorno hoje",
  retorno_atrasado: "Retorno atrasado",
};

/** Valor torto na URL cai no padrão, como todo leitor de parâmetro da casa. */
export function lerFiltroAtencao(valor: string | null | undefined): FiltroAtencaoLead {
  const texto = (valor ?? "").trim().slice(0, 20);
  return (FILTROS_ATENCAO as readonly string[]).includes(texto) ? (texto as FiltroAtencaoLead) : "todos";
}

/** O recorte olha a carteira aberta inteira, sem o mês de entrada. */
export function recorteDeRetorno(atencao: FiltroAtencaoLead): boolean {
  return atencao === "retorno_hoje" || atencao === "retorno_atrasado";
}

export type SituacaoRetorno = "atrasado" | "hoje" | "futuro" | "sem_retorno" | "encerrado";

/**
 * Onde está o próximo contato combinado, no calendário da clínica. Lead
 * encerrado não tem retorno — o banco limpa a data ao fechar (0031) —, e a
 * regra repete isso para não depender da ordem das migrações.
 */
export function situacaoDoRetorno(
  etapa: EtapaLead,
  proximoContato: string | null,
  hoje: string,
): SituacaoRetorno {
  if (!leadAberto(etapa)) return "encerrado";
  if (!proximoContato) return "sem_retorno";
  if (proximoContato < hoje) return "atrasado";
  if (proximoContato === hoje) return "hoje";
  return "futuro";
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
