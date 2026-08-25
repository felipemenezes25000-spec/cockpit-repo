import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias } from "@/lib/dates";
import { dataParaColuna, type Periodo } from "@/lib/periodo";
import type { CategoriaDespesa, SituacaoDespesa } from "@/lib/despesa";
import type { FormaPagamento } from "@/lib/venda";

export type Despesa = {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  vencimento: Date;
  venceEmDias: number;
  pagoEm: Date | null;
  forma: FormaPagamento | null;
  situacao: SituacaoDespesa;
  observacoes: string | null;
  exemplo: boolean;
};

function mapear(d: {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  vencimento: string;
  pago_em: string | null;
  forma: FormaPagamento | null;
  situacao: SituacaoDespesa;
  observacoes: string | null;
  exemplo: boolean;
}): Despesa {
  const vencimento = dataDoBanco(d.vencimento);
  return {
    id: d.id,
    descricao: d.descricao,
    categoria: d.categoria,
    valor: Number(d.valor),
    vencimento,
    venceEmDias: diferencaEmDias(vencimento),
    pagoEm: d.pago_em ? dataDoBanco(d.pago_em) : null,
    forma: d.forma,
    situacao: d.situacao,
    observacoes: d.observacoes,
    exemplo: d.exemplo,
  };
}

const COLUNAS =
  "id, descricao, categoria, valor, vencimento, pago_em, forma, situacao, observacoes, exemplo";

/**
 * Despesas do mês (pelo vencimento), mais as pendentes atrasadas de meses
 * anteriores — dívida velha não pode sumir da tela ao virar o mês.
 */
export const listarDespesas = cache(async (periodo: Periodo): Promise<Despesa[]> => {
  const supabase = await clienteServidor();

  const [doMes, atrasadas] = await Promise.all([
    supabase
      .from("despesas")
      .select(COLUNAS)
      .gte("vencimento", dataParaColuna(periodo.de))
      .lt("vencimento", dataParaColuna(periodo.ate))
      .order("vencimento", { ascending: true }),
    supabase
      .from("despesas")
      .select(COLUNAS)
      .eq("situacao", "pendente")
      .lt("vencimento", dataParaColuna(periodo.de))
      .order("vencimento", { ascending: true }),
  ]);

  const erro = doMes.error ?? atrasadas.error;
  if (erro) throw new Error(`Não foi possível carregar as despesas: ${erro.message}`);

  return [...(atrasadas.data ?? []), ...(doMes.data ?? [])].map(mapear);
});

export const despesaPorId = cache(async (id: string): Promise<Despesa | null> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("despesas")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapear(data);
});
