import { cn } from "@/lib/cn";

/** Seletor segmentado acessível, responsivo e com identidade do Cockpit. */
export const SEGMENTO_GRUPO =
  "rolagem-discreta flex max-w-full overflow-x-auto rounded-[13px] border border-card-border/80 bg-white/54 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]";

export function classeDaOpcao(ativa: boolean): string {
  return cn(
    "group relative shrink-0 cursor-pointer overflow-hidden rounded-[9px] border border-transparent px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-[transform,background-color,border-color,box-shadow,color] duration-180 active:scale-[0.98]",
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary",
    ativa
      ? "border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(209,232,255,0.58))] font-semibold text-primary shadow-[0_1px_2px_rgba(15,35,58,0.05),0_5px_12px_-9px_rgba(8,84,160,0.42)]"
      : "text-on-surface-variant hover:border-primary/8 hover:bg-white/60 hover:text-primary",
  );
}
