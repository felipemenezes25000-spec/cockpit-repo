import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias } from "@/lib/dates";
import type { Database } from "@/lib/supabase/tipos-banco";

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

/** Pendências em aberto: alta primeiro, depois o prazo mais próximo. */
export const pendenciasAbertas = cache(async (): Promise<PendenciaAberta[]> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("pendencias")
    .select("id, tipo, descricao, prazo, prioridade, pacientes ( nome, nome_social )")
    .eq("situacao", "aberta")
    .order("prazo", { ascending: true, nullsFirst: false });

  if (error) throw new Error(`Não foi possível carregar as pendências: ${error.message}`);

  return (data ?? [])
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
