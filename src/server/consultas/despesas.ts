import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { uuidValido } from "@/lib/formulario";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias } from "@/lib/dates";
import { dataParaColuna, type Periodo } from "@/lib/periodo";
import type { CategoriaDespesa, SituacaoDespesa } from "@/lib/despesa";
import type { FormaPagamento } from "@/lib/venda";
import { todasAsLinhas } from "./todas-as-linhas";

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
 *
 * A tela conta e soma esta lista ("N despesas · R$ X a pagar") e filtra por
 * situação e categoria aqui, na aplicação. Por isso as linhas são lidas
 * inteiras, em blocos (`todasAsLinhas`): o PostgREST corta cada resposta em
 * 1000 linhas sem erro, e o total a pagar sairia menor, calado — as
 * atrasadas de todos os meses anteriores se acumulam.
 */
export const listarDespesas = cache(async (periodo: Periodo): Promise<Despesa[]> => {
  const supabase = await clienteServidor();
  const contexto = "consulta despesas";
  const frase = "Não foi possível carregar as despesas.";

  const [doMes, atrasadas] = await Promise.all([
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("despesas")
          .select(COLUNAS)
          .gte("vencimento", dataParaColuna(periodo.de))
          .lt("vencimento", dataParaColuna(periodo.ate))
          // O `id` desempata o vencimento: sem ordem única, blocos repetem ou pulam linhas.
          .order("vencimento", { ascending: true })
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("despesas")
          .select(COLUNAS)
          .eq("situacao", "pendente")
          .lt("vencimento", dataParaColuna(periodo.de))
          .order("vencimento", { ascending: true })
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
  ]);

  return [...atrasadas, ...doMes].map(mapear);
});

export const despesaPorId = cache(async (id: string): Promise<Despesa | null> => {
  // Endereço digitado à mão com id torto é "não existe" (404), não falha
  // do banco — o Postgres recusaria o texto como uuid.
  if (!uuidValido(id)) return null;

  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("despesas")
    .select(COLUNAS)
    .eq("id", id)
    .maybeSingle();

  // Falha de leitura não é "despesa não existe": vira tela de erro, não 404.
  if (error) falhaDeConsulta("consulta despesas", error, "Não foi possível carregar a despesa.");
  if (!data) return null;
  return mapear(data);
});
