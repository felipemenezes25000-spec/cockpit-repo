/**
 * Datas no relógio da clínica.
 *
 * O banco guarda instantes em UTC e o servidor pode rodar em qualquer fuso.
 * A clínica, porém, pensa em horário de São Paulo: "a agenda de hoje" é o dia
 * de São Paulo, não o do servidor. Perto da meia-noite os dois divergem.
 *
 * Todo cálculo de dia passa por aqui, e toda exibição passa por `format.ts`,
 * que formata neste mesmo fuso. Servidor e navegador produzem a mesma string.
 */

export const FUSO_CLINICA = "America/Sao_Paulo";

const PARTES = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_CLINICA,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type PartesData = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function lerPartes(instante: Date): PartesData {
  const p: Record<string, number> = {};
  for (const parte of PARTES.formatToParts(instante)) {
    if (parte.type !== "literal") p[parte.type] = Number(parte.value);
  }

  return {
    year: p.year,
    month: p.month,
    day: p.day,
    // Meia-noite sai como "24" em alguns ambientes.
    hour: p.hour % 24,
    minute: p.minute,
    second: p.second,
  };
}

/** Quantos minutos o fuso da clínica está à frente do UTC neste instante. */
function deslocamentoMinutos(instante: Date): number {
  const p = lerPartes(instante);
  const comoSeFosseUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return (comoSeFosseUtc - instante.getTime()) / 60_000;
}

/** Ano, mês e dia segundo o relógio da clínica. */
export function partesDoDia(instante: Date = new Date()) {
  const p = lerPartes(instante);
  return { ano: p.year, mes: p.month, dia: p.day };
}

/** Instante correspondente a uma data e hora de parede da clínica. */
export function instanteNaClinica(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
): Date {
  const aproximado = Date.UTC(ano, mes - 1, dia, hora, minuto);
  // Duas passadas bastam: a primeira estima o deslocamento, a segunda o
  // confirma caso a estimativa tenha caído do outro lado de uma virada.
  let instante = new Date(aproximado - deslocamentoMinutos(new Date(aproximado)) * 60_000);
  instante = new Date(aproximado - deslocamentoMinutos(instante) * 60_000);
  return instante;
}

/** Meia-noite de hoje no relógio da clínica. */
export function inicioDoDia(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = partesDoDia(referencia);
  return instanteNaClinica(ano, mes, dia);
}

/** Meia-noite do dia seguinte — limite superior exclusivo das consultas do dia. */
export function inicioDoDiaSeguinte(referencia: Date = new Date()): Date {
  const { ano, mes, dia } = partesDoDia(referencia);
  return instanteNaClinica(ano, mes, dia + 1);
}

/** Primeiro instante do mês corrente na clínica. */
export function inicioDoMes(referencia: Date = new Date()): Date {
  const { ano, mes } = partesDoDia(referencia);
  return instanteNaClinica(ano, mes, 1);
}

/** Primeiro instante do mês, deslocado em N meses. */
export function inicioDeMesRelativo(meses: number, referencia: Date = new Date()): Date {
  const { ano, mes } = partesDoDia(referencia);
  return instanteNaClinica(ano, mes + meses, 1);
}

/** Hoje, à meia-noite da clínica. Base dos cálculos de prazo. */
export function hoje(): Date {
  return inicioDoDia();
}

export function somarDias(data: Date, dias: number): Date {
  const { ano, mes, dia } = partesDoDia(data);
  return instanteNaClinica(ano, mes, dia + dias);
}

/** Diferença em dias inteiros no calendário da clínica. */
export function diferencaEmDias(data: Date, referencia: Date = new Date()): number {
  const MS_DIA = 86_400_000;
  return Math.round((inicioDoDia(data).getTime() - inicioDoDia(referencia).getTime()) / MS_DIA);
}

export function mesmoDia(a: Date, b: Date): boolean {
  return inicioDoDia(a).getTime() === inicioDoDia(b).getTime();
}

export function mesmoMes(a: Date, b: Date): boolean {
  const pa = partesDoDia(a);
  const pb = partesDoDia(b);
  return pa.ano === pb.ano && pa.mes === pb.mes;
}

/** "AAAA-MM-DD" do dia no relógio da clínica — chave de URL e de `input date`. */
export function chaveDoDia(instante: Date = new Date()): string {
  const { ano, mes, dia } = partesDoDia(instante);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ano}-${pad(mes)}-${pad(dia)}`;
}

/** Converte "AAAA-MM-DD" (coluna `date` do banco) em instante da clínica. */
export function dataDoBanco(texto: string): Date {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return instanteNaClinica(ano, mes, dia);
}

/**
 * "AAAA-MM-DD" que existe no calendário.
 *
 * `instanteNaClinica` normaliza de propósito — é o que faz `somarDias` e a
 * virada de mês funcionarem —, e por isso não serve de validação: 31/02
 * virava 03/03 em silêncio (AGENTS.md §13, bug 3). Toda data que chega de
 * formulário passa por aqui antes.
 */
export function dataValida(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const [ano, mes, dia] = texto.split("-").map(Number);
  if (ano < 1900 || ano > 2200 || mes < 1 || mes > 12 || dia < 1) return false;
  // Dia 0 do mês seguinte é o último dia deste — em UTC, sem fuso nenhum.
  return dia <= new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Hora de parede "HH:MM", de 00:00 a 23:59. */
export function horaValida(texto: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

/** Aniversário no ano corrente, a partir da data de nascimento. */
export function aniversarioNesteAno(nascimento: Date): Date {
  const nasc = partesDoDia(nascimento);
  const { ano } = partesDoDia();
  return instanteNaClinica(ano, nasc.mes, nasc.dia);
}
