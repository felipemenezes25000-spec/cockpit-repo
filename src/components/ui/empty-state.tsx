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
      <span aria-hidden="true" className="pointer-events-none absolute top-2 left-1/2 size-40 -translate-x-1/2 rounded-full bg-primary-fixed/34 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute top-[2.15rem] left-1/2 size-24 -translate-x-1/2 rounded-full border border-primary/8" />
      <span aria-hidden="true" className="pointer-events-none absolute top-[3.15rem] left-1/2 size-16 -translate-x-1/2 rounded-full border border-primary/10" />

      <span className="relative mb-4 flex size-14 items-center justify-center rounded-[18px] border border-primary/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.97),rgba(209,232,255,0.58))] text-primary shadow-[0_12px_28px_-16px_rgba(10,110,209,0.45),inset_0_1px_0_rgba(255,255,255,0.95)]">
        <span aria-hidden="true" className="absolute inset-1 rounded-[14px] border border-white/65" />
        <Icone aria-hidden="true" size={22} strokeWidth={1.6} className="relative" />
      </span>

      <p className="relative text-[1rem] font-semibold tracking-[-0.02em] text-on-surface">{titulo}</p>
      <p className="relative mt-1.5 max-w-sm text-sm leading-6 text-outline">{descricao}</p>
      {acao ? <div className="relative mt-5">{acao}</div> : null}
    </div>
  );
}
