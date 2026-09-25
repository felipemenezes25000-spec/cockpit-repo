import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primaria" | "secundaria" | "contorno" | "silenciosa";
type Tamanho = "md" | "sm";

const BASE =
  "group relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,box-shadow] duration-180 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:transform-none";

/**
 * primaria: o azul de ação chapado. secundaria e contorno: fundo branco com
 * contorno. silenciosa: só texto, para ações de apoio.
 */
const VARIANTES: Record<Variante, string> = {
  primaria:
    "border border-primary-container bg-primary-container text-on-primary shadow-[0_12px_26px_-18px_rgba(10,110,209,.82)] hover:-translate-y-0.5 hover:border-primary-hover hover:bg-primary-hover hover:shadow-[0_16px_30px_-18px_rgba(8,60,115,.72)]",
  secundaria:
    "border border-primary-fixed-dim bg-surface text-primary shadow-[0_8px_20px_-18px_rgba(8,84,160,.4)] hover:-translate-y-0.5 hover:border-primary-container hover:bg-selecao",
  contorno:
    "border border-borda-controle bg-surface text-primary shadow-[0_7px_18px_-18px_rgba(8,41,76,.35)] hover:-translate-y-0.5 hover:border-primary-container hover:bg-selecao",
  silenciosa:
    "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "h-10 rounded-[var(--radius-controle)] px-4 text-sm",
  sm: "h-9 rounded-[var(--radius-controle)] px-3.5 text-sm",
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
    <Link href={href} className={cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className)} {...props}>
      <span className="inline-flex items-center gap-2">{children}</span>
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
        "cursor-not-allowed border border-dashed border-outline-variant bg-surface-container-low font-medium text-outline",
        className,
      )}
    >
      {children}
      <span className="sr-only"> — {motivo}</span>
    </span>
  );
}
