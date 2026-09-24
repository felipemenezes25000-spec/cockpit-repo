import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primaria" | "secundaria" | "contorno" | "silenciosa";
type Tamanho = "md" | "sm";

const BASE =
  "group relative inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color] duration-150 ease-out active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 disabled:active:transform-none";

/**
 * primaria: o azul de ação chapado, um por tela. secundaria e contorno: fundo
 * branco com contorno de controle (3:1). silenciosa: só texto.
 */
const VARIANTES: Record<Variante, string> = {
  primaria:
    "border border-primary-container bg-primary-container text-on-primary hover:border-primary-hover hover:bg-primary-hover",
  secundaria:
    "border border-primary-container bg-surface text-primary hover:bg-selecao",
  contorno:
    "border border-borda-controle bg-surface text-primary hover:border-primary-container hover:bg-selecao",
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
