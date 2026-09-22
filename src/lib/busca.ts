import { chaveDoDia, dataDoBanco } from "@/lib/dates";

/** Remove caracteres que têm significado na gramática de filtros do PostgREST. */
export function termoDeBusca(valor: string): string {
  return valor
    .trim()
    .slice(0, 80)
    .replace(/[,()"\\*%_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reconhece uma data digitada na busca, sempre no calendário da clínica. */
export function dataDaBusca(termo: string): string | null {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(termo)
    ? termo
    : /^(\d{2})\/(\d{2})\/(\d{4})$/.test(termo)
      ? termo.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, "$3-$2-$1")
      : null;
  if (!iso) return null;
  const [, mes, dia] = iso.split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return chaveDoDia(dataDoBanco(iso)) === iso ? iso : null;
}
