import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { uuidValido } from "@/lib/formulario";
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

/**
 * A tabela inteira: ativas primeiro, por operadora, tipo e parcelas.
 *
 * O "aplicada em N vendas" é contado pelo banco (`vendas(count)`), numa
 * consulta só: antes a tela baixava a coluna `taxa_cartao_id` de todas as
 * vendas da clínica para contar em memória — e ignorava o erro dessa leitura,
 * mostrando "0 vendas" quando ela falhava.
 */
export const listarTaxas = cache(async (): Promise<TaxaCartao[]> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("taxas_cartao")
    .select("id, operadora, tipo, parcelas, percentual, ativa, vendas(count)")
    .order("ativa", { ascending: false })
    .order("operadora")
    .order("tipo")
    .order("parcelas");

  if (error) falhaDeConsulta("consulta taxas", error, "Não foi possível carregar as taxas.");

  return (data ?? []).map((t) => ({
    id: t.id,
    operadora: t.operadora,
    tipo: t.tipo,
    parcelas: t.parcelas,
    percentual: Number(t.percentual),
    ativa: t.ativa,
    usos: t.vendas[0]?.count ?? 0,
  }));
});

export const taxaPorId = cache(async (id: string): Promise<TaxaCartao | null> => {
  // Endereço digitado à mão com id torto é "não existe" (404), não falha
  // do banco — o Postgres recusaria o texto como uuid.
  if (!uuidValido(id)) return null;

  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("taxas_cartao")
    .select("id, operadora, tipo, parcelas, percentual, ativa")
    .eq("id", id)
    .maybeSingle();

  // Falha de leitura não é "taxa não existe": vira tela de erro, não 404.
  if (error) falhaDeConsulta("consulta taxas", error, "Não foi possível carregar a taxa.");
  if (!data) return null;

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
