import { Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

/**
 * Faixa de contexto no topo do conteúdo.
 *
 * O aviso de dados fictícios só aparece enquanto houver dado de exemplo
 * carregado. Depois de `npm run dados:limpar`, some sozinho — o sistema não
 * mente sobre o que está mostrando.
 */
export async function FaixaDemonstracao({ className }: { className?: string }) {
  const exemplo = await temDadosDeExemplo();

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
          {exemplo
            ? "Dados de exemplo carregados — nada aqui é real"
            : "Etapa 3 — cadastro de pacientes"}
        </span>
      </span>
      <span className="text-xs font-medium text-outline">
        {exemplo ? "npm run dados:limpar remove" : "Agenda e financeiro, em breve"}
      </span>
    </div>
  );
}
