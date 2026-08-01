/**
 * Formatação pt-BR.
 *
 * O locale é sempre explícito para que a saída não dependa da configuração da
 * máquina. O fuso, ao contrário, fica no padrão local de propósito: os dados
 * fictícios são criados como horário de parede local (`hojeAs(14, 30)`), então
 * exibi-los no mesmo fuso em que foram criados mantém "14:30" como "14:30".
 */

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
});

const diaMes = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
});

const dataExtenso = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const hora = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const mesCurto = new Intl.DateTimeFormat(LOCALE, {
  month: "short",
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
