import { custoDaTaxa } from "./moeda";
import type { Database } from "./supabase/tipos-banco";

/**
 * Regras da venda, usadas pelo formulário, pelas ações de servidor e pelos
 * testes. Uma regra escrita duas vezes vira duas regras diferentes.
 */

type Enums = Database["public"]["Enums"];
export type FormaPagamento = Enums["forma_pagamento"];
export type SituacaoRecebimento = Enums["situacao_recebimento"];
export type TipoCartao = Enums["tipo_cartao"];
export type Papel = Enums["papel_usuario"];

export const ROTULO_FORMA: Record<FormaPagamento, string> = {
  pix: "PIX",
  dinheiro: "Dinheiro",
  debito: "Cartão de débito",
  credito: "Cartão de crédito",
  boleto: "Boleto",
  transferencia: "Transferência",
  outra: "Outra",
};

export const FORMAS_EM_ORDEM: FormaPagamento[] = [
  "pix",
  "dinheiro",
  "debito",
  "credito",
  "boleto",
  "transferencia",
  "outra",
];

export const ROTULO_SITUACAO_RECEBIMENTO: Record<SituacaoRecebimento, string> = {
  previsto: "Previsto",
  pendente: "Pendente",
  recebido: "Recebido",
  recebido_divergencia: "Recebido com divergência",
  cancelado: "Cancelado",
};

/** Cartão passa pela operadora e por isso tem taxa e tabela. */
export function formaUsaCartao(forma: FormaPagamento): forma is "debito" | "credito" {
  return forma === "debito" || forma === "credito";
}

/** Só o crédito parcela. No débito e nas demais formas, parcela é 1. */
export function formaParcela(forma: FormaPagamento): boolean {
  return forma === "credito";
}

// ---------------------------------------------------------------------
// O cálculo da venda
// ---------------------------------------------------------------------

export type ContaDaVenda = {
  originalCent: number;
  descontoCent: number;
  finalCent: number;
  taxaBp: number;
  taxaCent: number;
  liquidoCent: number;
};

/**
 * A conta inteira da venda, em centavos.
 *
 * A taxa é da CLÍNICA, não da paciente: desconta do valor final em vez de
 * acrescentar. Cartão parcelado é antecipado pela operadora — a taxa já
 * inclui a antecipação, então não existe "taxa por parcela": um percentual
 * só, sobre o valor final, e um único recebimento líquido.
 *
 * R$ 1.000,00 em 5x a 6%: taxa R$ 60,00, líquido R$ 940,00, 1 recebimento.
 */
export function calcularVenda(dados: {
  originalCent: number;
  descontoCent: number;
  taxaBp: number;
}): ContaDaVenda | { erro: string } {
  const { originalCent, descontoCent, taxaBp } = dados;

  if (originalCent < 0) return { erro: "O valor original não pode ser negativo." };
  if (descontoCent < 0) return { erro: "O desconto não pode ser negativo." };
  if (descontoCent > originalCent) {
    return { erro: "O desconto não pode passar do valor original." };
  }
  if (taxaBp < 0 || taxaBp > 10000) return { erro: "Taxa fora de 0% a 100%." };

  const finalCent = originalCent - descontoCent;
  const taxaCent = custoDaTaxa(finalCent, taxaBp);
  const liquidoCent = finalCent - taxaCent;

  return { originalCent, descontoCent, finalCent, taxaBp, taxaCent, liquidoCent };
}

/** Parcelas válidas: 1 sempre; acima disso só no crédito, até 24. */
export function parcelasValidas(forma: FormaPagamento, parcelas: number): boolean {
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) return false;
  if (parcelas > 1 && !formaParcela(forma)) return false;
  return true;
}

// ---------------------------------------------------------------------
// Mudança de forma de pagamento ou de taxa
// ---------------------------------------------------------------------

export type FotografiaFinanceira = {
  forma: FormaPagamento;
  parcelas: number;
  taxaBp: number;
  taxaCent: number;
  liquidoCent: number;
};

export type Comparativo = {
  antes: FotografiaFinanceira;
  depois: FotografiaFinanceira;
  /** Novo líquido menos o anterior. Negativo quando a clínica passa a receber menos. */
  diferencaCent: number;
};

export function montarComparativo(
  antes: FotografiaFinanceira,
  depois: FotografiaFinanceira,
): Comparativo {
  return { antes, depois, diferencaCent: depois.liquidoCent - antes.liquidoCent };
}

export type EfeitoDaMudanca =
  | { tipo: "atualizar_previsto" }
  | { tipo: "ajuste"; valorCent: number }
  | { tipo: "nada" };

/**
 * O que a mudança faz com o recebimento.
 *
 * Ainda não confirmado: o previsto é reescrito com os valores novos.
 * Já confirmado: o registro original NÃO é tocado — a diferença entre o novo
 * líquido e o que foi confirmado vira um ajuste financeiro à parte. Diferença
 * zero não gera ajuste nenhum.
 */
export function decidirEfeito(
  situacao: SituacaoRecebimento,
  confirmadoCent: number,
  novoLiquidoCent: number,
): EfeitoDaMudanca {
  const jaConfirmado = situacao === "recebido" || situacao === "recebido_divergencia";

  if (!jaConfirmado) return { tipo: "atualizar_previsto" };

  const diferenca = novoLiquidoCent - confirmadoCent;
  if (diferenca === 0) return { tipo: "nada" };
  return { tipo: "ajuste", valorCent: diferenca };
}

// ---------------------------------------------------------------------
// Permissões do módulo
// ---------------------------------------------------------------------

/** Recepção registra venda com a taxa padrão; mexer em taxa é do financeiro. */
export function podeAlterarTaxa(papel: Papel): boolean {
  return papel === "administradora" || papel === "financeiro";
}

export function podeOperarFinanceiro(papel: Papel): boolean {
  return papel === "administradora" || papel === "financeiro";
}

export function podeConfigurarTaxas(papel: Papel): boolean {
  return papel === "administradora";
}
