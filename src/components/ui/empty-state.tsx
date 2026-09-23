import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EstadoVazio({
  icone: Icone,
  titulo,
  descricao,
  acao,
  className,
}: {
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden px-6 py-12 text-center sm:py-14",
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute top-5 left-1/2 size-32 -translate-x-1/2 rounded-full bg-primary-fixed/35 blur-3xl" />
      <span className="relative mb-3 flex size-13 items-center justify-center rounded-[16px] border border-primary/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.95),rgba(209,232,255,0.55))] text-primary shadow-[var(--shadow-cartao)]">
        <Icone aria-hidden="true" size={21} strokeWidth={1.6} />
      </span>
      <p className="relative text-[0.95rem] font-semibold tracking-[-0.015em] text-on-surface">{titulo}</p>
      <p className="relative mt-1 max-w-sm text-sm leading-6 text-outline">{descricao}</p>
      {acao ? <div className="relative mt-4">{acao}</div> : null}
    </div>
  );
}
