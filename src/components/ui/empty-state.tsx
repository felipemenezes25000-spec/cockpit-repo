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
    <div className={cn("relative flex min-w-0 flex-col items-center justify-center overflow-hidden px-5 py-11 text-center sm:px-6 sm:py-14", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-fixed/30 blur-3xl" />
      <span aria-hidden="true" className="vazio-icone relative mb-5 flex size-13 items-center justify-center rounded-full bg-primary-fixed text-primary">
        <Icone size={23} strokeWidth={1.8} />
      </span>
      <p className="titulo-secao relative max-w-full break-words text-on-surface">{titulo}</p>
      <p className="relative mt-1.5 max-w-sm break-words text-sm leading-6 text-on-surface-variant">{descricao}</p>
      {acao ? (
        <div className="relative mt-5 grid w-full max-w-sm grid-cols-1 gap-2 sm:flex sm:w-auto sm:max-w-none sm:flex-wrap sm:justify-center [&_a]:w-full [&_button]:w-full sm:[&_a]:w-auto sm:[&_button]:w-auto">
          {acao}
        </div>
      ) : null}
    </div>
  );
}
