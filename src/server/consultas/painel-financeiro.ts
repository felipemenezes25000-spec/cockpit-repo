import "server-only";

import { cache } from "react";
import { ehFinanceira } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, inicioDeMesRelativo, inicioDoDia, partesDoDia } from "@/lib/dates";
import { dataParaColuna, type Periodo } from "@/lib/periodo";
import type { FormaPagamento } from "@/lib/venda";

/**
 * Números do módulo Financeiro.
 *
 * A taxa de cartão NUNCA é somada duas vezes: ela sai do líquido dos
 * recebimentos e não existe como despesa. O resultado de caixa é
 * líquido recebido − despesas pagas — a taxa já foi descontada antes.
 *
 * Lucro não entra: a regra ainda não foi definida pela clínica.
 *
 * ATENÇÃO À RLS. A política de `despesas` é restrita ao financeiro, e uma
 * política de SELECT não recusa: ela devolve menos linhas, sem erro. Somar
 * `despesas` para a recepção daria zero — e "não posso ver" viraria "não
 * existe", com o resultado de caixa aparecendo errado na tela como se fosse
 * fato. Por isso o que depende de despesa é `number | null`: `null` quer dizer
 * "não visível para este perfil", e o tipo obriga quem consome a dizer isso na
 * tela em vez de imprimir um zero mentiroso.
 */

export type IndicadoresDoPeriodo = {
  totalVendido: number;
  totalRecebidoBruto: number;
  taxasDeCartao: number;
  liquidoRecebido: number;
  /** Ajustes de mudanças pós-confirmação, já dentro do líquido. */
  ajustes: number;
  aReceber: number;
  aReceberVencido: number;
  /** `null` quando o perfil não enxerga despesas — não é zero. */
  despesasPagas: number | null;
  despesasPendentes: number | null;
  resultadoDeCaixa: number | null;
};

export const indicadoresDoPeriodo = cache(
  async (periodo: Periodo): Promise<IndicadoresDoPeriodo> => {
    const supabase = await clienteServidor();
    const de = dataParaColuna(periodo.de);
    const ate = dataParaColuna(periodo.ate);
    const hoje = inicioDoDia();

    // Sem permissão, as consultas de despesa nem são feitas: a RLS devolveria
    // zero linhas em silêncio, e um zero desses é pior que a ausência.
    const veDespesas = await ehFinanceira();

    const [vendas, confirmados, emAberto, ajustes, despesas] = await Promise.all([
      supabase
        .from("vendas")
        .select("valor_final")
        .gte("data_venda", de)
        .lt("data_venda", ate),
      supabase
        .from("recebimentos")
        .select("valor, taxa_valor, valor_recebido")
        .in("situacao", ["recebido", "recebido_divergencia"])
        .gte("recebido_em", de)
        .lt("recebido_em", ate),
      // Em aberto é estoque, não fluxo: tudo que ainda não entrou, de
      // qualquer período — o que importa é que está devido hoje.
      supabase
        .from("recebimentos")
        .select("valor_liquido, vencimento")
        .in("situacao", ["previsto", "pendente"]),
      supabase
        .from("ajustes_financeiros")
        .select("valor")
        .gte("criado_em", periodo.de.toISOString())
        .lt("criado_em", periodo.ate.toISOString()),
      veDespesas
        ? Promise.all([
            supabase
              .from("despesas")
              .select("valor")
              .eq("situacao", "paga")
              .gte("pago_em", de)
              .lt("pago_em", ate),
            supabase
              .from("despesas")
              .select("valor")
              .eq("situacao", "pendente")
              .lt("vencimento", ate),
          ])
        : Promise.resolve(null),
    ]);

    const erro =
      vendas.error ?? confirmados.error ?? emAberto.error ?? ajustes.error ??
      despesas?.[0].error ?? despesas?.[1].error;
    if (erro) throw new Error(`Não foi possível carregar os indicadores: ${erro.message}`);

    const soma = (linhas: Record<string, unknown>[] | null, campo: string) =>
      (linhas ?? []).reduce((total, l) => total + Number(l[campo] ?? 0), 0);

    const totalRecebidoBruto = soma(confirmados.data, "valor");
    const taxasDeCartao = soma(confirmados.data, "taxa_valor");
    const efetivo = soma(confirmados.data, "valor_recebido");
    const somaAjustes = soma(ajustes.data, "valor");
    const despesasPagas = despesas ? soma(despesas[0].data, "valor") : null;

    const aReceberVencido = (emAberto.data ?? [])
      .filter((l) => dataDoBanco(l.vencimento as string).getTime() < hoje.getTime())
      .reduce((total, l) => total + Number(l.valor_liquido ?? 0), 0);

    const liquidoRecebido = efetivo + somaAjustes;

    return {
      totalVendido: soma(vendas.data, "valor_final"),
      totalRecebidoBruto,
      taxasDeCartao,
      liquidoRecebido,
      ajustes: somaAjustes,
      aReceber: soma(emAberto.data, "valor_liquido"),
      aReceberVencido,
      despesasPagas,
      despesasPendentes: despesas ? soma(despesas[1].data, "valor") : null,
      // Sem enxergar as saídas não existe resultado de caixa — e não é zero.
      resultadoDeCaixa: despesasPagas === null ? null : liquidoRecebido - despesasPagas,
    };
  },
);

// ---------------------------------------------------------------------
// Fluxo de caixa mensal
// ---------------------------------------------------------------------

export type MesDoFluxo = {
  mes: Date;
  recebido: number;
  despesas: number;
  resultado: number;
  acumulado: number;
};

/**
 * Últimos 12 meses, do mais antigo ao atual, com saldo acumulado.
 *
 * Exige o perfil financeiro e **falha alto** quando não o tem. Aqui não cabe o
 * `null` dos indicadores: a tabela inteira é entradas menos saídas, e sem as
 * saídas cada linha de resultado e de acumulado seria mentira. A rota
 * `/financeiro/fluxo` já barra antes; esta checagem existe para que um consumo
 * novo e desatento estoure em vez de exibir número errado.
 */
export const fluxoMensal = cache(async (): Promise<MesDoFluxo[]> => {
  if (!(await ehFinanceira())) {
    throw new Error(
      "Fluxo de caixa é restrito ao financeiro: sem acesso às despesas, o resultado seria falso.",
    );
  }

  const supabase = await clienteServidor();

  const inicio = inicioDeMesRelativo(-11);
  const fim = inicioDeMesRelativo(1);

  const [recebimentos, ajustes, despesas] = await Promise.all([
    supabase
      .from("recebimentos")
      .select("valor_recebido, recebido_em")
      .in("situacao", ["recebido", "recebido_divergencia"])
      .gte("recebido_em", dataParaColuna(inicio))
      .lt("recebido_em", dataParaColuna(fim)),
    supabase
      .from("ajustes_financeiros")
      .select("valor, criado_em")
      .gte("criado_em", inicio.toISOString())
      .lt("criado_em", fim.toISOString()),
    supabase
      .from("despesas")
      .select("valor, pago_em")
      .eq("situacao", "paga")
      .gte("pago_em", dataParaColuna(inicio))
      .lt("pago_em", dataParaColuna(fim)),
  ]);

  const erro = recebimentos.error ?? ajustes.error ?? despesas.error;
  if (erro) throw new Error(`Não foi possível montar o fluxo de caixa: ${erro.message}`);

  const baldes: MesDoFluxo[] = [];
  const indicePorChave = new Map<string, number>();

  for (let i = -11; i <= 0; i++) {
    const mes = inicioDeMesRelativo(i);
    const { ano, mes: numero } = partesDoDia(mes);
    indicePorChave.set(`${ano}-${numero}`, baldes.length);
    baldes.push({ mes, recebido: 0, despesas: 0, resultado: 0, acumulado: 0 });
  }

  const depositar = (instante: Date, campo: "recebido" | "despesas", valor: number) => {
    const { ano, mes } = partesDoDia(instante);
    const indice = indicePorChave.get(`${ano}-${mes}`);
    if (indice !== undefined) baldes[indice][campo] += valor;
  };

  for (const r of recebimentos.data ?? []) {
    if (r.recebido_em) {
      depositar(dataDoBanco(r.recebido_em), "recebido", Number(r.valor_recebido ?? 0));
    }
  }
  for (const a of ajustes.data ?? []) {
    depositar(new Date(a.criado_em), "recebido", Number(a.valor));
  }
  for (const d of despesas.data ?? []) {
    if (d.pago_em) depositar(dataDoBanco(d.pago_em), "despesas", Number(d.valor));
  }

  let acumulado = 0;
  for (const balde of baldes) {
    balde.resultado = balde.recebido - balde.despesas;
    acumulado += balde.resultado;
    balde.acumulado = acumulado;
  }

  return baldes;
});

// ---------------------------------------------------------------------
// Histórico das movimentações
// ---------------------------------------------------------------------

export type TipoMovimentacao = "venda" | "recebimento" | "despesa" | "ajuste";

export type Movimentacao = {
  tipo: TipoMovimentacao;
  data: Date;
  titulo: string;
  detalhe: string;
  /** Positivo entra, negativo sai. Zero para venda (é fato gerador, não caixa). */
  valor: number;
  forma: FormaPagamento | null;
  href: string | null;
};

/** Tudo que aconteceu no período, do mais recente para o mais antigo. */
export const movimentacoes = cache(async (periodo: Periodo): Promise<Movimentacao[]> => {
  const supabase = await clienteServidor();
  const de = dataParaColuna(periodo.de);
  const ate = dataParaColuna(periodo.ate);

  const [vendas, recebidos, despesas, ajustes] = await Promise.all([
    supabase
      .from("vendas")
      .select("id, data_venda, valor_final, forma, parcelas, pacientes(nome, nome_social), procedimentos(nome)")
      .gte("data_venda", de)
      .lt("data_venda", ate),
    supabase
      .from("recebimentos")
      .select("venda_id, recebido_em, valor_recebido, forma, descricao, pacientes(nome, nome_social)")
      .in("situacao", ["recebido", "recebido_divergencia"])
      .gte("recebido_em", de)
      .lt("recebido_em", ate),
    supabase
      .from("despesas")
      .select("id, pago_em, valor, descricao, forma")
      .eq("situacao", "paga")
      .gte("pago_em", de)
      .lt("pago_em", ate),
    supabase
      .from("ajustes_financeiros")
      .select("venda_id, criado_em, valor, motivo")
      .gte("criado_em", periodo.de.toISOString())
      .lt("criado_em", periodo.ate.toISOString()),
  ]);

  const erro = vendas.error ?? recebidos.error ?? despesas.error ?? ajustes.error;
  if (erro) throw new Error(`Não foi possível carregar as movimentações: ${erro.message}`);

  const nome = (p: { nome: string; nome_social: string | null } | null) =>
    p?.nome_social || p?.nome || "Paciente";

  const lista: Movimentacao[] = [
    ...(vendas.data ?? []).map((v): Movimentacao => ({
      tipo: "venda",
      data: dataDoBanco(v.data_venda),
      titulo: `Venda — ${nome(v.pacientes)}`,
      detalhe: `${v.procedimentos?.nome ?? "Procedimento"}${v.parcelas > 1 ? ` em ${v.parcelas}x` : ""}`,
      valor: Number(v.valor_final),
      forma: v.forma,
      href: `/financeiro/vendas/${v.id}`,
    })),
    ...(recebidos.data ?? []).map((r): Movimentacao => ({
      tipo: "recebimento",
      data: dataDoBanco(r.recebido_em!),
      titulo: `Recebimento — ${nome(r.pacientes)}`,
      detalhe: r.descricao ?? "",
      valor: Number(r.valor_recebido ?? 0),
      forma: r.forma,
      href: r.venda_id ? `/financeiro/vendas/${r.venda_id}` : null,
    })),
    ...(despesas.data ?? []).map((d): Movimentacao => ({
      tipo: "despesa",
      data: dataDoBanco(d.pago_em!),
      titulo: `Despesa — ${d.descricao}`,
      detalhe: "",
      valor: -Number(d.valor),
      forma: d.forma,
      href: `/financeiro/despesas/${d.id}/editar`,
    })),
    ...(ajustes.data ?? []).map((a): Movimentacao => ({
      tipo: "ajuste",
      data: new Date(a.criado_em),
      titulo: "Ajuste financeiro",
      detalhe: a.motivo,
      valor: Number(a.valor),
      forma: null,
      href: `/financeiro/vendas/${a.venda_id}`,
    })),
  ];

  return lista.sort((a, b) => b.data.getTime() - a.data.getTime());
});
