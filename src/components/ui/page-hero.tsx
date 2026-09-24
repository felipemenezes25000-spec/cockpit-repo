import { ArrowLeft, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { LuzDoCursor } from "@/components/ui/cursor-glow";

type TomDoSelo = "neutro" | "informativo" | "positivo" | "atencao" | "negativo";

const TOM_DO_SELO: Record<TomDoSelo, string> = {
  neutro: "border-card-border/90 bg-surface/75 text-on-surface-variant",
  informativo: "border-informativo-borda/80 bg-informativo-fundo/75 text-informativo-texto",
  positivo: "border-positivo-borda/80 bg-positivo-fundo/75 text-positivo",
  atencao: "border-atencao-borda/85 bg-atencao-fundo/78 text-atencao",
  negativo: "border-negativo-borda/85 bg-negativo-fundo/78 text-negativo",
};

export function LinkDeVoltar({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex min-h-10 w-fit items-center gap-2 rounded-[var(--radius-controle)] border border-card-border/80 bg-surface/65 px-3.5 text-sm font-medium text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm transition-[transform,border-color,background-color,color,box-shadow] duration-150 hover:-translate-y-0.5 hover:border-primary-fixed-dim hover:bg-surface hover:text-primary hover:shadow-[var(--shadow-cartao)] active:translate-y-px", className)}>
      <span className="flex size-6 items-center justify-center rounded-lg bg-surface-container-low text-outline transition-[transform,color,background-color] duration-150 group-hover:-translate-x-0.5 group-hover:bg-primary-fixed/65 group-hover:text-primary"><ArrowLeft aria-hidden="true" size={14} strokeWidth={1.8} /></span>
      {children}
    </Link>
  );
}

export function SeloHero({ children, tom = "neutro", className }: { children: ReactNode; tom?: TomDoSelo; className?: string }) {
  return <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-px hover:shadow-[var(--shadow-cartao)]", TOM_DO_SELO[tom], className)}>{children}</span>;
}

/** Cabeçalho editorial e visual dos módulos principais. */
export function CabecalhoDePagina({ icone: Icone, rotulo, titulo, descricao, acoes, meta, className }: { icone: LucideIcon; rotulo: string; titulo: string; descricao: ReactNode; acoes?: ReactNode; meta?: ReactNode; className?: string }) {
  return (
    <section className={cn("premium-panel group relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border px-5 py-5 transition-[box-shadow,border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/16 hover:shadow-[0_26px_70px_-38px_rgba(8,84,160,0.34),var(--shadow-realce)] sm:px-7 sm:py-7", className)}>
      <LuzDoCursor tamanho={520} className="opacity-0 group-hover:opacity-100" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-[0.16] [background-image:linear-gradient(rgba(10,110,209,0.10)_1px,transparent_1px),linear-gradient(90deg,rgba(10,110,209,0.10)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-12 -z-10 size-64 rounded-full bg-primary-fixed/55 blur-3xl transition-transform duration-700 ease-out motion-safe:animate-[pulse_8s_ease-in-out_infinite] group-hover:scale-110" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-1/4 -z-10 h-44 w-80 rounded-full bg-secondary-fixed/30 blur-3xl transition-transform duration-700 ease-out motion-safe:animate-[pulse_11s_ease-in-out_infinite] group-hover:translate-x-5" />
      <Icone aria-hidden="true" strokeWidth={0.65} className="pointer-events-none absolute -right-7 -bottom-10 -z-10 size-44 text-primary/[0.035] transition-[transform,opacity] duration-700 ease-out group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-[1.04] group-hover:text-primary/[0.055] sm:size-52" />
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.98),transparent)]" />
      <span aria-hidden="true" className="pointer-events-none absolute top-0 left-[14%] h-px w-20 bg-primary-fixed-dim/65 shadow-[0_0_14px_rgba(10,110,209,0.18)]" />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <span className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary-fixed-dim/60 bg-linear-to-br from-white to-primary-fixed/55 text-primary shadow-[var(--shadow-primary)] transition-[transform,box-shadow] duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.025] group-hover:shadow-[0_12px_28px_-12px_rgba(10,110,209,0.62)] sm:size-14">
            <span aria-hidden="true" className="absolute inset-1 rounded-[12px] border border-white/60" />
            <Icone aria-hidden="true" size={24} strokeWidth={1.65} className="relative" />
          </span>
          <div className="min-w-0">
            <p className="rotulo text-primary/80">{rotulo}</p>
            <h2 className="mt-2 text-[clamp(1.65rem,3vw,2.35rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-on-surface">{titulo}</h2>
            <div className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant sm:text-[0.95rem]">{descricao}</div>
          </div>
        </div>
        {acoes ? <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">{acoes}</div> : null}
      </div>

      {meta ? <div className="relative z-10 mt-5 flex flex-wrap items-center gap-2 border-t border-card-border/65 pt-4">{meta}</div> : null}
    </section>
  );
}
