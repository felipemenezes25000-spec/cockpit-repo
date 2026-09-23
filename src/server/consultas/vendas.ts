import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { uuidValido } from "@/lib/formulario";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco } from "@/lib/dates";
import { dataParaColuna, type Periodo } from "@/lib/periodo";
import type {
  FormaPagamento,
  SituacaoRecebimento,
  TipoCartao,
} from "@/lib/venda";
import { todasAsLinhas } from "./todas-as-linhas";

export type VendaDaLista = {
  id: string;
  dataVenda: Date;
  paciente: string;
  procedimento: string;
  valorFinal: number;
  forma: FormaPagamento;
  parcelas: number;
  taxaValor: number;
  valorLiquido: number;
  taxaManual: boolean;
  situacaoRecebimento: SituacaoRecebimento | null;
  exemplo: boolean;
};

/**
 * Vendas do período, da mais recente para a mais antiga.
 *
 * A tela conta e soma esta lista ("N vendas · R$ X") e filtra por situação,
 * forma e busca aqui, na aplicação. Por isso as linhas são lidas inteiras, em
 * blocos (`todasAsLinhas`): o PostgREST corta cada resposta em 1000 linhas
 * sem erro, e o total do mês sairia menor, calado.
 */
export const listarVendas = cache(
  async (periodo: Periodo): Promise<VendaDaLista[]> => {
    const supabase = await clienteServidor();

    const linhas = await todasAsLinhas(
      (inicio, fim) =>
        supabase
          .from("vendas")
          .select(
            `id, data_venda, valor_final, forma, parcelas, taxa_valor, valor_liquido,
             taxa_manual, exemplo,
             pacientes ( nome, nome_social ),
             procedimentos ( nome ),
             recebimentos ( situacao, criado_em )`,
          )
          .gte("data_venda", dataParaColuna(periodo.de))
          .lt("data_venda", dataParaColuna(periodo.ate))
          .order("data_venda", { ascending: false })
          .order("criado_em", { ascending: false })
          // O `id` desempata: sem ordem única, blocos repetem ou pulam linhas.
          .order("id")
          .range(inicio, fim),
      "consulta vendas",
      "Não foi possível carregar as vendas.",
    );

    return linhas.map((v) => {
      // O recebimento vivo da venda: o primeiro não cancelado.
      const vivo = (v.recebimentos ?? [])
        .filter((r) => r.situacao !== "cancelado")
        .sort((a, b) => a.criado_em.localeCompare(b.criado_em))[0];

      return {
        id: v.id,
        dataVenda: dataDoBanco(v.data_venda),
        paciente: v.pacientes?.nome_social || v.pacientes?.nome || "Paciente",
        procedimento: v.procedimentos?.nome ?? "Procedimento",
        valorFinal: Number(v.valor_final),
        forma: v.forma,
        parcelas: v.parcelas,
        taxaValor: Number(v.taxa_valor),
        valorLiquido: Number(v.valor_liquido),
        taxaManual: v.taxa_manual,
        situacaoRecebimento: vivo?.situacao ?? null,
        exemplo: v.exemplo,
      };
    });
  },
);

// ---------------------------------------------------------------------
// Uma venda, com tudo que a tela de detalhe mostra
// ---------------------------------------------------------------------

export type RecebimentoDaVenda = {
  id: string;
  valor: number;
  taxaValor: number;
  valorLiquido: number;
  valorRecebido: number | null;
  situacao: SituacaoRecebimento;
  vencimento: Date;
  recebidoEm: Date | null;
};

export type AjusteDaVenda = {
  id: string;
  valor: number;
  motivo: string;
  em: Date;
  por: string | null;
};

export type AlteracaoDaVenda = {
  tipo: "forma_pagamento" | "taxa_manual";
  de: FotografiaGravada;
  para: FotografiaGravada;
  motivo: string;
  em: Date;
  por: string | null;
};

/** A fotografia como foi gravada no jsonb do histórico. */
export type FotografiaGravada = {
  forma: FormaPagamento;
  parcelas: number;
  taxa_percentual: number;
  taxa_valor: number;
  valor_liquido: number;
};

export type VendaCompleta = {
  id: string;
  pacienteId: string;
  paciente: string;
  procedimento: string;
  dataVenda: Date;
  valorOriginal: number;
  desconto: number;
  valorFinal: number;
  forma: FormaPagamento;
  parcelas: number;
  taxaCartaoId: string | null;
  taxaPercentual: number;
  taxaValor: number;
  valorLiquido: number;
  taxaManual: boolean;
  taxaJustificativa: string | null;
  observacoes: string | null;
  exemplo: boolean;
  recebimentos: RecebimentoDaVenda[];
  ajustes: AjusteDaVenda[];
  alteracoes: AlteracaoDaVenda[];
};

function lerFotografia(bruto: unknown): FotografiaGravada {
  const f = (bruto ?? {}) as Record<string, unknown>;
  return {
    forma: (f.forma as FormaPagamento) ?? "outra",
    parcelas: Number(f.parcelas ?? 1),
    taxa_percentual: Number(f.taxa_percentual ?? 0),
    taxa_valor: Number(f.taxa_valor ?? 0),
    valor_liquido: Number(f.valor_liquido ?? 0),
  };
}

export const vendaPorId = cache(async (id: string): Promise<VendaCompleta | null> => {
  // Endereço digitado à mão com id torto é "não existe" (404), não falha
  // do banco — o Postgres recusaria o texto como uuid.
  if (!uuidValido(id)) return null;

  const supabase = await clienteServidor();

  const [venda, ajustes, alteracoes] = await Promise.all([
    supabase
      .from("vendas")
      .select(
        `id, paciente_id, data_venda, valor_original, desconto, valor_final, forma,
         parcelas, taxa_cartao_id, taxa_percentual, taxa_valor, valor_liquido,
         taxa_manual, taxa_justificativa, observacoes, exemplo,
         pacientes ( nome, nome_social ), procedimentos ( nome ),
         recebimentos ( id, valor, taxa_valor, valor_liquido, valor_recebido,
                        situacao, vencimento, recebido_em, criado_em )`,
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("ajustes_financeiros")
      .select("id, valor, motivo, criado_em, perfis ( nome )")
      .eq("venda_id", id)
      .order("criado_em", { ascending: false }),
    supabase
      .from("venda_alteracoes")
      .select("tipo, de, para, motivo, em, perfis ( nome )")
      .eq("venda_id", id)
      .order("em", { ascending: false }),
  ]);

  // Falha de leitura não é "venda não existe", e histórico que não carregou
  // não é "sem histórico": ajuste e alteração escondidos mudam a leitura do
  // dinheiro. Qualquer erro vira tela de erro.
  const erro = venda.error ?? ajustes.error ?? alteracoes.error;
  if (erro) falhaDeConsulta("consulta vendas", erro, "Não foi possível carregar a venda.");
  if (!venda.data) return null;
  const v = venda.data;

  return {
    id: v.id,
    pacienteId: v.paciente_id,
    paciente: v.pacientes?.nome_social || v.pacientes?.nome || "Paciente",
    procedimento: v.procedimentos?.nome ?? "Procedimento",
    dataVenda: dataDoBanco(v.data_venda),
    valorOriginal: Number(v.valor_original),
    desconto: Number(v.desconto),
    valorFinal: Number(v.valor_final),
    forma: v.forma,
    parcelas: v.parcelas,
    taxaCartaoId: v.taxa_cartao_id,
    taxaPercentual: Number(v.taxa_percentual),
    taxaValor: Number(v.taxa_valor),
    valorLiquido: Number(v.valor_liquido),
    taxaManual: v.taxa_manual,
    taxaJustificativa: v.taxa_justificativa,
    observacoes: v.observacoes,
    exemplo: v.exemplo,
    recebimentos: (v.recebimentos ?? [])
      .sort((a, b) => a.criado_em.localeCompare(b.criado_em))
      .map((r) => ({
        id: r.id,
        valor: Number(r.valor),
        taxaValor: Number(r.taxa_valor),
        valorLiquido: Number(r.valor_liquido ?? r.valor),
        valorRecebido: r.valor_recebido === null ? null : Number(r.valor_recebido),
        situacao: r.situacao,
        vencimento: dataDoBanco(r.vencimento),
        recebidoEm: r.recebido_em ? dataDoBanco(r.recebido_em) : null,
      })),
    ajustes: (ajustes.data ?? []).map((a) => ({
      id: a.id,
      valor: Number(a.valor),
      motivo: a.motivo,
      em: new Date(a.criado_em),
      por: a.perfis?.nome ?? null,
    })),
    alteracoes: (alteracoes.data ?? []).map((a) => ({
      tipo: a.tipo as AlteracaoDaVenda["tipo"],
      de: lerFotografia(a.de),
      para: lerFotografia(a.para),
      motivo: a.motivo,
      em: new Date(a.em),
      por: a.perfis?.nome ?? null,
    })),
  };
});

// ---------------------------------------------------------------------
// Tabela de taxas para o formulário
// ---------------------------------------------------------------------

export type TaxaParaVenda = {
  id: string;
  operadora: string;
  tipo: TipoCartao;
  parcelas: number;
  percentual: number;
};

export const taxasParaVenda = cache(async (): Promise<TaxaParaVenda[]> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("taxas_cartao")
    .select("id, operadora, tipo, parcelas, percentual")
    .eq("ativa", true)
    .order("operadora")
    .order("tipo")
    .order("parcelas");

  if (error) falhaDeConsulta("consulta vendas", error, "Não foi possível carregar as taxas.");

  return (data ?? []).map((t) => ({
    id: t.id,
    operadora: t.operadora,
    tipo: t.tipo,
    parcelas: t.parcelas,
    percentual: Number(t.percentual),
  }));
});
