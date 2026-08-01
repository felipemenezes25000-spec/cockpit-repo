import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Faixa de contexto no topo do conteúdo. Avisa, de forma permanente e discreta,
 * que nada ali é dado real.
 */
export function FaixaDemonstracao({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface-container-low px-4 py-2",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-on-surface-variant">
        <Info aria-hidden="true" size={16} strokeWidth={1.5} />
        <span className="text-xs font-medium">
          Ambiente de demonstração — dados fictícios
        </span>
      </span>
      <span className="text-xs font-medium text-outline">
        Etapa 1 — estrutura e Visão Geral
      </span>
    </div>
  );
}
