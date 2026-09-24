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
        "flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-4 py-4 sm:px-6",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="titulo-secao text-on-surface">{titulo}</h2>
        {descricao ? (
          <p className="mt-0.5 max-w-3xl text-sm leading-6 text-on-surface-variant">
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
  return <div className={cn("px-4 py-5 sm:px-6", className)}>{children}</div>;
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
        "border-t border-card-border bg-surface-container-low px-4 py-3.5 text-xs sm:px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
