import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Lista({ children, className, rotulo }: { children: ReactNode; className?: string; rotulo?: string }) {
  return <ul aria-label={rotulo} className={cn("flex min-w-0 flex-col gap-3", className)}>{children}</ul>;
}

/** Um item de lista: superfície clara, linha fina e resposta sutil ao ponteiro. */
export function ItemLista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        "premium-interactive group relative min-w-0 overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] p-4 shadow-[0_8px_22px_-22px_rgba(8,41,76,.32)]",
        className,
      )}
    >
      {children}
    </li>
  );
}
