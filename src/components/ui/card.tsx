import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
        "premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 z-0 h-px bg-white/95"
      />
      <div className="relative z-[1] contents">{children}</div>
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
        "flex flex-wrap items-end justify-between gap-4 border-b border-card-border/80 px-4 pt-5 pb-4 sm:px-7 sm:pt-7",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="t-headline text-primary">{titulo}</h2>
        {descricao ? (
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-on-surface-variant">
            {descricao}
          </p>
        ) : null}
      </div>
      {acao ? <div className="max-w-full shrink-0">{acao}</div> : null}
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
  return <div className={cn("px-4 py-5 sm:px-7 sm:py-6", className)}>{children}</div>;
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
        "border-t border-card-border/75 bg-surface/40 px-4 py-4 text-xs sm:px-7",
        className,
      )}
    >
      {children}
    </div>
  );
}
