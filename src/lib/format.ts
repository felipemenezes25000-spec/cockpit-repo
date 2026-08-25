/**
 * Formatação pt-BR no fuso da clínica.
 *
 * Locale e fuso são sempre explícitos. O banco guarda instantes em UTC e o
 * servidor pode rodar em qualquer fuso, mas a clínica lê tudo em horário de
 * São Paulo — e é assim que servidor e navegador chegam à mesma string, sem
 * divergência de hidratação.
 */

import { FUSO_CLINICA } from "./dates";

const LOCALE = "pt-BR";

const moeda = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
});

const moedaCompacta = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const dataCurta = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: FUSO_CLINICA,
});

const diaMes = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  timeZone: FUSO_CLINICA,
});

const dataExtenso = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: FUSO_CLINICA,
});

const hora = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: FUSO_CLINICA,
});

const mesCurto = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
  timeZone: FUSO_CLINICA,
});

const mesAno = new Intl.DateTimeFormat(LOCALE, {
  month: "long",
  year: "numeric",
  timeZone: FUSO_CLINICA,
});

/** R$ 1.250,00 */
export function formatarMoeda(valor: number): string {
  return moeda.format(valor);
}

/** R$ 1.250 — para eixos de gráfico e espaços estreitos. */
export function formatarMoedaCompacta(valor: number): string {
  return moedaCompacta.format(valor);
}

/** 30/07/2026 */
export function formatarData(data: Date): string {
  return dataCurta.format(data);
}

/** 30/07 */
export function formatarDiaMes(data: Date): string {
  return diaMes.format(data);
}

/** quinta-feira, 30 de julho de 2026 */
export function formatarDataExtenso(data: Date): string {
  return dataExtenso.format(data);
}

/** 14:30 */
export function formatarHora(data: Date): string {
  return hora.format(data);
}

/** jul. */
export function formatarMesCurto(data: Date): string {
  return mesCurto.format(data);
}

/** agosto de 2026 */
export function formatarMesAno(data: Date): string {
  return mesAno.format(data);
}

/** Primeira letra maiúscula, respeitando acentos. */
export function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toLocaleUpperCase(LOCALE) + texto.slice(1);
}

/** "ER" a partir de "Érika Passos" — para avatares. */
export function iniciais(nome: string): string {
  const partes = nome
    .replace(/^(Dra?\.|Enf\.|Sra?\.)\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 2);

  if (partes.length === 0) return nome.slice(0, 2).toLocaleUpperCase(LOCALE);
  if (partes.length === 1) return partes[0].slice(0, 2).toLocaleUpperCase(LOCALE);

  return (partes[0][0] + partes[partes.length - 1][0]).toLocaleUpperCase(LOCALE);
}

/** "em 3 dias", "hoje", "há 2 dias" — texto relativo simples e legível. */
export function descreverPrazo(dias: number): string {
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 1) return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}
