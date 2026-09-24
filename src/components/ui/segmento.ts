import { cn } from "@/lib/cn";

/** Seletor segmentado acessível, responsivo e com identidade do Cockpit. */
export const SEGMENTO_GRUPO =
  "rolagem-discreta flex max-w-full snap-x snap-mandatory scroll-px-1 overflow-x-auto rounded-[14px] border border-card-border/80 bg-white/56 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.94),0_8px_24px_-22px_rgba(8,41,76,0.34)]";

export function classeDaOpcao(ativa: boolean): string {
  return cn(
    "group relative shrink-0 snap-start cursor-pointer overflow-hidden rounded-[10px] border border-transparent px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-[transform,background-color,border-color,box-shadow,color] duration-180 active:scale-[0.98]",
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary",
    ativa
      ? "border-primary/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(209,232,255,0.6))] font-semibold text-primary shadow-[0_1px_2px_rgba(15,35,58,0.05),0_6px_14px_-10px_rgba(8,84,160,0.48)] after:absolute after:inset-x-3 after:bottom-0 after:h-[2px] after:rounded-full after:bg-primary-container after:shadow-[0_0_8px_rgba(10,110,209,0.2)]"
      : "text-on-surface-variant hover:-translate-y-px hover:border-primary/8 hover:bg-white/66 hover:text-primary",
  );
}
