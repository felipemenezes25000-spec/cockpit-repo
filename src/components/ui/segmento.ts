import { cn } from "@/lib/cn";

/** Seletor segmentado: um trilho com contorno de controle e a opção escolhida em azul claro. */
export const SEGMENTO_GRUPO =
  "rolagem-discreta flex max-w-full snap-x snap-mandatory scroll-px-1 gap-0.5 overflow-x-auto rounded-[var(--radius-controle)] border border-borda-controle bg-surface p-0.5";

export function classeDaOpcao(ativa: boolean): string {
  return cn(
    "relative shrink-0 snap-start cursor-pointer rounded-[calc(var(--radius-controle)-2px)] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-150",
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary",
    ativa
      ? "bg-primary-fixed font-semibold text-primary"
      : "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
  );
}
