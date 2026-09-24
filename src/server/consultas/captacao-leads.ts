import "server-only";

import { cache } from "react";
import { termoDeBusca } from "@/lib/busca";
import { comoClienteCaptacao, type EtapaLead } from "@/lib/captacao-banco";
import { diferencaEmDias } from "@/lib/dates";
import { falhaDeConsulta } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import type { Periodo } from "@/lib/periodo";
import type { LeadDoPainel } from "./captacao";
import { paginaAlemDoFim } from "./todas-as-linhas";

export const LEADS_POR_PAGINA = 15;

export type FiltroEtapaLead = EtapaLead | "todos";

export type MovimentoLead = {
  de: EtapaLead | null;
  para: EtapaLead;
  motivo: string | null;
  em: Date;
};

export type LeadDaCarteira = LeadDoPainel & {
  atualizadoEm: Date;
  diasSemMovimento: number;
  motivoPerda: string | null;
  historico: MovimentoLead[];
};

export type PaginaDeLeads = {
  itens: LeadDaCarteira[];
  total: number;
  pagina: number;
  paginas: number;
};

/**
 * Carteira operacional do mês. O funil agregado continua em `painelCaptacao`;
 * esta consulta existe para a lista poder buscar, filtrar e paginar sem mandar
 * centenas de leads para o navegador.
 */
export const listarLeadsCaptacao = cache(
  async (
    periodo: Periodo,
    busca = "",
    etapa: FiltroEtapaLead = "todos",
    paginaRecebida = 1,
    origem = "",
    campanha = "",
  ): Promise<PaginaDeLeads> => {
    const base = await clienteServidor();
    const supabase = comoClienteCaptacao(base);
    let pagina = Math.max(1, Math.trunc(paginaRecebida));
    const termo = termoDeBusca(busca);
    const digitos = termo.replace(/\D/g, "");
    const origemExata = origem.trim().slice(0, 60);
    const campanhaExata = campanha.trim().slice(0, 120);
    const frase = "Não foi possível carregar a carteira de leads.";

    const montar = (contagem: { count: "exact"; head?: boolean }) => {
      let consulta = supabase
        .from("leads")
        .select(
          "id, nome, telefone, email, origem, campanha, procedimento_interesse_id, paciente_id, etapa, motivo_perda, criado_em, atualizado_em",
          contagem,
        )
        .gte("criado_em", periodo.de.toISOString())
        .lt("criado_em", periodo.ate.toISOString());

      if (etapa !== "todos") consulta = consulta.eq("etapa", etapa);
      if (origemExata) consulta = consulta.eq("origem", origemExata);
      if (campanhaExata) consulta = consulta.eq("campanha", campanhaExata);

      if (termo) {
        const alvos = [
          `nome.ilike.%${termo}%`,
          `email.ilike.%${termo}%`,
          `origem.ilike.%${termo}%`,
          `campanha.ilike.%${termo}%`,
        ];
        if (digitos.length >= 3) alvos.push(`telefone.ilike.%${digitos}%`);
        consulta = consulta.or(alvos.join(","));
      }

      return consulta;
    };

    const lerPagina = (numero: number) => {
      const de = (numero - 1) * LEADS_POR_PAGINA;
      return montar({ count: "exact" })
        .order("criado_em", { ascending: false })
        .order("id", { ascending: true })
        .range(de, de + LEADS_POR_PAGINA - 1);
    };

    let resposta = await lerPagina(pagina);
    let linhas = resposta.data ?? [];
    let total = resposta.count ?? 0;

    if (resposta.error) {
      if (!paginaAlemDoFim(resposta.error)) {
        falhaDeConsulta("consulta captação: carteira", resposta.error, frase);
      }

      const contagem = await montar({ count: "exact", head: true });
      if (contagem.error) {
        falhaDeConsulta("consulta captação: contagem da carteira", contagem.error, frase);
      }

      total = contagem.count ?? 0;
      const paginasDisponiveis = Math.max(1, Math.ceil(total / LEADS_POR_PAGINA));
      pagina = Math.min(pagina, paginasDisponiveis);

      if (total > 0) {
        resposta = await lerPagina(pagina);
        if (resposta.error) {
          falhaDeConsulta("consulta captação: carteira corrigida", resposta.error, frase);
        }
        linhas = resposta.data ?? [];
      } else {
        pagina = 1;
        linhas = [];
      }
    }

    const ids = linhas.map((lead) => lead.id);
    const [procedimentosResposta, historicoResposta] = await Promise.all([
      base.from("procedimentos").select("id, nome"),
      ids.length > 0
        ? supabase
            .from("lead_etapas")
            .select("lead_id, de, para, motivo, em")
            .in("lead_id", ids)
            .order("em", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (procedimentosResposta.error) {
      falhaDeConsulta(
        "consulta captação: procedimentos da carteira",
        procedimentosResposta.error,
        "Não foi possível carregar os procedimentos dos leads.",
      );
    }
    if (historicoResposta.error) {
      falhaDeConsulta(
        "consulta captação: histórico da carteira",
        historicoResposta.error,
        "Não foi possível carregar o histórico dos leads.",
      );
    }

    const nomesProcedimento = new Map(
      (procedimentosResposta.data ?? []).map((item) => [item.id, item.nome]),
    );
    const historicoPorLead = new Map<string, MovimentoLead[]>();

    for (const passo of historicoResposta.data ?? []) {
      const atual = historicoPorLead.get(passo.lead_id) ?? [];
      atual.push({
        de: passo.de,
        para: passo.para,
        motivo: passo.motivo,
        em: new Date(passo.em),
      });
      historicoPorLead.set(passo.lead_id, atual);
    }

    return {
      itens: linhas.map((lead) => {
        const atualizadoEm = new Date(lead.atualizado_em);
        return {
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
          pacienteId: lead.paciente_id,
          criadoEm: new Date(lead.criado_em),
          atualizadoEm,
          diasSemMovimento: Math.max(0, -diferencaEmDias(atualizadoEm)),
          motivoPerda: lead.motivo_perda,
          historico: historicoPorLead.get(lead.id) ?? [],
        };
      }),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / LEADS_POR_PAGINA)),
    };
  },
);
