import "server-only";

import { cache } from "react";
import {
  calcularPlanoDaMeta,
  calcularRitmoMensal,
  percentual,
  type PlanoDaMeta,
  type RitmoMensal,
} from "@/lib/captacao";
import { comoClienteCaptacao, type EtapaLead } from "@/lib/captacao-banco";
import { diferencaEmDias } from "@/lib/dates";
import { estruturaAusente } from "@/lib/erros-banco";
import { falhaDeConsulta } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import { dataParaColuna, type Periodo } from "@/lib/periodo";
import { todasAsLinhas } from "./todas-as-linhas";

export type MetaComercial = {
  id: string | null;
  metaFaturamento: number;
  ticketMedioPlanejado: number;
  taxaLeadQualificado: number;
  taxaQualificadoAgendamento: number;
  taxaAgendamentoVenda: number;
};

export type EtapaDoPainel = {
  etapa: Exclude<EtapaLead, "perdido">;
  volume: number;
  conversao: number | null;
  necessarioAgora: number;
};

export type OrigemDoPainel = {
  origem: string;
  quantidade: number;
  percentual: number;
  ganhos: number;
  conversao: number;
  receita: number;
};

export type CampanhaDoPainel = {
  campanha: string;
  quantidade: number;
  ganhos: number;
  conversao: number;
  receita: number;
};

export type GargaloDoPainel = {
  de: "novo" | "qualificado" | "agendamento";
  para: "qualificado" | "agendamento" | "ganho";
  taxaAtual: number;
  taxaPlanejada: number;
  quantidadeNaoAvancou: number;
};

export type MotivoPerdaDoPainel = {
  motivo: string;
  quantidade: number;
  percentual: number;
};

export type LeadDoPainel = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  origem: string;
  campanha: string | null;
  etapa: EtapaLead;
  procedimento: string | null;
  pacienteId: string | null;
  criadoEm: Date;
};

export type PainelCaptacao = {
  estruturaDisponivel: boolean;
  meta: MetaComercial;
  faturamentoAtual: number;
  vendasNoMes: number;
  ticketMedioReal: number;
  receitaAtribuida: number;
  receitaSemAtribuicao: number;
  percentualReceitaAtribuida: number;
  leadsAbertos: number;
  leadsParados: number;
  plano: PlanoDaMeta;
  ritmo: RitmoMensal;
  etapas: EtapaDoPainel[];
  taxaConversaoGeral: number;
  taxaAgendamentoVendaAtual: number;
  origens: OrigemDoPainel[];
  campanhas: CampanhaDoPainel[];
  gargalo: GargaloDoPainel | null;
  motivosPerda: MotivoPerdaDoPainel[];
  perdidos: number;
};

const META_VAZIA: MetaComercial = {
  id: null,
  metaFaturamento: 0,
  ticketMedioPlanejado: 1000,
  taxaLeadQualificado: 50,
  taxaQualificadoAgendamento: 50,
  taxaAgendamentoVenda: 50,
};

function painelSemEstrutura(periodo: Periodo): PainelCaptacao {
  const plano = calcularPlanoDaMeta({
    metaFaturamento: 0,
    faturamentoAtual: 0,
    ticketMedio: 1000,
    taxaLeadQualificado: 50,
    taxaQualificadoAgendamento: 50,
    taxaAgendamentoVenda: 50,
  });
  return {
    estruturaDisponivel: false,
    meta: META_VAZIA,
    faturamentoAtual: 0,
    vendasNoMes: 0,
    ticketMedioReal: 0,
    receitaAtribuida: 0,
    receitaSemAtribuicao: 0,
    percentualReceitaAtribuida: 0,
    leadsAbertos: 0,
    leadsParados: 0,
    plano,
    ritmo: calcularRitmoMensal({
      inicio: periodo.de,
      fim: periodo.ate,
      faturamentoAtual: 0,
      metaFaturamento: 0,
      plano,
    }),
    etapas: [],
    taxaConversaoGeral: 0,
    taxaAgendamentoVendaAtual: 0,
    origens: [],
    campanhas: [],
    gargalo: null,
    motivosPerda: [],
    perdidos: 0,
  };
}

/**
 * A tela cruza três fontes sem duplicar verdade:
 * - `leads` + `lead_etapas`: funil comercial;
 * - `metas_comerciais`: alvo e premissas;
 * - `vendas`: faturamento realizado, que continua pertencendo ao Financeiro.
 *
 * As taxas do funil usam a coorte de leads que entrou no próprio período. Um
 * lead antigo que avançou hoje não entra no denominador do mês atual; sem esse
 * recorte seria possível mostrar uma "conversão" acima de 100%.
 */
export const painelCaptacao = cache(async (periodo: Periodo): Promise<PainelCaptacao> => {
  const base = await clienteServidor();
  const supabase = comoClienteCaptacao(base);
  const competencia = dataParaColuna(periodo.de);

  const metaResposta = await supabase
    .from("metas_comerciais")
    .select("id, meta_faturamento, ticket_medio_planejado, taxa_lead_qualificado, taxa_qualificado_agendamento, taxa_agendamento_venda")
    .eq("competencia", competencia)
    .is("procedimento_id", null)
    .maybeSingle();

  if (metaResposta.error) {
    if (estruturaAusente(metaResposta.error)) return painelSemEstrutura(periodo);
    falhaDeConsulta("consulta captação: meta", metaResposta.error, "Não foi possível carregar a meta comercial.");
  }

  const contexto = "consulta captação";
  const frase = "Não foi possível carregar o funil de captação.";

  const [leads, historico, vendas] = await Promise.all([
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("leads")
          .select("id, origem, campanha, etapa, venda_id, criado_em, atualizado_em")
          .gte("criado_em", periodo.de.toISOString())
          .lt("criado_em", periodo.ate.toISOString())
          .order("criado_em", { ascending: false })
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("lead_etapas")
          .select("id, lead_id, para, motivo, em")
          .gte("em", periodo.de.toISOString())
          .lt("em", periodo.ate.toISOString())
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (inicio, fim) =>
        base
          .from("vendas")
          .select("id, valor_final")
          .gte("data_venda", dataParaColuna(periodo.de))
          .lt("data_venda", dataParaColuna(periodo.ate))
          .order("id")
          .range(inicio, fim),
      "consulta captação: vendas",
      "Não foi possível calcular o faturamento da meta.",
    ),
  ]);

  const metaLinha = metaResposta.data;
  const meta: MetaComercial = metaLinha
    ? {
        id: metaLinha.id,
        metaFaturamento: Number(metaLinha.meta_faturamento),
        ticketMedioPlanejado: Number(metaLinha.ticket_medio_planejado),
        taxaLeadQualificado: Number(metaLinha.taxa_lead_qualificado),
        taxaQualificadoAgendamento: Number(metaLinha.taxa_qualificado_agendamento),
        taxaAgendamentoVenda: Number(metaLinha.taxa_agendamento_venda),
      }
    : META_VAZIA;

  const faturamentoAtual = vendas.reduce((soma, venda) => soma + Number(venda.valor_final), 0);
  const vendasNoMes = vendas.length;
  const ticketMedioReal = vendasNoMes > 0 ? faturamentoAtual / vendasNoMes : 0;
  const valorVendaPorId = new Map(vendas.map((venda) => [venda.id, Number(venda.valor_final)]));
  const idsVendasAtribuidas = new Set(
    leads
      .map((lead) => lead.venda_id)
      .filter((id): id is string => Boolean(id) && valorVendaPorId.has(id)),
  );
  const receitaAtribuida = [...idsVendasAtribuidas].reduce(
    (soma, id) => soma + (valorVendaPorId.get(id) ?? 0),
    0,
  );
  const receitaSemAtribuicao = Math.max(0, faturamentoAtual - receitaAtribuida);
  const percentualReceitaAtribuida =
    faturamentoAtual > 0 ? percentual(receitaAtribuida, faturamentoAtual) : 0;
  const leadsAbertos = leads.filter(
    (lead) => lead.etapa !== "ganho" && lead.etapa !== "perdido",
  ).length;
  const leadsParados = leads.filter(
    (lead) =>
      lead.etapa !== "ganho" &&
      lead.etapa !== "perdido" &&
      -diferencaEmDias(new Date(lead.atualizado_em)) >= 3,
  ).length;

  const plano = calcularPlanoDaMeta({
    metaFaturamento: meta.metaFaturamento,
    faturamentoAtual,
    ticketMedio: meta.ticketMedioPlanejado,
    taxaLeadQualificado: meta.taxaLeadQualificado,
    taxaQualificadoAgendamento: meta.taxaQualificadoAgendamento,
    taxaAgendamentoVenda: meta.taxaAgendamentoVenda,
  });

  const ritmo = calcularRitmoMensal({
    inicio: periodo.de,
    fim: periodo.ate,
    faturamentoAtual,
    metaFaturamento: meta.metaFaturamento,
    plano,
  });

  const idsDaCoorte = new Set(leads.map((lead) => lead.id));
  const idsQualificados = new Set<string>();
  const idsAgendados = new Set<string>();
  const idsGanhos = new Set<string>();
  const idsPerdidos = new Set<string>();
  const ultimaPerdaPorLead = new Map<string, string>();

  for (const passo of historico) {
    if (!idsDaCoorte.has(passo.lead_id)) continue;
    if (["qualificado", "agendamento", "ganho"].includes(passo.para)) idsQualificados.add(passo.lead_id);
    if (["agendamento", "ganho"].includes(passo.para)) idsAgendados.add(passo.lead_id);
    if (passo.para === "ganho") idsGanhos.add(passo.lead_id);
    if (passo.para === "perdido") {
      idsPerdidos.add(passo.lead_id);
      ultimaPerdaPorLead.set(passo.lead_id, passo.motivo?.trim() || "Motivo não informado");
    }
  }

  const entrada = leads.length;
  const qualificados = idsQualificados.size;
  const agendados = idsAgendados.size;
  const ganhos = idsGanhos.size;

  const taxaLeadQualificadoAtual = entrada > 0 ? percentual(qualificados, entrada) : 0;
  const taxaQualificadoAgendamentoAtual = qualificados > 0 ? percentual(agendados, qualificados) : 0;
  const taxaAgendamentoVendaAtual = agendados > 0 ? percentual(ganhos, agendados) : 0;

  const etapas: EtapaDoPainel[] = [
    { etapa: "novo", volume: entrada, conversao: null, necessarioAgora: plano.leadsNecessarios },
    {
      etapa: "qualificado",
      volume: qualificados,
      conversao: taxaLeadQualificadoAtual,
      necessarioAgora: plano.qualificadosNecessarios,
    },
    {
      etapa: "agendamento",
      volume: agendados,
      conversao: taxaQualificadoAgendamentoAtual,
      necessarioAgora: plano.agendamentosNecessarios,
    },
    {
      etapa: "ganho",
      volume: ganhos,
      conversao: taxaAgendamentoVendaAtual,
      necessarioAgora: plano.vendasNecessarias,
    },
  ];

  const porOrigem = new Map<string, { quantidade: number; ganhos: number; receita: number }>();
  const porCampanha = new Map<string, { quantidade: number; ganhos: number; receita: number }>();

  for (const lead of leads) {
    const receita = lead.venda_id ? valorVendaPorId.get(lead.venda_id) ?? 0 : 0;
    const origem = porOrigem.get(lead.origem) ?? { quantidade: 0, ganhos: 0, receita: 0 };
    origem.quantidade += 1;
    origem.receita += receita;
    if (idsGanhos.has(lead.id)) origem.ganhos += 1;
    porOrigem.set(lead.origem, origem);

    const campanha = lead.campanha?.trim();
    if (campanha) {
      const atual = porCampanha.get(campanha) ?? { quantidade: 0, ganhos: 0, receita: 0 };
      atual.quantidade += 1;
      atual.receita += receita;
      if (idsGanhos.has(lead.id)) atual.ganhos += 1;
      porCampanha.set(campanha, atual);
    }
  }

  const origens = [...porOrigem.entries()]
    .map(([origem, dados]) => ({
      origem,
      quantidade: dados.quantidade,
      percentual: percentual(dados.quantidade, entrada),
      ganhos: dados.ganhos,
      conversao: percentual(dados.ganhos, dados.quantidade),
      receita: dados.receita,
    }))
    .sort((a, b) => b.receita - a.receita || b.quantidade - a.quantidade || b.conversao - a.conversao || a.origem.localeCompare(b.origem));

  const campanhas = [...porCampanha.entries()]
    .map(([campanha, dados]) => ({
      campanha,
      quantidade: dados.quantidade,
      ganhos: dados.ganhos,
      conversao: percentual(dados.ganhos, dados.quantidade),
      receita: dados.receita,
    }))
    .sort((a, b) => b.receita - a.receita || b.quantidade - a.quantidade || b.conversao - a.conversao || a.campanha.localeCompare(b.campanha));

  const motivos = new Map<string, number>();
  for (const motivo of ultimaPerdaPorLead.values()) {
    motivos.set(motivo, (motivos.get(motivo) ?? 0) + 1);
  }
  const motivosPerda = [...motivos.entries()]
    .map(([motivo, quantidade]) => ({
      motivo,
      quantidade,
      percentual: percentual(quantidade, idsPerdidos.size),
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.motivo.localeCompare(b.motivo));

  const candidatosGargalo: GargaloDoPainel[] = [];
  if (entrada > 0) {
    candidatosGargalo.push({
      de: "novo",
      para: "qualificado",
      taxaAtual: taxaLeadQualificadoAtual,
      taxaPlanejada: meta.taxaLeadQualificado,
      quantidadeNaoAvancou: Math.max(0, entrada - qualificados),
    });
  }
  if (qualificados > 0) {
    candidatosGargalo.push({
      de: "qualificado",
      para: "agendamento",
      taxaAtual: taxaQualificadoAgendamentoAtual,
      taxaPlanejada: meta.taxaQualificadoAgendamento,
      quantidadeNaoAvancou: Math.max(0, qualificados - agendados),
    });
  }
  if (agendados > 0) {
    candidatosGargalo.push({
      de: "agendamento",
      para: "ganho",
      taxaAtual: taxaAgendamentoVendaAtual,
      taxaPlanejada: meta.taxaAgendamentoVenda,
      quantidadeNaoAvancou: Math.max(0, agendados - ganhos),
    });
  }

  const gargalo = candidatosGargalo.sort(
    (a, b) => a.taxaAtual - b.taxaAtual || b.quantidadeNaoAvancou - a.quantidadeNaoAvancou,
  )[0] ?? null;

  return {
    estruturaDisponivel: true,
    meta,
    faturamentoAtual,
    vendasNoMes,
    ticketMedioReal,
    receitaAtribuida,
    receitaSemAtribuicao,
    percentualReceitaAtribuida,
    leadsAbertos,
    leadsParados,
    plano,
    ritmo,
    etapas,
    taxaConversaoGeral: entrada > 0 ? percentual(ganhos, entrada) : 0,
    taxaAgendamentoVendaAtual,
    origens,
    campanhas,
    gargalo,
    motivosPerda,
    perdidos: idsPerdidos.size,
  };
});
