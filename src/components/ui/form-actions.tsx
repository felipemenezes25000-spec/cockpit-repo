import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function RodapeAcoesFormulario({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-20 -mx-1 mt-1 flex flex-wrap items-center gap-3 rounded-[var(--radius-painel)] border border-card-border bg-surface px-3 py-3 shadow-flutuante sm:px-4 lg:bottom-3",
        className,
      )}
    >
      <div className="flex w-full flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
