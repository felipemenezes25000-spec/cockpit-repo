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
        "sticky bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-20 -mx-1 mt-1 flex flex-wrap items-center gap-3 overflow-hidden rounded-[16px] border border-card-border/85 bg-white/88 px-3 py-3 shadow-[0_16px_42px_-24px_rgba(8,41,76,0.42),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl sm:px-4 lg:bottom-3",
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -bottom-12 size-28 rounded-full bg-primary-fixed/24 blur-3xl" />
      <div className="relative flex w-full flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
