import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type TomDoSelo = "neutro" | "informativo" | "positivo" | "atencao" | "negativo";

const TOM_DO_SELO: Record<TomDoSelo, string> = {
  neutro: "border-card-border bg-surface text-on-surface-variant",
  informativo: "border-informativo-borda bg-informativo-fundo text-informativo-texto",
  positivo: "border-positivo-borda bg-positivo-fundo text-positivo",
  atencao: "border-atencao-borda bg-atencao-fundo text-atencao",
  negativo: "border-negativo-borda bg-negativo-fundo text-negativo",
};

export function LinkDeVoltar({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex min-h-9 w-fit items-center gap-1.5 rounded-[var(--radius-controle)] border border-transparent pr-2.5 pl-1.5 text-sm font-semibold text-primary transition-[transform,background-color,border-color] hover:-translate-x-0.5 hover:border-primary-fixed hover:bg-selecao",
        className,
      )}
    >
      <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.9} className="transition-transform duration-150 group-hover:-translate-x-0.5" />
      {children}
    </Link>
  );
}

export function SeloHero({ children, tom = "neutro", className }: { children: ReactNode; tom?: TomDoSelo; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-[0_8px_20px_-18px_rgba(8,41,76,.45)]", TOM_DO_SELO[tom], className)}>
      {children}
    </span>
  );
}

/**
 * O cabeçalho de cada tela: onde estou (o `<h1>`), o que a tela faz e a ação
 * principal. Mantém leitura simples, mas com presença visual suficiente para
 * separar claramente contexto, ação e conteúdo operacional.
 */
export function CabecalhoDePagina({ icone: Icone, rotulo, titulo, descricao, acoes, meta, className }: { icone: LucideIcon; rotulo: string; titulo: string; descricao: ReactNode; acoes?: ReactNode; meta?: ReactNode; className?: string }) {
  return (
    <header className={cn("mb-6 sm:mb-7", className)}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span aria-hidden="true" className="selo-tela mt-0.5 hidden size-12 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] text-primary sm:flex">
            <Icone size={23} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="rotulo text-primary">{rotulo}</p>
            <h1 className="titulo-tela mt-2 break-words">{titulo}</h1>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant sm:text-[0.95rem]">{descricao}</div>
          </div>
        </div>
        {acoes ? <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">{acoes}</div> : null}
      </div>

      {meta ? <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-card-border/70 pt-4">{meta}</div> : null}
    </header>
  );
}
