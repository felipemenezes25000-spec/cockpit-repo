import { dataValida } from "./dates";
import { paraCentavos } from "./moeda";
import type { Database } from "./supabase/tipos-banco";

/** Regras da despesa — formulário e servidor leem daqui. */

type Enums = Database["public"]["Enums"];
export type CategoriaDespesa = Enums["categoria_despesa"];
export type SituacaoDespesa = Enums["situacao_despesa"];

export const ROTULO_CATEGORIA: Record<CategoriaDespesa, string> = {
  produtos: "Produtos e insumos",
  estrutura: "Estrutura",
  equipe: "Equipe",
  marketing: "Marketing",
  impostos: "Impostos",
  outros: "Outros",
};

export const CATEGORIAS_EM_ORDEM: CategoriaDespesa[] = [
  "produtos",
  "estrutura",
  "equipe",
  "marketing",
  "impostos",
  "outros",
];

export const ROTULO_SITUACAO_DESPESA: Record<SituacaoDespesa, string> = {
  pendente: "Pendente",
  paga: "Paga",
  cancelada: "Cancelada",
};

export type ValoresDespesa = {
  descricao: string;
  categoria: string;
  valor: string;
  vencimento: string;
  observacoes: string;
};

export const DESPESA_EM_BRANCO: ValoresDespesa = {
  descricao: "",
  categoria: "outros",
  valor: "",
  vencimento: "",
  observacoes: "",
};

export type ErrosDespesa = Partial<Record<keyof ValoresDespesa | "geral", string>>;

export type CamposDespesa = {
  descricao: string;
  categoria: CategoriaDespesa;
  valorCent: number;
  vencimento: string;
  observacoes: string | null;
};

export function validarDespesa(
  v: ValoresDespesa,
): { erros: ErrosDespesa } | { campos: CamposDespesa } {
  const erros: ErrosDespesa = {};

  const descricao = v.descricao.trim().slice(0, 200);
  const valorCent = paraCentavos(v.valor);
  const categoriaValida = CATEGORIAS_EM_ORDEM.includes(v.categoria as CategoriaDespesa);

  if (descricao.length < 3) erros.descricao = "Descreva a despesa.";
  if (!categoriaValida) erros.categoria = "Escolha a categoria.";
  if (valorCent === null || valorCent <= 0) {
    erros.valor = "Valor inválido. Use 150 ou 150,00.";
  }
  if (!v.vencimento) {
    erros.vencimento = "Informe o vencimento.";
  } else if (!dataValida(v.vencimento)) {
    erros.vencimento = "Data de vencimento inválida.";
  }

  if (Object.keys(erros).length > 0) return { erros };

  return {
    campos: {
      descricao,
      categoria: v.categoria as CategoriaDespesa,
      valorCent: valorCent!,
      vencimento: v.vencimento,
      observacoes: v.observacoes.trim().slice(0, 2000) || null,
    },
  };
}

/**
 * Competência da despesa = primeiro dia do mês do vencimento ("AAAA-MM-01").
 *
 * Regra que a aplicação adotou por falta de outra: a clínica ainda não
 * definiu a competência (AGENTS.md §13). Fica isolada aqui para mudar num
 * lugar só quando a decisão vier. Consequência conhecida: editar o
 * vencimento de uma despesa já paga muda a competência — e o número de um
 * mês fechado na Visão Geral.
 */
export function competenciaDoVencimento(vencimento: string): string {
  return `${vencimento.slice(0, 7)}-01`;
}

/** "Vencida" é derivada: pendente com vencimento no passado. */
export function despesaVencida(situacao: SituacaoDespesa, venceEmDias: number): boolean {
  return situacao === "pendente" && venceEmDias < 0;
}
