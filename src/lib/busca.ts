import { dataValida } from "@/lib/dates";

/** Remove caracteres que têm significado na gramática de filtros do PostgREST. */
export function termoDeBusca(valor: string): string {
  return valor
    .trim()
    .slice(0, 80)
    .replace(/[,()"\\*%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * O termo como a coluna `pacientes.busca` o guarda (migração 0025): sem
 * acento e em minúsculas. O banco usa a extensão `unaccent`; aqui basta
 * decompor e tirar as marcas — cobre o que se escreve em português
 * ("Conceição" → "conceicao"). Letra que o `unaccent` troca por outra
 * (ø, ß, æ) não passa por aqui: digitada assim, não acha.
 */
export function semAcento(valor: string): string {
  return valor.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Reconhece uma data digitada na busca, sempre no calendário da clínica. */
export function dataDaBusca(termo: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(termo)
    ? termo
    : /^(\d{2})\/(\d{2})\/(\d{4})$/.test(termo)
      ? termo.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1")
      : null;
  return iso && dataValida(iso) ? iso : null;
}
