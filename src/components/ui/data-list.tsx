import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Lista({ children, className, rotulo }: { children: ReactNode; className?: string; rotulo?: string }) {
  return <ul aria-label={rotulo} className={cn("flex flex-col gap-2.5", className)}>{children}</ul>;
}

/** Um item de lista: plano, com linha fina, que acende a borda sob o mouse. */
export function ItemLista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        "premium-interactive group relative overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4",
        className,
      )}
    >
      {children}
    </li>
  );
}
