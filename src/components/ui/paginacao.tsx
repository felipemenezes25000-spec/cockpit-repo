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
  const forma =
    "group inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-[var(--radius-controle)] border px-2.5 text-sm font-semibold sm:px-3.5";
  const classe = cn(forma, "premium-interactive border-borda-controle bg-surface text-primary hover:border-primary-container hover:bg-selecao");
  const indisponivel = cn(forma, "pointer-events-none border-dashed border-outline-variant bg-surface-container-low text-outline");
  const palavra = "sr-only sm:not-sr-only";

  return (
    <nav aria-label={rotulo} className="flex items-center justify-between gap-2 border-t border-card-border pt-5">
      {pagina > 1 ? (
        <Link href={enderecoDe(pagina - 1)} rel="prev" className={classe}>
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
          <span className={palavra}>Anterior</span>
        </Link>
      ) : (
        <span className={indisponivel} aria-hidden="true">
          <ChevronLeft size={16} strokeWidth={1.75} />
          <span className={palavra}>Anterior</span>
        </span>
      )}

      <span className="min-w-[7.5rem] rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-2 text-center shadow-[0_8px_20px_-18px_rgba(8,41,76,.4)]">
        <span aria-current="page" className="tabular inline-flex text-xs font-semibold whitespace-nowrap text-on-surface-variant">
          <span className="sr-only">Página </span>
          {pagina} <span className="ml-1 font-normal text-outline">de {paginas}</span>
        </span>
        <span aria-hidden="true" className="mt-2 block h-1 overflow-hidden rounded-full bg-selecao">
          <span className="block h-full rounded-full bg-primary-container transition-[width] duration-500" style={{ width: `${progresso}%` }} />
        </span>
      </span>

      {pagina < paginas ? (
        <Link href={enderecoDe(pagina + 1)} rel="next" className={classe}>
          <span className={palavra}>Próxima</span>
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      ) : (
        <span className={indisponivel} aria-hidden="true">
          <span className={palavra}>Próxima</span>
          <ChevronRight size={16} strokeWidth={1.75} />
        </span>
      )}
    </nav>
  );
}
