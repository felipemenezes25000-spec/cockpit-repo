/**
 * Datas relativas ao dia de hoje.
 *
 * Todos os mocks derivam daqui, então a demonstração continua coerente
 * qualquer que seja o dia em que o sistema for aberto.
 *
 * `hoje()` sempre volta à meia-noite: isso mantém o valor estável entre a
 * renderização no servidor e a hidratação no navegador.
 */

export function hoje(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Hoje, no horário informado. */
export function hojeAs(horas: number, minutos = 0): Date {
  const d = hoje();
  d.setHours(horas, minutos, 0, 0);
  return d;
}

export function somarDias(data: Date, dias: number): Date {
  const d = new Date(data);
  d.setDate(d.getDate() + dias);
  return d;
}

export function somarMeses(data: Date, meses: number): Date {
  const d = new Date(data);
  d.setMonth(d.getMonth() + meses, 1);
  return d;
}

/** Diferença em dias inteiros entre duas datas (positivo = `data` no futuro). */
export function diferencaEmDias(data: Date, referencia: Date = hoje()): number {
  const MS_DIA = 86_400_000;
  const a = new Date(data).setHours(0, 0, 0, 0);
  const b = new Date(referencia).setHours(0, 0, 0, 0);
  return Math.round((a - b) / MS_DIA);
}

export function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function mesmoMes(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/** Data com dia/mês fixos, no ano corrente — usada nos aniversários. */
export function aniversarioNesteAno(dia: number, mes: number): Date {
  const d = hoje();
  return new Date(d.getFullYear(), mes - 1, dia);
}
