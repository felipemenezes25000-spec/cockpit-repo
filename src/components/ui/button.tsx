import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primaria" | "secundaria" | "contorno" | "silenciosa";
type Tamanho = "md" | "sm";

const BASE =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden font-medium transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 disabled:active:transform-none";

const VARIANTES: Record<Variante, string> = {
  primaria:
    "border border-primary-container bg-primary-container text-on-primary shadow-[var(--shadow-primary)] hover:border-primary hover:bg-primary hover:shadow-[0_12px_28px_-12px_rgba(8,84,160,0.68)]",
  secundaria:
    "border border-primary/25 bg-surface/90 text-primary shadow-[var(--shadow-cartao)] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary-fixed/40 hover:shadow-[var(--shadow-realce)]",
  contorno:
    "border border-card-border bg-surface/90 text-primary shadow-[var(--shadow-cartao)] hover:-translate-y-0.5 hover:border-primary-fixed-dim hover:bg-surface hover:shadow-[var(--shadow-realce)]",
  silenciosa:
    "text-on-surface-variant hover:bg-primary-fixed/40 hover:text-primary",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "h-11 rounded-[var(--radius-controle)] px-6 text-sm",
  sm: "h-9 rounded-[10px] px-4 text-sm",
};

export function BotaoLink({
  href,
  variante = "contorno",
  tamanho = "md",
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & {
  href: string;
  variante?: Variante;
  tamanho?: Tamanho;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className)}
      {...props}
    >
      {variante === "primaria" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/60"
        />
      ) : null}
      <span className="relative inline-flex items-center gap-2">{children}</span>
    </Link>
  );
}

export function BotaoIndisponivel({
  children,
  motivo = "Disponível em uma próxima etapa",
  tamanho = "sm",
  className,
}: {
  children: ReactNode;
  motivo?: string;
  tamanho?: Tamanho;
  className?: string;
}) {
  return (
    <span
      role="button"
      aria-disabled="true"
      tabIndex={0}
      title={motivo}
      className={cn(
        BASE,
        TAMANHOS[tamanho],
        "cursor-not-allowed border border-dashed border-outline-variant bg-white/40 text-outline shadow-none",
        className,
      )}
    >
      {children}
      <span className="sr-only"> — {motivo}</span>
    </span>
  );
}
