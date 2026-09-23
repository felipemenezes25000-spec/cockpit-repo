import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Paginacao({
  pagina,
  paginas,
  parametros,
  caminho,
  rotulo,
}: {
  pagina: number;
  paginas: number;
  parametros: Record<string, string>;
  caminho: string;
  rotulo: string;
}) {
  if (paginas <= 1) return null;

  const enderecoDe = (destino: number) => {
    const query = new URLSearchParams(parametros);
    if (destino > 1) query.set("pagina", String(destino));
    else query.delete("pagina");
    const texto = query.toString();
    return texto ? `${caminho}?${texto}` : caminho;
  };

  const classe =
    "premium-interactive inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border/80 bg-surface/72 px-2.5 text-sm font-semibold text-on-surface-variant shadow-[var(--shadow-cartao)] hover:border-primary-fixed-dim hover:text-primary sm:px-3.5";
  const palavra = "sr-only sm:not-sr-only";

  return (
    <nav
      aria-label={rotulo}
      className="flex items-center justify-between gap-2 border-t border-card-border/70 pt-5"
    >
      {pagina > 1 ? (
        <Link href={enderecoDe(pagina - 1)} rel="prev" className={classe}>
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          <span className={palavra}>Anterior</span>
        </Link>
      ) : (
        <span className={cn(classe, "pointer-events-none opacity-35 shadow-none")} aria-hidden="true">
          <ChevronLeft size={16} strokeWidth={1.75} />
          <span className={palavra}>Anterior</span>
        </span>
      )}

      <span
        aria-current="page"
        className="tabular rounded-full border border-card-border/70 bg-surface-container-low/70 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-on-surface-variant"
      >
        {pagina} <span className="font-normal text-outline">de {paginas}</span>
      </span>

      {pagina < paginas ? (
        <Link href={enderecoDe(pagina + 1)} rel="next" className={classe}>
          <span className={palavra}>Próxima</span>
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
        </Link>
      ) : (
        <span className={cn(classe, "pointer-events-none opacity-35 shadow-none")} aria-hidden="true">
          <span className={palavra}>Próxima</span>
          <ChevronRight size={16} strokeWidth={1.75} />
        </span>
      )}
    </nav>
  );
}
