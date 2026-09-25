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
    <div className={cn("relative flex flex-col items-center justify-center overflow-hidden px-6 py-12 text-center sm:py-14", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed/30 blur-3xl" />
      <span aria-hidden="true" className="vazio-icone relative mb-5 flex size-13 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <Icone size={23} strokeWidth={1.8} />
      </span>
      <p className="titulo-secao relative text-on-surface">{titulo}</p>
      <p className="relative mt-1.5 max-w-sm text-sm leading-6 text-on-surface-variant">{descricao}</p>
      {acao ? <div className="relative mt-5">{acao}</div> : null}
    </div>
  );
}
