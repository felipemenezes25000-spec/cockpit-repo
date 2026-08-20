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
  cancelado: "Cancelar",
  ausente: "Não compareceu",
};

export const SITUACOES_VALIDAS: SituacaoAtendimento[] = [
  "agendado",
  "aguardando_confirmacao",
  "confirmado",
  "em_atendimento",
  "concluido",
  "cancelado",
  "ausente",
];

// ---------------------------------------------------------------------
// Valor em reais
// ---------------------------------------------------------------------

/**
 * Lê o que a recepção digita: "150", "150,50", "1.250,00" ou "150.50".
 * `null` quando não dá para entender.
 */
export function lerValorEmReais(bruto: string): number | null {
  const texto = bruto.trim().replace(/^R\$\s*/i, "");
  if (!texto) return 0;
  if (!/^[\d.,\s]+$/.test(texto)) return null;

  const semEspacos = texto.replace(/\s/g, "");
  let normalizado = semEspacos;

  if (semEspacos.includes(",")) {
    // Vírgula é o decimal; pontos são milhar.
    normalizado = semEspacos.replace(/\./g, "").replace(",", ".");
  } else {
    const pontos = semEspacos.match(/\./g)?.length ?? 0;
    // Mais de um ponto, ou um ponto seguido de 3 dígitos no fim ("1.250"),
    // é separador de milhar à brasileira.
    if (pontos > 1 || /\.\d{3}$/.test(semEspacos)) {
      normalizado = semEspacos.replace(/\./g, "");
    }
  }

  const valor = Number(normalizado);
  if (!Number.isFinite(valor) || valor < 0 || valor > 1_000_000) return null;
  return Math.round(valor * 100) / 100;
}

/** Duração em minutos: inteiro entre 5 minutos e 8 horas. */
export function lerDuracao(bruto: string): number | null {
  const minutos = Number(bruto.trim());
  if (!Number.isInteger(minutos) || minutos < 5 || minutos > 480) return null;
  return minutos;
}
