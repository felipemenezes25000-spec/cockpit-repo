import { lerDuracao, lerValorEmReais } from "./atendimento";

/**
 * Regras do procedimento, usadas pelo formulário e pela ação de servidor.
 * Mesmo desenho de `paciente.ts` e `atendimento.ts`: uma regra, dois lados.
 */

export type ValoresProcedimento = {
  nome: string;
  duracao_min: string;
  valor_padrao: string;
  retorno_sugerido_dias: string;
};

export const PROCEDIMENTO_EM_BRANCO: ValoresProcedimento = {
  nome: "",
  duracao_min: "60",
  valor_padrao: "",
  retorno_sugerido_dias: "",
};

export type ErrosProcedimento = Partial<
  Record<keyof ValoresProcedimento | "geral", string>
>;

/** O registro como vai para o banco. */
export type CamposProcedimento = {
  nome: string;
  duracao_min: number;
  valor_padrao: number;
  retorno_sugerido_dias: number | null;
};

/** Retorno sugerido: vazio é "sem retorno"; preenchido vai de 1 dia a 10 anos. */
export function lerRetorno(bruto: string): number | null | undefined {
  const texto = bruto.trim();
  if (!texto) return null;
  const dias = Number(texto);
  if (!Number.isInteger(dias) || dias < 1 || dias > 3650) return undefined;
  return dias;
}

export function validarProcedimento(
  v: ValoresProcedimento,
): { erros: ErrosProcedimento } | { campos: CamposProcedimento } {
  const erros: ErrosProcedimento = {};

  const nome = v.nome.trim().slice(0, 120);
  const duracao = lerDuracao(v.duracao_min);
  const valor = lerValorEmReais(v.valor_padrao);
  const retorno = lerRetorno(v.retorno_sugerido_dias);

  if (nome.length < 2) erros.nome = "Informe o nome do procedimento.";
  if (duracao === null) erros.duracao_min = "Duração em minutos, de 5 a 480.";
  if (valor === null) erros.valor_padrao = "Valor inválido. Use 150 ou 150,00.";
  if (retorno === undefined) {
    erros.retorno_sugerido_dias = "Dias inteiros, de 1 a 3650 — ou deixe vazio.";
  }

  if (Object.keys(erros).length > 0) return { erros };

  return {
    campos: {
      nome,
      duracao_min: duracao!,
      valor_padrao: valor!,
      retorno_sugerido_dias: retorno as number | null,
    },
  };
}

/** "R$ 350,00" → "350,00", para o campo de texto do formulário. */
export function valorParaCampo(valor: number): string {
  return valor > 0 ? valor.toFixed(2).replace(".", ",") : "";
}
