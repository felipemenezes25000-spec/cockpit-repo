import "server-only";

import { cache } from "react";
import { termoDeBusca } from "@/lib/busca";
import {
  canalValido,
  recorteDeRetorno,
  situacaoDoRetorno,
  type CanalContatoLead,
  type EtapaLead,
  type FiltroAtencaoLead,
} from "@/lib/captacao";
import { chaveDoDia, dataDoBanco, diferencaEmDias, inicioDoDia, somarDias } from "@/lib/dates";
import { falhaDeConsulta } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import type { Periodo } from "@/lib/periodo";
import type { LeadDoPainel } from "./captacao";
import { paginaAlemDoFim, todasAsLinhas } from "./todas-as-linhas";

export const LEADS_POR_PAGINA = 15;

/** Quantos contatos a linha do lead mostra; o total vem ao lado. */
export const INTERACOES_POR_LEAD = 8;

export type FiltroEtapaLead = EtapaLead | "todos";
export type { FiltroAtencaoLead };

export type MovimentoLead = {
  de: EtapaLead | null;
  para: EtapaLead;
  motivo: string | null;
  em: Date;
};

export type InteracaoLead = {
  id: number;
  canal: CanalContatoLead;
  observacao: string | null;
  proximoContato: Date | null;
  em: Date;
};

export type LeadDaCarteira = LeadDoPainel & {
  atualizadoEm: Date;
  diasSemMovimento: number;
  motivoPerda: string | null;
  historico: MovimentoLead[];
  ultimoContatoEm: Date | null;
  proximoContato: Date | null;
  /** Dias até o retorno no calendário da clínica: 0 é hoje, negativo é atraso. */
  diasParaRetorno: number | null;
  retornoHoje: boolean;
  retornoAtrasado: boolean;
  /** Os contatos mais recentes primeiro, até `INTERACOES_POR_LEAD`. */
  interacoes: InteracaoLead[];
  totalInteracoes: number;
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
    atencao: FiltroAtencaoLead = "todos",
  ): Promise<PaginaDeLeads> => {
    const supabase = await clienteServidor();
    let pagina = Math.max(1, Math.trunc(paginaRecebida));
    const termo = termoDeBusca(busca);
    const digitos = termo.replace(/\D/g, "");
    const origemExata = origem.trim().slice(0, 60);
    const campanhaExata = campanha.trim().slice(0, 120);
    // Três dias de calendário ou mais: no dia 24, qualquer movimento feito no
    // dia 21 já pede atenção, independentemente da hora em que aconteceu.
    const limiteParado = somarDias(inicioDoDia(), -2);
    // `proximo_contato` é `date`: compara com o dia da clínica, não com o UTC.
    const hojeClinica = chaveDoDia();
    const frase = "Não foi possível carregar a carteira de leads.";

    const montar = (contagem: { count: "exact"; head?: boolean }) => {
      let consulta = supabase
        .from("leads")
        .select(
          "id, nome, telefone, email, origem, campanha, procedimento_interesse_id, paciente_id, etapa, motivo_perda, criado_em, atualizado_em, ultimo_contato_em, proximo_contato",
          contagem,
        );

      if (!recorteDeRetorno(atencao)) {
        consulta = consulta
          .gte("criado_em", periodo.de.toISOString())
          .lt("criado_em", periodo.ate.toISOString());
      }

      if (etapa !== "todos") consulta = consulta.eq("etapa", etapa);
      if (origemExata) consulta = consulta.eq("origem", origemExata);
      if (campanhaExata) consulta = consulta.eq("campanha", campanhaExata);
      if (atencao === "parados") {
        consulta = consulta
          .lt("atualizado_em", limiteParado.toISOString())
          .not("etapa", "in", "(ganho,perdido)");
      }
      if (atencao === "retorno_hoje") {
        consulta = consulta.eq("proximo_contato", hojeClinica).not("etapa", "in", "(ganho,perdido)");
      }
      if (atencao === "retorno_atrasado") {
        consulta = consulta.lt("proximo_contato", hojeClinica).not("etapa", "in", "(ganho,perdido)");
      }

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
      const consulta = montar({ count: "exact" });
      // Quem espera há mais tempo aparece primeiro em cada recorte de atenção.
      const ordenada = atencao === "parados"
        ? consulta.order("atualizado_em", { ascending: true }).order("id", { ascending: true })
        : recorteDeRetorno(atencao)
          ? consulta
              .order("proximo_contato", { ascending: true })
              .order("criado_em", { ascending: true })
              .order("id", { ascending: true })
          : consulta.order("criado_em", { ascending: false }).order("id", { ascending: true });
      return ordenada.range(de, de + LEADS_POR_PAGINA - 1);
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

    // Uma ida ao banco por assunto para a página inteira, nunca uma por lead.
    const ids = linhas.map((lead) => lead.id);
    const [procedimentosResposta, historicoResposta, interacoes] = await Promise.all([
      supabase.from("procedimentos").select("id, nome"),
      ids.length > 0
        ? supabase
            .from("lead_etapas")
            .select("lead_id, de, para, motivo, em")
            .in("lead_id", ids)
            .order("em", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      // Em blocos: o total de contatos por lead é contado aqui, e o PostgREST
      // cortaria em silêncio acima de `max_rows` (AGENTS.md §5).
      ids.length > 0
        ? todasAsLinhas(
            (inicio, fim) =>
              supabase
                .from("lead_interacoes")
                .select("id, lead_id, canal, observacao, proximo_contato, em")
                .in("lead_id", ids)
                .order("em", { ascending: false })
                .order("id", { ascending: false })
                .range(inicio, fim),
            "consulta captação: contatos da carteira",
            "Não foi possível carregar o histórico comercial dos leads.",
          )
        : Promise.resolve([]),
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

    const interacoesPorLead = new Map<string, { recentes: InteracaoLead[]; total: number }>();
    for (const contato of interacoes) {
      const atual = interacoesPorLead.get(contato.lead_id) ?? { recentes: [], total: 0 };
      atual.total += 1;
      if (atual.recentes.length < INTERACOES_POR_LEAD) {
        atual.recentes.push({
          id: contato.id,
          // A CHECK do banco garante a lista; o tipo gerado só sabe que é texto.
          canal: canalValido(contato.canal) ? contato.canal : "outro",
          observacao: contato.observacao,
          proximoContato: contato.proximo_contato ? dataDoBanco(contato.proximo_contato) : null,
          em: new Date(contato.em),
        });
      }
      interacoesPorLead.set(contato.lead_id, atual);
    }

    return {
      itens: linhas.map((lead) => {
        const atualizadoEm = new Date(lead.atualizado_em);
        const retorno = situacaoDoRetorno(lead.etapa, lead.proximo_contato, hojeClinica);
        const proximoContato =
          retorno !== "encerrado" && lead.proximo_contato ? dataDoBanco(lead.proximo_contato) : null;
        const contatos = interacoesPorLead.get(lead.id);
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
          ultimoContatoEm: lead.ultimo_contato_em ? new Date(lead.ultimo_contato_em) : null,
          proximoContato,
          diasParaRetorno: proximoContato ? diferencaEmDias(proximoContato) : null,
          retornoHoje: retorno === "hoje",
          retornoAtrasado: retorno === "atrasado",
          interacoes: contatos?.recentes ?? [],
          totalInteracoes: contatos?.total ?? 0,
        };
      }),
      total,
      pagina,
      paginas: Math.max(1, Math.ceil(total / LEADS_POR_PAGINA)),
    };
  },
);
