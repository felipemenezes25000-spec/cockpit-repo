import type { SituacaoAtendimento } from "./dominio";

/**
 * O que está acontecendo agora na clínica, calculado a partir dos
 * atendimentos de hoje.
 *
 * Funções puras, sem relógio próprio: quem chama passa o instante. Assim a
 * faixa do agora e a cabine da Visão Geral só leem a hora no navegador,
 * depois da montagem, e o servidor nunca diverge da hidratação.
 */

/** O mínimo que a faixa do agora precisa de cada atendimento de hoje. */
export type AtendimentoDoAgora = {
  id: string;
  /** Início em milissegundos desde a época. */
  inicio: number;
  duracaoMin: number;
  situacao: SituacaoAtendimento;
  paciente: string;
  procedimento: string;
};

export type RetratoDoAgora = {
  /** Quem está marcada como "em atendimento" agora. */
  emAtendimento: AtendimentoDoAgora | null;
  /** Fração do tempo previsto que já passou (0 a 1). */
  progresso: number;
  /** Minutos até o fim previsto; negativo quando já passou do previsto. */
  faltamMin: number;
  /** O próximo atendimento que ainda vai acontecer. */
  proxima: AtendimentoDoAgora | null;
  /** Minutos até o início da próxima; negativo quando o horário já passou. */
  emMin: number | null;
  /** O atendimento seguinte ao da próxima. */
  depois: AtendimentoDoAgora | null;
  /** Quantos ainda vão acontecer hoje, fora o que está em atendimento. */
  restantes: number;
};

const ENCERRADAS: ReadonlySet<SituacaoAtendimento> = new Set(["concluido", "cancelado", "ausente"]);
const MINUTO = 60_000;

function fimPrevisto(atendimento: AtendimentoDoAgora): number {
  return atendimento.inicio + atendimento.duracaoMin * MINUTO;
}

/**
 * Um atendimento que ainda não começou nem foi encerrado, e cujo horário
 * previsto ainda não terminou. O que ficou para trás sem baixa aparece na
 * Agenda, não aqui: a faixa fala do que vem pela frente.
 */
function aindaVai(atendimento: AtendimentoDoAgora, agora: number): boolean {
  return (
    atendimento.situacao !== "em_atendimento" &&
    !ENCERRADAS.has(atendimento.situacao) &&
    fimPrevisto(atendimento) > agora
  );
}

export function retratoDoAgora(atendimentos: readonly AtendimentoDoAgora[], agora: number): RetratoDoAgora {
  const ordenados = [...atendimentos].sort((a, b) => a.inicio - b.inicio);
  const emAtendimento = ordenados.find((a) => a.situacao === "em_atendimento") ?? null;
  const pelaFrente = ordenados.filter((a) => aindaVai(a, agora));
  const proxima = pelaFrente[0] ?? null;

  let progresso = 0;
  let faltamMin = 0;
  if (emAtendimento) {
    const total = Math.max(1, emAtendimento.duracaoMin * MINUTO);
    progresso = Math.max(0, Math.min(1, (agora - emAtendimento.inicio) / total));
    faltamMin = Math.ceil((fimPrevisto(emAtendimento) - agora) / MINUTO);
  }

  return {
    emAtendimento,
    progresso,
    faltamMin,
    proxima,
    emMin: proxima ? Math.ceil((proxima.inicio - agora) / MINUTO) : null,
    depois: pelaFrente[1] ?? null,
    restantes: pelaFrente.length,
  };
}

/** "45 min", "1 h", "2 h 10 min". */
export function duracaoPorExtenso(minutos: number): string {
  const total = Math.abs(Math.round(minutos));
  if (total < 60) return `${total} min`;
  const horas = Math.floor(total / 60);
  const resto = total % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Quanto falta para a próxima: "em 53 min", "agora", "horário passou há 12 min". */
export function descreverEspera(minutos: number): string {
  if (minutos > 0) return `em ${duracaoPorExtenso(minutos)}`;
  if (minutos === 0) return "agora";
  return `horário passou há ${duracaoPorExtenso(minutos)}`;
}

/** Quanto falta no atendimento em curso: "faltam 18 min", "passou 5 min do previsto". */
export function descreverRestante(minutos: number): string {
  if (minutos > 0) return `${minutos === 1 ? "falta" : "faltam"} ${duracaoPorExtenso(minutos)}`;
  if (minutos === 0) return "termina agora";
  return `passou ${duracaoPorExtenso(minutos)} do previsto`;
}
