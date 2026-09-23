import type { SituacaoAtendimento } from "./dominio";

/**
 * Regras do atendimento que valem no formulário e no servidor.
 * Como `paciente.ts`: a validação da interface é conveniência, a que vale é a
 * do servidor — e as duas leem daqui.
 */

/**
 * O que a interface oferece a partir de cada situação.
 *
 * É o caminho feliz da recepção, não uma máquina de estados rígida: o servidor
 * aceita qualquer mudança para situação válida e diferente da atual, porque
 * engano acontece — um "concluído" clicado errado precisa ter volta. A trilha
 * no banco registra toda mudança com autor e hora, então nada se perde.
 *
 * Cancelado e ausente voltam só para "agendado": reabrir é recomeçar o ciclo.
 */
export const PROXIMAS_SITUACOES: Record<SituacaoAtendimento, SituacaoAtendimento[]> = {
  agendado: ["aguardando_confirmacao", "confirmado", "cancelado"],
  aguardando_confirmacao: ["confirmado", "cancelado"],
  confirmado: ["em_atendimento", "cancelado", "ausente"],
  em_atendimento: ["concluido", "cancelado"],
  concluido: [],
  cancelado: ["agendado"],
  ausente: ["agendado"],
};

/** Verbo do botão que leva a cada situação. */
export const VERBO_SITUACAO: Record<SituacaoAtendimento, string> = {
  agendado: "Reabrir como agendado",
  aguardando_confirmacao: "Pedir confirmação",
  confirmado: "Confirmar",
  em_atendimento: "Iniciar atendimento",
  concluido: "Concluir",
  // "Cancelar" sozinho se confundia com "descartar" (sair sem salvar).
  cancelado: "Cancelar atendimento",
  ausente: "Não compareceu",
};

/**
 * Todas as situações, derivadas do `Record` acima.
 *
 * Era uma lista escrita à mão: acrescentar um valor ao enum do banco
 * compilava sem erro e a agenda passava a recusar a situação nova em silêncio
 * (AGENTS.md §13). Derivada de um `Record<SituacaoAtendimento, …>`, o
 * typecheck cobra a situação nova em `PROXIMAS_SITUACOES` e ela entra aqui
 * sozinha.
 */
export const SITUACOES_VALIDAS = Object.keys(PROXIMAS_SITUACOES) as SituacaoAtendimento[];

export function situacaoValida(valor: string): valor is SituacaoAtendimento {
  return (SITUACOES_VALIDAS as string[]).includes(valor);
}

// ---------------------------------------------------------------------
// Valor em reais
// ---------------------------------------------------------------------

/** Maior valor aceito num campo de dinheiro: R$ 1.000.000,00. */
export const VALOR_MAXIMO_CENTAVOS = 100_000_000;

/**
 * Lê o que a recepção digita e devolve CENTAVOS inteiros.
 *
 * Aceita "150", "150,5", "150,50", "1.250,00", "1250,00", ",50", "R$ 150" e o
 * ponto decimal de quem digita no teclado americano, "150.50". Um ponto
 * seguido de exatamente três dígitos é milhar ("1.250" = mil duzentos e
 * cinquenta), como em qualquer planilha brasileira.
 *
 * Recusa o que não tem leitura única: "1.2.3", "1.250.5", "150,555",
 * "1,250.00". Antes, "1.2.3" virava 123 e "150,555" virava 150,56 sem
 * ninguém perceber — em dinheiro, adivinhar é pior do que perguntar.
 *
 * A conversão é feita nos dígitos, sem multiplicar ponto flutuante:
 * "0,29" é 29 centavos, não 28,999…
 */
export function lerCentavos(bruto: string): number | null {
  const texto = bruto
    .trim()
    .replace(/^R\$/i, "")
    .replace(/\s+/g, "");
  if (!texto) return 0;

  let inteiro: string;
  let fracao = "";

  // Grupo de milhar não começa com zero: "0.001" não é mil.
  let m = /^([1-9]\d{0,2}(?:\.\d{3})+)(?:,(\d{1,2}))?$/.exec(texto);
  if (m) {
    inteiro = m[1].replace(/\./g, "");
    fracao = m[2] ?? "";
  } else if ((m = /^(\d*),(\d{1,2})$/.exec(texto)) || (m = /^(\d+)$/.exec(texto))) {
    inteiro = m[1] || "0";
    fracao = m[2] ?? "";
  } else if ((m = /^(\d+)\.(\d{1,2})$/.exec(texto))) {
    inteiro = m[1];
    fracao = m[2];
  } else {
    return null;
  }

  if (inteiro.length > 9) return null;
  const centavos = Number(inteiro) * 100 + Number(fracao.padEnd(2, "0"));
  if (!Number.isSafeInteger(centavos) || centavos > VALOR_MAXIMO_CENTAVOS) return null;
  return centavos;
}

/**
 * O mesmo, em reais — para as colunas `numeric(10,2)` que recebem reais.
 * `null` quando não dá para entender.
 */
export function lerValorEmReais(bruto: string): number | null {
  const centavos = lerCentavos(bruto);
  return centavos === null ? null : centavos / 100;
}

/** Duração em minutos: inteiro entre 5 minutos e 8 horas. */
export function lerDuracao(bruto: string): number | null {
  const minutos = Number(bruto.trim());
  if (!Number.isInteger(minutos) || minutos < 5 || minutos > 480) return null;
  return minutos;
}
