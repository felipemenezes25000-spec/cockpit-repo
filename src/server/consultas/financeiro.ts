import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import {
  dataDoBanco,
  inicioDeMesRelativo,
  inicioDoDia,
  inicioDoMes,
  partesDoDia,
} from "@/lib/dates";

export type ResumoFinanceiro = {
  recebidoNoMes: number;
  aReceber: number;
  vencido: number;
  despesasDoMes: number;
};

export type PontoMensal = { data: Date; recebido: number };

/**
 * Movimento financeiro do mês corrente.
 *
 * Lucro não entra: a regra de cálculo ainda não foi definida pela clínica.
 */
export const resumoFinanceiro = cache(async (): Promise<ResumoFinanceiro> => {
  const supabase = await clienteServidor();

  const inicioMes = inicioDoMes();
  const inicioProximoMes = inicioDeMesRelativo(1);
  const hoje = inicioDoDia();

  const [quitados, emAberto, despesas] = await Promise.all([
    // O que de fato entrou: o valor efetivo, líquido de taxa de cartão.
    supabase
      .from("recebimentos")
      .select("valor_recebido")
      .in("situacao", ["recebido", "recebido_divergencia"])
      .gte("recebido_em", dataParaColuna(inicioMes))
      .lt("recebido_em", dataParaColuna(inicioProximoMes)),
    // Em aberto = previsto ou pendente, pelo líquido previsto.
    supabase
      .from("recebimentos")
      .select("valor_liquido, vencimento")
      .in("situacao", ["previsto", "pendente"]),
    supabase
      .from("despesas")
      .select("valor")
      .neq("situacao", "cancelada")
      .gte("competencia", dataParaColuna(inicioMes))
      .lt("competencia", dataParaColuna(inicioProximoMes)),
  ]);

  const erro = quitados.error ?? emAberto.error ?? despesas.error;
  if (erro) throw new Error(`Não foi possível carregar o financeiro: ${erro.message}`);

  const vencido = (emAberto.data ?? [])
    .filter((l) => dataDoBanco(l.vencimento).getTime() < hoje.getTime())
    .reduce((total, l) => total + Number(l.valor_liquido ?? 0), 0);

  return {
    recebidoNoMes: (quitados.data ?? []).reduce(
      (total, l) => total + Number(l.valor_recebido ?? 0),
      0,
    ),
    aReceber: (emAberto.data ?? []).reduce(
      (total, l) => total + Number(l.valor_liquido ?? 0),
      0,
    ),
    vencido,
    despesasDoMes: (despesas.data ?? []).reduce((total, l) => total + Number(l.valor), 0),
  };
});

/** Recebido em cada um dos últimos seis meses, do mais antigo ao atual. */
export const serieMensalRecebimentos = cache(async (): Promise<PontoMensal[]> => {
  const supabase = await clienteServidor();

  const inicio = inicioDeMesRelativo(-5);
  const fim = inicioDeMesRelativo(1);

  const { data, error } = await supabase
    .from("recebimentos")
    .select("valor_recebido, recebido_em")
    .in("situacao", ["recebido", "recebido_divergencia"])
    .gte("recebido_em", dataParaColuna(inicio))
    .lt("recebido_em", dataParaColuna(fim));

  if (error) {
    throw new Error(`Não foi possível carregar a evolução mensal: ${error.message}`);
  }

  // Um balde por mês, na ordem, para meses sem movimento aparecerem zerados.
  const baldes: PontoMensal[] = [];
  const indicePorChave = new Map<string, number>();

  for (let i = -5; i <= 0; i++) {
    const inicioDoBalde = inicioDeMesRelativo(i);
    const { ano, mes } = partesDoDia(inicioDoBalde);
    indicePorChave.set(`${ano}-${mes}`, baldes.length);
    baldes.push({ data: inicioDoBalde, recebido: 0 });
  }

  for (const linha of data ?? []) {
    if (!linha.recebido_em) continue;
    const { ano, mes } = partesDoDia(dataDoBanco(linha.recebido_em));
    const indice = indicePorChave.get(`${ano}-${mes}`);
    if (indice !== undefined) baldes[indice].recebido += Number(linha.valor_recebido ?? 0);
  }

  return baldes;
});

/** Colunas `date` do Postgres comparam com texto "AAAA-MM-DD". */
function dataParaColuna(instante: Date): string {
  const { ano, mes, dia } = partesDoDia(instante);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}
