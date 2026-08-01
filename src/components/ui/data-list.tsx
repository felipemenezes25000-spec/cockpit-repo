import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Lista de cartões brancos sobre o painel cinza — o padrão de "Pendências" do
 * mockup, reaproveitado em retornos e aniversariantes.
 */
export function Lista({
  children,
  className,
  rotulo,
}: {
  children: ReactNode;
  className?: string;
  rotulo?: string;
}) {
  return (
    <ul aria-label={rotulo} className={cn("flex flex-col gap-4", className)}>
      {children}
    </ul>
  );
}

export function ItemLista({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)] transition-shadow hover:shadow-[0_4px_15px_rgba(0,0,0,0.03)]",
        className,
      )}
    >
      {children}
    </li>
  );
}
