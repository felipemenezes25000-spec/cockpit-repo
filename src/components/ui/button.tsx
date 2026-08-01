import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variante = "primaria" | "secundaria" | "contorno" | "silenciosa";
type Tamanho = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-55";

const VARIANTES: Record<Variante, string> = {
  /* Ação principal: verde cheio, escurece no hover */
  primaria: "bg-primary-container text-on-primary hover:bg-primary",
  /* Ação da mesma família, em contorno verde */
  secundaria:
    "border border-primary bg-surface text-primary hover:bg-surface-container-low",
  /* Ação neutra dentro de um painel cinza */
  contorno:
    "border border-card-border bg-surface text-primary hover:bg-surface-container-low",
  silenciosa: "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
};

const TAMANHOS: Record<Tamanho, string> = {
  md: "h-11 rounded-[var(--radius-controle)] px-6 text-sm",
  sm: "h-9 rounded-[var(--radius-cartao)] px-4 text-sm",
};

export function Botao({
  variante = "contorno",
  tamanho = "md",
  className,
  children,
  ...props
}: ComponentProps<"button"> & { variante?: Variante; tamanho?: Tamanho }) {
  return (
    <button
      type="button"
      className={cn(BASE, VARIANTES[variante], TAMANHOS[tamanho], className)}
      {...props}
    >
      {children}
    </button>
  );
}

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
      {children}
    </Link>
  );
}

/**
 * Ação que ainda não existe. Fica visivelmente indisponível e explica o porquê,
 * em vez de fingir que concluiu alguma coisa.
 */
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
        "cursor-not-allowed border border-dashed border-outline-variant bg-transparent text-outline",
        className,
      )}
    >
      {children}
    </span>
  );
}
