import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Tela vazia como convite para agir, não como aviso de erro. */
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
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-1 flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container text-outline">
        <Icone aria-hidden="true" size={20} strokeWidth={1.5} />
      </span>
      <p className="font-medium text-on-surface">{titulo}</p>
      <p className="max-w-xs text-sm text-outline">{descricao}</p>
      {acao ? <div className="mt-2">{acao}</div> : null}
    </div>
  );
}
