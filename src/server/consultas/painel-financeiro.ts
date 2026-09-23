import "server-only";

import { cache } from "react";
import { ehFinanceira } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, inicioDeMesRelativo, inicioDoDia, partesDoDia } from "@/lib/dates";
import { centavosDoBanco, centavosParaReais, somaEmCentavos } from "@/lib/moeda";
import { dataParaColuna, type Periodo } from "@/lib/periodo";
import type { FormaPagamento } from "@/lib/venda";
import { todasAsLinhas } from "./todas-as-linhas";

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
 *
 * ATENÇÃO AO `max_rows`. O PostgREST corta cada resposta em 1000 linhas, também
 * sem erro. Toda consulta daqui que soma, agrupa ou ordena na aplicação lê as
 * linhas em blocos por `todasAsLinhas` — somar sobre o corte daria um total
 * menor sem nada avisar (no fluxo de 12 meses, a partir de umas 80 vendas
 * confirmadas por mês).
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

    // Cada leitura falha alto sozinha (`todasAsLinhas`), com a mesma frase.
    const contexto = "consulta painel-financeiro: indicadores";
    const frase = "Não foi possível carregar os indicadores.";

    const [vendas, confirmadosDoMes, abertos, ajustes, despesas] = await Promise.all([
      todasAsLinhas(
        (inicio, fim) =>
          supabase
            .from("vendas")
            .select("valor_final")
            .gte("data_venda", de)
            .lt("data_venda", ate)
            .order("id")
            .range(inicio, fim),
        contexto,
        frase,
      ),
      todasAsLinhas(
        (inicio, fim) =>
          supabase
            .from("recebimentos")
            .select("valor, taxa_valor, valor_recebido")
            .in("situacao", ["recebido", "recebido_divergencia"])
            .gte("recebido_em", de)
            .lt("recebido_em", ate)
            .order("id")
            .range(inicio, fim),
        contexto,
        frase,
      ),
      // Em aberto é estoque, não fluxo: tudo que ainda não entrou, de
      // qualquer período — o que importa é que está devido hoje.
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
      todasAsLinhas(
        (inicio, fim) =>
          supabase
            .from("ajustes_financeiros")
            .select("valor")
            .gte("criado_em", periodo.de.toISOString())
            .lt("criado_em", periodo.ate.toISOString())
            .order("id")
            .range(inicio, fim),
        contexto,
        frase,
      ),
      veDespesas
        ? Promise.all([
            todasAsLinhas(
              (inicio, fim) =>
                supabase
                  .from("despesas")
                  .select("valor")
                  .eq("situacao", "paga")
                  .gte("pago_em", de)
                  .lt("pago_em", ate)
                  .order("id")
                  .range(inicio, fim),
              contexto,
              frase,
            ),
            todasAsLinhas(
              (inicio, fim) =>
                supabase
                  .from("despesas")
                  .select("valor")
                  .eq("situacao", "pendente")
                  .lt("vencimento", ate)
                  .order("id")
                  .range(inicio, fim),
              contexto,
              frase,
            ),
          ])
        : Promise.resolve(null),
    ]);

    // Toda a conta em centavos inteiros (lib/moeda.ts): somar reais em
    // ponto flutuante deixa resto de 0,01 que aparece no resultado de caixa.
    // Reais só na saída, com uma divisão por número.
    const totalRecebidoBruto = somaEmCentavos(confirmadosDoMes.map((l) => l.valor));
    const taxasDeCartao = somaEmCentavos(confirmadosDoMes.map((l) => l.taxa_valor));
    const efetivo = somaEmCentavos(confirmadosDoMes.map((l) => l.valor_recebido));
    // Ajuste entra pelo mês em que foi lançado (`criado_em`), não pelo mês do
    // recebimento corrigido — dívida contábil em aberto (AGENTS.md §13).
    const somaAjustes = somaEmCentavos(ajustes.map((l) => l.valor));
    const despesasPagas = despesas
      ? somaEmCentavos(despesas[0].map((l) => l.valor))
      : null;

    const aReceberVencido = somaEmCentavos(
      abertos
        .filter((l) => dataDoBanco(l.vencimento).getTime() < hoje.getTime())
        .map((l) => l.valor_liquido),
    );

    const liquidoRecebido = efetivo + somaAjustes;

    return {
      totalVendido: centavosParaReais(somaEmCentavos(vendas.map((l) => l.valor_final))),
      totalRecebidoBruto: centavosParaReais(totalRecebidoBruto),
      taxasDeCartao: centavosParaReais(taxasDeCartao),
      liquidoRecebido: centavosParaReais(liquidoRecebido),
      ajustes: centavosParaReais(somaAjustes),
      aReceber: centavosParaReais(somaEmCentavos(abertos.map((l) => l.valor_liquido))),
      aReceberVencido: centavosParaReais(aReceberVencido),
      despesasPagas: despesasPagas === null ? null : centavosParaReais(despesasPagas),
      despesasPendentes: despesas
        ? centavosParaReais(somaEmCentavos(despesas[1].map((l) => l.valor)))
        : null,
      // Sem enxergar as saídas não existe resultado de caixa — e não é zero.
      resultadoDeCaixa:
        despesasPagas === null ? null : centavosParaReais(liquidoRecebido - despesasPagas),
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

  const contexto = "consulta painel-financeiro: fluxo mensal";
  const frase = "Não foi possível montar o fluxo de caixa.";

  const [recebimentos, ajustes, despesas] = await Promise.all([
    todasAsLinhas(
      (de, ate) =>
        supabase
          .from("recebimentos")
          .select("valor_recebido, recebido_em")
          .in("situacao", ["recebido", "recebido_divergencia"])
          .gte("recebido_em", dataParaColuna(inicio))
          .lt("recebido_em", dataParaColuna(fim))
          .order("id")
          .range(de, ate),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (de, ate) =>
        supabase
          .from("ajustes_financeiros")
          .select("valor, criado_em")
          .gte("criado_em", inicio.toISOString())
          .lt("criado_em", fim.toISOString())
          .order("id")
          .range(de, ate),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (de, ate) =>
        supabase
          .from("despesas")
          .select("valor, pago_em")
          .eq("situacao", "paga")
          .gte("pago_em", dataParaColuna(inicio))
          .lt("pago_em", dataParaColuna(fim))
          .order("id")
          .range(de, ate),
      contexto,
      frase,
    ),
  ]);

  // Os baldes somam centavos inteiros; reais só na saída (lib/moeda.ts).
  const baldes: { mes: Date; recebido: number; despesas: number }[] = [];
  const indicePorChave = new Map<string, number>();

  for (let i = -11; i <= 0; i++) {
    const mes = inicioDeMesRelativo(i);
    const { ano, mes: numero } = partesDoDia(mes);
    indicePorChave.set(`${ano}-${numero}`, baldes.length);
    baldes.push({ mes, recebido: 0, despesas: 0 });
  }

  const depositar = (instante: Date, campo: "recebido" | "despesas", valor: number) => {
    const { ano, mes } = partesDoDia(instante);
    const indice = indicePorChave.get(`${ano}-${mes}`);
    if (indice !== undefined) baldes[indice][campo] += centavosDoBanco(valor);
  };

  for (const r of recebimentos) {
    if (r.recebido_em && r.valor_recebido !== null) {
      depositar(dataDoBanco(r.recebido_em), "recebido", Number(r.valor_recebido));
    }
  }
  // Ajuste entra no mês do lançamento (`criado_em`) — dívida em aberto, §13.
  for (const a of ajustes) {
    depositar(new Date(a.criado_em), "recebido", Number(a.valor));
  }
  for (const d of despesas) {
    if (d.pago_em) depositar(dataDoBanco(d.pago_em), "despesas", Number(d.valor));
  }

  let acumulado = 0;
  return baldes.map((balde) => {
    const resultado = balde.recebido - balde.despesas;
    acumulado += resultado;
    return {
      mes: balde.mes,
      recebido: centavosParaReais(balde.recebido),
      despesas: centavosParaReais(balde.despesas),
      resultado: centavosParaReais(resultado),
      acumulado: centavosParaReais(acumulado),
    };
  });
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

  // A lista é juntada, ordenada e filtrada aqui: um corte do `max_rows` numa
  // das quatro leituras tiraria movimentações do extrato sem aviso.
  const contexto = "consulta painel-financeiro: movimentações";
  const frase = "Não foi possível carregar as movimentações.";

  const [vendas, recebidos, despesas, ajustes] = await Promise.all([
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("vendas")
          .select("id, data_venda, valor_final, forma, parcelas, pacientes(nome, nome_social), procedimentos(nome)")
          .gte("data_venda", de)
          .lt("data_venda", ate)
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("recebimentos")
          .select("venda_id, recebido_em, valor_recebido, forma, descricao, pacientes(nome, nome_social)")
          .in("situacao", ["recebido", "recebido_divergencia"])
          .gte("recebido_em", de)
          .lt("recebido_em", ate)
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("despesas")
          .select("id, pago_em, valor, descricao, forma")
          .eq("situacao", "paga")
          .gte("pago_em", de)
          .lt("pago_em", ate)
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
    todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("ajustes_financeiros")
          .select("venda_id, criado_em, valor, motivo")
          .gte("criado_em", periodo.de.toISOString())
          .lt("criado_em", periodo.ate.toISOString())
          .order("id")
          .range(inicio, fim),
      contexto,
      frase,
    ),
  ]);

  const nome = (p: { nome: string; nome_social: string | null } | null) =>
    p?.nome_social || p?.nome || "Paciente";

  const lista: Movimentacao[] = [
    ...vendas.map((v): Movimentacao => ({
      tipo: "venda",
      data: dataDoBanco(v.data_venda),
      titulo: `Venda — ${nome(v.pacientes)}`,
      detalhe: `${v.procedimentos?.nome ?? "Procedimento"}${v.parcelas > 1 ? ` em ${v.parcelas}x` : ""}`,
      valor: Number(v.valor_final),
      forma: v.forma,
      href: `/financeiro/vendas/${v.id}`,
    })),
    ...recebidos.map((r): Movimentacao => ({
      tipo: "recebimento",
      data: dataDoBanco(r.recebido_em!),
      titulo: `Recebimento — ${nome(r.pacientes)}`,
      detalhe: r.descricao ?? "",
      valor: Number(r.valor_recebido ?? 0),
      forma: r.forma,
      href: r.venda_id ? `/financeiro/vendas/${r.venda_id}` : null,
    })),
    ...despesas.map((d): Movimentacao => ({
      tipo: "despesa",
      data: dataDoBanco(d.pago_em!),
      titulo: `Despesa — ${d.descricao}`,
      detalhe: "",
      valor: -Number(d.valor),
      forma: d.forma,
      href: `/financeiro/despesas/${d.id}/editar`,
    })),
    ...ajustes.map((a): Movimentacao => ({
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
