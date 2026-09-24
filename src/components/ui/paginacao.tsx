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

  const progresso = Math.max(0, Math.min(100, Math.round((pagina / paginas) * 100)));
  const classe =
    "premium-interactive group inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border/80 bg-surface/72 px-2.5 text-sm font-semibold text-on-surface-variant shadow-[var(--shadow-cartao)] hover:border-primary-fixed-dim hover:text-primary sm:px-3.5";
  const palavra = "sr-only sm:not-sr-only";

  return (
    <nav aria-label={rotulo} className="flex items-center justify-between gap-2 border-t border-card-border/70 pt-5">
      {pagina > 1 ? (
        <Link href={enderecoDe(pagina - 1)} rel="prev" className={classe}>
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span className={palavra}>Anterior</span>
        </Link>
      ) : (
        <span className={cn(classe, "pointer-events-none opacity-35 shadow-none")} aria-hidden="true">
          <ChevronLeft size={16} strokeWidth={1.75} />
          <span className={palavra}>Anterior</span>
        </span>
      )}

      <span className="min-w-[7.25rem] text-center">
        <span aria-current="page" className="tabular inline-flex rounded-full border border-card-border/70 bg-surface-container-low/70 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.84)]">
          {pagina} <span className="ml-1 font-normal text-outline">de {paginas}</span>
        </span>
        <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-primary-fixed/38">
          <span className="block h-full rounded-full bg-[linear-gradient(90deg,var(--color-primary-container),var(--color-primary))] transition-[width] duration-500" style={{ width: `${progresso}%` }} />
        </span>
      </span>

      {pagina < paginas ? (
        <Link href={enderecoDe(pagina + 1)} rel="next" className={classe}>
          <span className={palavra}>Próxima</span>
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
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
