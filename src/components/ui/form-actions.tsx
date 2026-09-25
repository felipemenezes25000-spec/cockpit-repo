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
        "rodape-acoes-formulario sticky bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-20 -mx-1 mt-2 flex flex-wrap items-center gap-3 rounded-[var(--radius-painel)] border border-card-border bg-surface/95 px-3 py-3 shadow-[0_24px_54px_-30px_rgba(8,41,76,.45)] backdrop-blur-md sm:px-4 lg:bottom-3",
        className,
      )}
    >
      <div className="flex w-full min-w-0 flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
