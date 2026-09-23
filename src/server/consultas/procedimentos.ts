import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { uuidValido } from "@/lib/formulario";
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
 * Colunas do procedimento e a contagem de usos, feita pelo banco
 * (`atendimentos(count)`) — como o "aplicada em N vendas" das taxas. A lista e
 * a tela de edição usam a mesma, para os dois números nunca divergirem.
 */
const COLUNAS =
  "id, nome, duracao_min, valor_padrao, retorno_sugerido_dias, ativo, exemplo, atendimentos(count)";

/**
 * Tabela de procedimentos, ativos primeiro e em ordem alfabética.
 *
 * Antes os usos vinham de uma segunda consulta que baixava o
 * `procedimento_id` de todos os atendimentos para contar em memória. O
 * PostgREST corta cada resposta em 1000 linhas sem erro, e o `error` dessa
 * leitura nem era lido: passados 1000 atendimentos a contagem saía menor —
 * ou zero, se a leitura falhasse —, calada. O catálogo em si tem dezenas de
 * itens e cabe numa resposta.
 */
export const listarProcedimentos = cache(async (): Promise<Procedimento[]> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("procedimentos")
    .select(COLUNAS)
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });

  if (error) falhaDeConsulta("consulta procedimentos", error, "Não foi possível carregar os procedimentos.");

  return (data ?? []).map((p) => mapear(p, p.atendimentos[0]?.count ?? 0));
});

export const procedimentoPorId = cache(
  async (id: string): Promise<Procedimento | null> => {
    // Endereço digitado à mão com id torto é "não existe" (404), não falha
    // do banco — o Postgres recusaria o texto como uuid.
    if (!uuidValido(id)) return null;

    const supabase = await clienteServidor();

    const { data, error } = await supabase
      .from("procedimentos")
      .select(COLUNAS)
      .eq("id", id)
      .maybeSingle();

    // Falha de leitura não é "procedimento não existe" nem "nenhum uso": vira
    // tela de erro, não 404 nem um zero que ninguém conferiu.
    if (error) falhaDeConsulta("consulta procedimentos", error, "Não foi possível carregar o procedimento.");
    if (!data) return null;
    return mapear(data, data.atendimentos[0]?.count ?? 0);
  },
);
