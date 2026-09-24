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
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center sm:py-14", className)}>
      <span aria-hidden="true" className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <Icone size={22} strokeWidth={1.8} />
      </span>
      <p className="titulo-secao text-on-surface">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm leading-6 text-on-surface-variant">{descricao}</p>
      {acao ? <div className="mt-5">{acao}</div> : null}
    </div>
  );
}
