import "server-only";

import { cache } from "react";
import { ehFinanceira } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import {
  dataDoBanco,
  inicioDeMesRelativo,
  inicioDoDia,
  inicioDoMes,
  partesDoDia,
} from "@/lib/dates";
import { centavosDoBanco, centavosParaReais, somaEmCentavos } from "@/lib/moeda";
import { dataParaColuna } from "@/lib/periodo";
import { todasAsLinhas } from "./todas-as-linhas";

export type ResumoFinanceiro = {
  recebidoNoMes: number;
  aReceber: number;
  vencido: number;
  /**
   * `null` quando o perfil não enxerga despesas — não é zero.
   * A RLS de `despesas` filtra em silêncio: somar para a recepção daria zero,
   * e "não posso ver" apareceria na tela como "não há".
   */
  despesasDoMes: number | null;
};

export type PontoMensal = { data: Date; recebido: number };

/**
 * Movimento financeiro do mês corrente.
 *
 * Lucro não entra: a regra de cálculo ainda não foi definida pela clínica.
 *
 * As linhas somadas aqui são lidas inteiras, em blocos (`todasAsLinhas`): o
 * PostgREST corta cada resposta em 1000 linhas sem erro, e "A receber" e
 * "Vencido" são estoque de qualquer período — o total sairia menor calado.
 */
export const resumoFinanceiro = cache(async (): Promise<ResumoFinanceiro> => {
  const supabase = await clienteServidor();

  const inicioMes = inicioDoMes();
  const inicioProximoMes = inicioDeMesRelativo(1);
  const hoje = inicioDoDia();

  const veDespesas = await ehFinanceira();

  const contexto = "consulta financeiro: resumo";
  const frase = "Não foi possível carregar o financeiro.";

  const [quitados, abertos, despesas] = await Promise.all([
    // O que de fato entrou: o valor efetivo, líquido de taxa de cartão.
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("recebimentos")
          .select("valor_recebido")
          .in("situacao", ["recebido", "recebido_divergencia"])
          .gte("recebido_em", dataParaColuna(inicioMes))
          .lt("recebido_em", dataParaColuna(inicioProximoMes))
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    // Em aberto = previsto ou pendente, pelo líquido previsto.
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("recebimentos")
          .select("valor_liquido, vencimento")
          .in("situacao", ["previsto", "pendente"])
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    veDespesas
      ? todasAsLinhas(
          (inicio, fim) =>
            supabase
              .from("despesas")
              .select("valor")
              .neq("situacao", "cancelada")
              .gte("competencia", dataParaColuna(inicioMes))
              .lt("competencia", dataParaColuna(inicioProximoMes))
              .order("id")
              .range(inicio, fim),
          contexto,
          frase,
        )
      : Promise.resolve(null),
  ]);

  // Somas em centavos inteiros; reais só na saída (lib/moeda.ts).
  const vencido = somaEmCentavos(
    abertos
      .filter((l) => dataDoBanco(l.vencimento).getTime() < hoje.getTime())
      .map((l) => l.valor_liquido),
  );

  return {
    recebidoNoMes: centavosParaReais(somaEmCentavos(quitados.map((l) => l.valor_recebido))),
    aReceber: centavosParaReais(somaEmCentavos(abertos.map((l) => l.valor_liquido))),
    vencido: centavosParaReais(vencido),
    despesasDoMes: despesas
      ? centavosParaReais(somaEmCentavos(despesas.map((l) => l.valor)))
      : null,
  };
});

/** Recebido em cada um dos últimos seis meses, do mais antigo ao atual. */
export const serieMensalRecebimentos = cache(async (): Promise<PontoMensal[]> => {
  const supabase = await clienteServidor();

  const inicio = inicioDeMesRelativo(-5);
  const fim = inicioDeMesRelativo(1);

  // Seis meses de recebimentos confirmados passam das 1000 linhas do
  // `max_rows` com umas 170 vendas por mês: lidos em blocos, não cortados.
  const linhas = await todasAsLinhas(
    (de, ate) =>
      supabase
        .from("recebimentos")
        .select("valor_recebido, recebido_em")
        .in("situacao", ["recebido", "recebido_divergencia"])
        .gte("recebido_em", dataParaColuna(inicio))
        .lt("recebido_em", dataParaColuna(fim))
        .order("id")
        .range(de, ate),
    "consulta financeiro: série mensal",
    "Não foi possível carregar a evolução mensal.",
  );

  // Um balde por mês, na ordem, para meses sem movimento aparecerem zerados.
  // A soma de cada balde é em centavos inteiros; reais só na saída.
  const baldes: { data: Date; centavos: number }[] = [];
  const indicePorChave = new Map<string, number>();

  for (let i = -5; i <= 0; i++) {
    const inicioDoBalde = inicioDeMesRelativo(i);
    const { ano, mes } = partesDoDia(inicioDoBalde);
    indicePorChave.set(`${ano}-${mes}`, baldes.length);
    baldes.push({ data: inicioDoBalde, centavos: 0 });
  }

  for (const linha of linhas) {
    if (!linha.recebido_em || linha.valor_recebido === null) continue;
    const { ano, mes } = partesDoDia(dataDoBanco(linha.recebido_em));
    const indice = indicePorChave.get(`${ano}-${mes}`);
    if (indice !== undefined) baldes[indice].centavos += centavosDoBanco(Number(linha.valor_recebido));
  }

  return baldes.map((b) => ({ data: b.data, recebido: centavosParaReais(b.centavos) }));
});
