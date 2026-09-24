import "server-only";

import { cache } from "react";
import { calcularPlanoDaMeta, percentual, type PlanoDaMeta } from "@/lib/captacao";
import { comoClienteCaptacao, type EtapaLead } from "@/lib/captacao-banco";
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
  criadoEm: Date;
};

export type PainelCaptacao = {
  estruturaDisponivel: boolean;
  meta: MetaComercial;
  faturamentoAtual: number;
  vendasNoMes: number;
  ticketMedioReal: number;
  plano: PlanoDaMeta;
  etapas: EtapaDoPainel[];
  taxaConversaoGeral: number;
  taxaAgendamentoVendaAtual: number;
  origens: OrigemDoPainel[];
  leadsRecentes: LeadDoPainel[];
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

function painelSemEstrutura(): PainelCaptacao {
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
    plano,
    etapas: [],
    taxaConversaoGeral: 0,
    taxaAgendamentoVendaAtual: 0,
    origens: [],
    leadsRecentes: [],
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

  // A primeira leitura também funciona como detector da migração 0029. Assim
  // uma aplicação publicada antes do db:push mostra instrução, não uma 500.
  const metaResposta = await supabase
    .from("metas_comerciais")
    .select("id, meta_faturamento, ticket_medio_planejado, taxa_lead_qualificado, taxa_qualificado_agendamento, taxa_agendamento_venda")
    .eq("competencia", competencia)
    .is("procedimento_id", null)
    .maybeSingle();

  if (metaResposta.error) {
    if (estruturaAusente(metaResposta.error)) return painelSemEstrutura();
    falhaDeConsulta("consulta captação: meta", metaResposta.error, "Não foi possível carregar a meta comercial.");
  }

  const contexto = "consulta captação";
  const frase = "Não foi possível carregar o funil de captação.";

  const [leads, historico, vendas, procedimentos] = await Promise.all([
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("leads")
          .select("id, nome, telefone, email, origem, campanha, procedimento_interesse_id, etapa, criado_em")
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
          .select("id, lead_id, para, em")
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
    todasAsLinhas(
      (inicio, fim) =>
        base
          .from("procedimentos")
          .select("id, nome")
          .order("id")
          .range(inicio, fim),
      "consulta captação: procedimentos",
      "Não foi possível carregar os procedimentos.",
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

  const plano = calcularPlanoDaMeta({
    metaFaturamento: meta.metaFaturamento,
    faturamentoAtual,
    ticketMedio: meta.ticketMedioPlanejado,
    taxaLeadQualificado: meta.taxaLeadQualificado,
    taxaQualificadoAgendamento: meta.taxaQualificadoAgendamento,
    taxaAgendamentoVenda: meta.taxaAgendamentoVenda,
  });

  const idsDaCoorte = new Set(leads.map((lead) => lead.id));
  const idsQualificados = new Set<string>();
  const idsAgendados = new Set<string>();
  const idsGanhos = new Set<string>();
  const idsPerdidos = new Set<string>();

  for (const passo of historico) {
    if (!idsDaCoorte.has(passo.lead_id)) continue;
    if (["qualificado", "agendamento", "ganho"].includes(passo.para)) idsQualificados.add(passo.lead_id);
    if (["agendamento", "ganho"].includes(passo.para)) idsAgendados.add(passo.lead_id);
    if (passo.para === "ganho") idsGanhos.add(passo.lead_id);
    if (passo.para === "perdido") idsPerdidos.add(passo.lead_id);
  }

  const entrada = leads.length;
  const qualificados = idsQualificados.size;
  const agendados = idsAgendados.size;
  const ganhos = idsGanhos.size;

  const etapas: EtapaDoPainel[] = [
    { etapa: "novo", volume: entrada, conversao: null, necessarioAgora: plano.leadsNecessarios },
    {
      etapa: "qualificado",
      volume: qualificados,
      conversao: entrada > 0 ? percentual(qualificados, entrada) : 0,
      necessarioAgora: plano.qualificadosNecessarios,
    },
    {
      etapa: "agendamento",
      volume: agendados,
      conversao: qualificados > 0 ? percentual(agendados, qualificados) : 0,
      necessarioAgora: plano.agendamentosNecessarios,
    },
    {
      etapa: "ganho",
      volume: ganhos,
      conversao: agendados > 0 ? percentual(ganhos, agendados) : 0,
      necessarioAgora: plano.vendasNecessarias,
    },
  ];

  const porOrigem = new Map<string, number>();
  for (const lead of leads) porOrigem.set(lead.origem, (porOrigem.get(lead.origem) ?? 0) + 1);
  const origens = [...porOrigem.entries()]
    .map(([origem, quantidade]) => ({ origem, quantidade, percentual: percentual(quantidade, entrada) }))
    .sort((a, b) => b.quantidade - a.quantidade || a.origem.localeCompare(b.origem));

  const nomesProcedimento = new Map(procedimentos.map((p) => [p.id, p.nome]));
  const leadsRecentes = leads.slice(0, 12).map((lead) => ({
    id: lead.id,
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    origem: lead.origem,
    campanha: lead.campanha,
    etapa: lead.etapa,
    procedimento: lead.procedimento_interesse_id
      ? nomesProcedimento.get(lead.procedimento_interesse_id) ?? null
      : null,
    criadoEm: new Date(lead.criado_em),
  }));

  return {
    estruturaDisponivel: true,
    meta,
    faturamentoAtual,
    vendasNoMes,
    ticketMedioReal,
    plano,
    etapas,
    taxaConversaoGeral: entrada > 0 ? percentual(ganhos, entrada) : 0,
    taxaAgendamentoVendaAtual: agendados > 0 ? percentual(ganhos, agendados) : 0,
    origens,
    leadsRecentes,
    perdidos: idsPerdidos.size,
  };
});
