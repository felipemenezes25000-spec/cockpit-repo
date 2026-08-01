import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Painel da Visão Geral: fundo cinza-claro sobre a página branca, borda fina e
 * canto de 16px. É a caixa maior — os cartões brancos ficam dentro dela.
 */
export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-painel)] border border-card-border bg-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardCabecalho({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 border-b border-card-border px-6 pt-6 pb-4 sm:px-8 sm:pt-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="t-headline text-primary">{titulo}</h2>
        {descricao ? (
          <p className="mt-1 text-sm text-outline">{descricao}</p>
        ) : null}
      </div>
      {acao ? <div className="shrink-0">{acao}</div> : null}
    </div>
  );
}

export function CardCorpo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("px-6 py-6 sm:px-8", className)}>{children}</div>;
}

export function CardRodape({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-card-border px-6 py-4 text-xs sm:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
