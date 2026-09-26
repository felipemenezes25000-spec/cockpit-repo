import { FlaskConical, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Aviso de que a tela mostra dados fictícios.
 *
 * Mora no layout do sistema, não em cada página: antes cada tela montava o
 * seu, e tela nova nascia sem aviso (AGENTS.md §13). Só aparece enquanto
 * houver dado marcado como `exemplo` no banco — quando a clínica limpa a
 * demonstração, some sozinho, sem ninguém precisar mexer em nada.
 */
export function FaixaDemonstracao({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--radius-painel)] border border-atencao-borda bg-[linear-gradient(135deg,#fffaf0_0%,#fff5db_100%)] px-3 py-2 shadow-[0_16px_36px_-32px_rgba(143,71,0,.38)] sm:px-5 sm:py-3",
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-36 rounded-full bg-atencao-fundo blur-2xl" />
      <div className="relative flex items-center gap-2.5 sm:gap-3">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-atencao-borda bg-surface/80 text-atencao sm:size-9">
          <FlaskConical aria-hidden="true" size={17} strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-sm font-semibold text-on-surface">Ambiente de demonstração</strong>
            <span className="inline-flex items-center gap-1 rounded-full border border-atencao-borda bg-surface/70 px-2 py-0.5 text-[0.62rem] font-semibold tracking-[0.04em] text-atencao uppercase">
              <Sparkles aria-hidden="true" size={11} />
              Dados fictícios
            </span>
          </div>
          {/* No celular o aviso cabe numa linha: a explicação fica só para o
              leitor de tela, e o conteúdo da página (as abas do módulo, por
              exemplo) continua na primeira tela. */}
          <p className="sr-only text-xs leading-5 text-on-surface-variant sm:not-sr-only sm:mt-0.5">
            Pacientes, valores e agendamentos marcados como <em>exemplo</em> não representam a operação real da clínica.
          </p>
        </div>
      </div>
    </div>
  );
}
