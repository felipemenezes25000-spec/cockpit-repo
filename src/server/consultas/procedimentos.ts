import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";

export type Procedimento = {
  id: string;
  nome: string;
  duracaoMin: number;
  valorPadrao: number;
  retornoSugeridoDias: number | null;
  ativo: boolean;
  exemplo: boolean;
  /** Quantos atendimentos já usaram este procedimento — explica por que não se apaga. */
  usos: number;
};

function mapear(
  p: {
    id: string;
    nome: string;
    duracao_min: number;
    valor_padrao: number;
    retorno_sugerido_dias: number | null;
    ativo: boolean;
    exemplo: boolean;
  },
  usos: number,
): Procedimento {
  return {
    id: p.id,
    nome: p.nome,
    duracaoMin: p.duracao_min,
    valorPadrao: p.valor_padrao,
    retornoSugeridoDias: p.retorno_sugerido_dias,
    ativo: p.ativo,
    exemplo: p.exemplo,
    usos,
  };
}

/**
 * Tabela de procedimentos, ativos primeiro e em ordem alfabética.
 *
 * A contagem de usos vem de uma segunda consulta leve: o PostgREST não agrega
 * sem view, e o catálogo de uma clínica tem dezenas de itens.
 */
export const listarProcedimentos = cache(async (): Promise<Procedimento[]> => {
  const supabase = await clienteServidor();

  const [procedimentos, atendimentos] = await Promise.all([
    supabase
      .from("procedimentos")
      .select("id, nome, duracao_min, valor_padrao, retorno_sugerido_dias, ativo, exemplo")
      .order("ativo", { ascending: false })
      .order("nome", { ascending: true }),
    supabase.from("atendimentos").select("procedimento_id"),
  ]);

  if (procedimentos.error) {
    falhaDeConsulta("consulta procedimentos", procedimentos.error, "Não foi possível carregar os procedimentos.");
  }

  const usos = new Map<string, number>();
  for (const a of atendimentos.data ?? []) {
    usos.set(a.procedimento_id, (usos.get(a.procedimento_id) ?? 0) + 1);
  }

  return (procedimentos.data ?? []).map((p) => mapear(p, usos.get(p.id) ?? 0));
});

export const procedimentoPorId = cache(
  async (id: string): Promise<Procedimento | null> => {
    const supabase = await clienteServidor();

    const [{ data, error }, atendimentos] = await Promise.all([
      supabase
        .from("procedimentos")
        .select("id, nome, duracao_min, valor_padrao, retorno_sugerido_dias, ativo, exemplo")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("atendimentos")
        .select("id", { count: "exact", head: true })
        .eq("procedimento_id", id),
    ]);

    if (error || !data) return null;
    return mapear(data, atendimentos.count ?? 0);
  },
);
