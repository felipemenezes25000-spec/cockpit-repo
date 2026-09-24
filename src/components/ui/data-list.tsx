import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Lista({ children, className, rotulo }: { children: ReactNode; className?: string; rotulo?: string }) {
  return <ul aria-label={rotulo} className={cn("flex flex-col gap-3", className)}>{children}</ul>;
}

export function ItemLista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        "premium-interactive group relative overflow-hidden rounded-[16px] border border-card-border/85 bg-white/78 p-4 shadow-[var(--shadow-cartao)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-primary/12 hover:bg-white/92",
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-85" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-12 -top-14 size-28 rounded-full bg-primary-fixed/0 blur-3xl transition-colors duration-300 group-hover:bg-primary-fixed/24" />
      <div className="relative">{children}</div>
    </li>
  );
}
