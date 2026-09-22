import { lerCentavos } from "./atendimento";

/**
 * Dinheiro em centavos inteiros.
 *
 * Todo cálculo financeiro do sistema acontece em inteiros: 0.1 + 0.2 não é
 * 0.3 em ponto flutuante, mas 10 + 20 é exatamente 30. A conversão para reais
 * só existe nas bordas — ao ler o que a pessoa digitou e ao gravar no banco,
 * cujo tipo `numeric` também é exato.
 *
 * Percentuais seguem a mesma ideia: 6,5% vira 650 "pontos-base de centésimo"
 * (bp), e a taxa é `round(valor × bp / 10000)` — uma multiplicação e uma
 * divisão inteiras, com um único arredondamento no fim.
 */

/** "1.250,50" → 125050. `null` quando não dá para entender. */
export function paraCentavos(texto: string): number | null {
  return lerCentavos(texto);
}

/** Valor `numeric` vindo do banco → centavos. */
export function centavosDoBanco(reais: number): number {
  return Math.round(reais * 100);
}

/** Centavos → o número que vai para a coluna `numeric(10,2)`. */
export function centavosParaBanco(centavos: number): number {
  return centavos / 100;
}

/** "6", "6,5" ou "6.5" → 650 bp. `null` quando inválido ou fora de 0–100%. */
export function lerPercentual(texto: string): number | null {
  const limpo = texto.trim().replace("%", "").trim();
  if (limpo === "") return 0;
  if (!/^\d{1,3}([.,]\d{1,2})?$/.test(limpo)) return null;

  const bp = Math.round(Number(limpo.replace(",", ".")) * 100);
  if (!Number.isInteger(bp) || bp < 0 || bp > 10000) return null;
  return bp;
}

/** Percentual `numeric(5,2)` do banco (6.5) → 650 bp. */
export function bpDoBanco(percentual: number): number {
  return Math.round(percentual * 100);
}

/** 650 bp → 6.5, para a coluna `numeric(5,2)`. */
export function bpParaBanco(bp: number): number {
  return bp / 100;
}

/** 650 bp → "6,5%" */
export function formatarPercentual(bp: number): string {
  const texto = (bp / 100).toFixed(2).replace(".", ",").replace(/,?0+$/, "");
  return `${texto || "0"}%`;
}

/**
 * Custo da taxa sobre um valor, em centavos.
 * R$ 1.000,00 a 6% → 100000 × 600 / 10000 = 6000 centavos = R$ 60,00.
 */
export function custoDaTaxa(valorCentavos: number, bp: number): number {
  return Math.round((valorCentavos * bp) / 10000);
}
