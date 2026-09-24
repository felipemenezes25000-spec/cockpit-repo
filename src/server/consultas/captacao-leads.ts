import "server-only";

import { cache } from "react";
import { termoDeBusca } from "@/lib/busca";
import { comoClienteCaptacao, type EtapaLead } from "@/lib/captacao-banco";
import { falhaDeConsulta } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import type { Periodo } from "@/lib/periodo";
import type { LeadDoPainel } from "./captacao";
import { paginaAlemDoFim } from "./todas-as-linhas";

export const LEADS_POR_PAGINA = 15;

export type FiltroEtapaLead = EtapaLead | "todos";

export type PaginaDeLeads = {
  itens: LeadDoPainel[];
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
  ): Promise<PaginaDeLeads> => {
    const base = await clienteServidor();
    const supabase = comoClienteCaptacao(base);
    const pagina = Math.max(1, Math.trunc(paginaRecebida));
    const termo = termoDeBusca(busca);
    const digitos = termo.replace(/\D/g, "");
    const frase = "Não foi possível carregar a carteira de leads.";

    const montar = (contagem: { count: "exact"; head?: boolean }) => {
      let consulta = supabase
        .from("leads")
        .select(
          "id, nome, telefone, email, origem, campanha, procedimento_interesse_id, paciente_id, etapa, criado_em",
          contagem,
        )
        .gte("criado_em", periodo.de.toISOString())
        .lt("criado_em", periodo.ate.toISOString());

      if (etapa !== "todos") consulta = consulta.eq("etapa", etapa);

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

    const de = (pagina - 1) * LEADS_POR_PAGINA;
    const resposta = await montar({ count: "exact" })
      .order("criado_em", { ascending: false })
      .order("id", { ascending: true })
      .range(de, de + LEADS_POR_PAGINA - 1);

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
      linhas = [];
      total = contagem.count ?? 0;
    }

    const { data: procedimentos, error: erroProcedimentos } = await base
      .from("procedimentos")
      .select("id, nome");
    if (erroProcedimentos) {
      falhaDeConsulta(
        "consulta captação: procedimentos da carteira",
        erroProcedimentos,
        "Não foi possível carregar os procedimentos dos leads.",
      );
    }

    const nomesProcedimento = new Map((procedimentos ?? []).map((item) => [item.id, item.nome]));

    return {
      itens: linhas.map((lead) => ({
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
      })),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / LEADS_POR_PAGINA)),
    };
  },
);
