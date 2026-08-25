import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import type { TipoCartao } from "@/lib/venda";

export type TaxaCartao = {
  id: string;
  operadora: string;
  tipo: TipoCartao;
  parcelas: number;
  percentual: number;
  ativa: boolean;
  /** Quantas vendas nasceram desta linha — explica por que não se apaga. */
  usos: number;
};

/** A tabela inteira: ativas primeiro, por operadora, tipo e parcelas. */
export const listarTaxas = cache(async (): Promise<TaxaCartao[]> => {
  const supabase = await clienteServidor();

  const [taxas, vendas] = await Promise.all([
    supabase
      .from("taxas_cartao")
      .select("id, operadora, tipo, parcelas, percentual, ativa")
      .order("ativa", { ascending: false })
      .order("operadora")
      .order("tipo")
      .order("parcelas"),
    supabase.from("vendas").select("taxa_cartao_id").not("taxa_cartao_id", "is", null),
  ]);

  if (taxas.error) {
    throw new Error(`Não foi possível carregar as taxas: ${taxas.error.message}`);
  }

  const usos = new Map<string, number>();
  for (const v of vendas.data ?? []) {
    if (v.taxa_cartao_id) usos.set(v.taxa_cartao_id, (usos.get(v.taxa_cartao_id) ?? 0) + 1);
  }

  return (taxas.data ?? []).map((t) => ({
    id: t.id,
    operadora: t.operadora,
    tipo: t.tipo,
    parcelas: t.parcelas,
    percentual: Number(t.percentual),
    ativa: t.ativa,
    usos: usos.get(t.id) ?? 0,
  }));
});

export const taxaPorId = cache(async (id: string): Promise<TaxaCartao | null> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("taxas_cartao")
    .select("id, operadora, tipo, parcelas, percentual, ativa")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    operadora: data.operadora,
    tipo: data.tipo,
    parcelas: data.parcelas,
    percentual: Number(data.percentual),
    ativa: data.ativa,
    usos: 0,
  };
});
