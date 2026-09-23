import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias } from "@/lib/dates";
import type { Database } from "@/lib/supabase/tipos-banco";
import { todasAsLinhas } from "./todas-as-linhas";

export type TipoPendencia = Database["public"]["Enums"]["tipo_pendencia"];
export type Prioridade = Database["public"]["Enums"]["prioridade"];

export type PendenciaAberta = {
  id: string;
  tipo: TipoPendencia;
  descricao: string;
  paciente: string | null;
  prazo: Date | null;
  /** Negativo quando o prazo já passou. */
  prazoEmDias: number | null;
  prioridade: Prioridade;
  /** Módulo que vai resolver a pendência quando estiver pronto. */
  destino: string;
};

export const ROTULO_PENDENCIA: Record<TipoPendencia, string> = {
  anamnese: "Anamnese",
  termo: "Termo",
  confirmacao: "Confirmação",
  pagamento: "Pagamento",
  retorno: "Retorno",
  pesquisa: "Pesquisa",
  outro: "Tarefa",
};

/** Onde cada tipo de pendência é resolvido. */
const DESTINO: Record<TipoPendencia, string> = {
  anamnese: "/prontuarios",
  termo: "/formularios",
  confirmacao: "/agenda",
  pagamento: "/financeiro",
  retorno: "/relacionamento",
  pesquisa: "/relacionamento",
  outro: "/relacionamento",
};

const PESO: Record<Prioridade, number> = { alta: 0, media: 1, baixa: 2 };

/**
 * Pendências em aberto: alta primeiro, depois o prazo mais próximo.
 *
 * Lidas inteiras, em blocos (`todasAsLinhas`): o menu e a Visão Geral contam
 * estas linhas ("N em aberto", "N de prioridade alta") e a ordem final é
 * feita aqui. O PostgREST corta cada resposta em 1000 linhas sem erro — a
 * contagem sairia menor e a mais urgente poderia ficar de fora, calada.
 */
export const pendenciasAbertas = cache(async (): Promise<PendenciaAberta[]> => {
  const supabase = await clienteServidor();

  const linhas = await todasAsLinhas(
    (inicio, fim) =>
      supabase
        .from("pendencias")
        .select("id, tipo, descricao, prazo, prioridade, pacientes ( nome, nome_social )")
        .eq("situacao", "aberta")
        // O `id` desempata o prazo: sem ordem única, blocos repetem ou pulam linhas.
        .order("prazo", { ascending: true, nullsFirst: false })
        .order("id")
        .range(inicio, fim),
    "consulta pendencias",
    "Não foi possível carregar as pendências.",
  );

  return linhas
    .map((linha) => {
      const prazo = linha.prazo ? dataDoBanco(linha.prazo) : null;
      return {
        id: linha.id,
        tipo: linha.tipo,
        descricao: linha.descricao,
        paciente: linha.pacientes?.nome_social || linha.pacientes?.nome || null,
        prazo,
        prazoEmDias: prazo ? diferencaEmDias(prazo) : null,
        prioridade: linha.prioridade,
        destino: DESTINO[linha.tipo],
      };
    })
    .sort(
      (a, b) =>
        PESO[a.prioridade] - PESO[b.prioridade] ||
        (a.prazoEmDias ?? 9999) - (b.prazoEmDias ?? 9999),
    );
});
