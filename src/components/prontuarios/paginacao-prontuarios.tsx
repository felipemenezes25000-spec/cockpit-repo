import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function PaginacaoProntuarios({
  pagina,
  paginas,
  parametros,
}: {
  pagina: number;
  paginas: number;
  parametros: Record<string, string>;
}) {
  if (paginas <= 1) return null;

  const enderecoDe = (destino: number) => {
    const query = new URLSearchParams(parametros);
    if (destino > 1) query.set("pagina", String(destino));
    else query.delete("pagina");
    const texto = query.toString();
    return texto ? `/prontuarios?${texto}` : "/prontuarios";
  };

  const classe =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary";

  return (
    <nav
      aria-label="Paginação dos prontuários"
      className="flex items-center justify-between gap-4 border-t border-card-border pt-5"
    >
      {pagina > 1 ? (
        <Link href={enderecoDe(pagina - 1)} rel="prev" className={classe}>
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          Anterior
        </Link>
      ) : (
        <span className={cn(classe, "cursor-not-allowed opacity-40")} aria-hidden="true">
          <ChevronLeft size={16} strokeWidth={1.75} />
          Anterior
        </span>
      )}

      <span aria-current="page" className="text-xs text-outline tabular">
        Página {pagina} de {paginas}
      </span>

      {pagina < paginas ? (
        <Link href={enderecoDe(pagina + 1)} rel="next" className={classe}>
          Próxima
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
        </Link>
      ) : (
        <span className={cn(classe, "cursor-not-allowed opacity-40")} aria-hidden="true">
          Próxima
          <ChevronRight size={16} strokeWidth={1.75} />
        </span>
      )}
    </nav>
  );
}
