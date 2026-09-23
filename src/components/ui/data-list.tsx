import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

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
    <ul aria-label={rotulo} className={cn("flex flex-col gap-3", className)}>
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
        "premium-interactive rounded-[16px] border border-card-border/85 bg-white/78 p-4 shadow-[var(--shadow-cartao)]",
        className,
      )}
    >
      {children}
    </li>
  );
}
