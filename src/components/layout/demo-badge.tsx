import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Aviso de que a tela mostra dados fictícios.
 *
 * Mora no layout do sistema, não em cada página: antes cada tela montava o
 * seu, e tela nova nascia sem aviso (AGENTS.md §13). Só aparece enquanto
 * houver dado marcado como `exemplo` no banco — quando a clínica limpa a
 * demonstração, some sozinho, sem ninguém precisar mexer em nada.
 *
 * Fala com quem usa o sistema, não com quem o mantém: como remover os dados
 * de exemplo é assunto do README, não da recepção.
 */
export function FaixaDemonstracao({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-[var(--radius-cartao)] border border-dashed border-outline-variant bg-surface-container-low px-4 py-2 text-xs leading-relaxed text-on-surface-variant sm:items-center",
        className,
      )}
    >
      <FlaskConical aria-hidden="true" size={16} strokeWidth={1.5} className="mt-px shrink-0 sm:mt-0" />
      <span>
        <strong className="font-semibold">Ambiente de demonstração.</strong> Pacientes, valores e
        agendamentos marcados como <em>exemplo</em> são fictícios.
      </span>
    </p>
  );
}
