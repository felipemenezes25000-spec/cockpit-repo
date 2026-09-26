import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tom = "neutro" | "negativo";

const TOM: Record<Tom, string> = {
  neutro: "border-primary-fixed-dim bg-primary-fixed text-primary",
  negativo: "border-negativo-borda bg-negativo-fundo text-negativo",
};

/**
 * Uma tela que é só um aviso: acesso restrito, erro, página que não existe.
 * Traz o `<h1>` da tela, o motivo em uma frase e o caminho de volta.
 */
export function AvisoDeTela({
  icone: Icone,
  rotulo,
  titulo,
  children,
  selos,
  acoes,
  tom = "neutro",
  tituloRef,
  className,
}: {
  icone: LucideIcon;
  rotulo: string;
  titulo: string;
  children: ReactNode;
  selos?: ReactNode;
  acoes?: ReactNode;
  tom?: Tom;
  tituloRef?: React.Ref<HTMLHeadingElement>;
  className?: string;
}) {
  return (
    <section className={cn("premium-panel relative mx-auto w-full max-w-2xl overflow-hidden rounded-[var(--radius-painel)] border px-5 py-9 text-center sm:px-10 sm:py-12", className)}>
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary-fixed/35 blur-3xl" />
      <span aria-hidden="true" className={cn("vazio-icone relative mx-auto flex size-14 items-center justify-center rounded-[var(--radius-painel)] border shadow-[0_16px_34px_-24px_rgba(8,84,160,.52)]", TOM[tom])}>
        <Icone size={26} strokeWidth={1.7} />
      </span>
      <p className={cn("rotulo relative mt-6 break-words", tom === "negativo" ? "text-negativo" : "text-primary")}>{rotulo}</p>
      <h1 ref={tituloRef} tabIndex={tituloRef ? -1 : undefined} className="titulo-tela relative mx-auto mt-2 max-w-xl break-words text-balance text-on-surface outline-none">
        {titulo}
      </h1>
      <div className="relative mx-auto mt-3 max-w-lg break-words text-sm leading-6 text-on-surface-variant">{children}</div>
      {selos ? <div className="relative mt-6 flex min-w-0 flex-wrap justify-center gap-2">{selos}</div> : null}
      {acoes ? (
        <div className="relative mx-auto mt-7 grid w-full max-w-sm grid-cols-1 gap-2 sm:flex sm:max-w-none sm:flex-wrap sm:justify-center [&_a]:w-full [&_button]:w-full [&_form]:w-full sm:[&_a]:w-auto sm:[&_button]:w-auto sm:[&_form]:w-auto">
          {acoes}
        </div>
      ) : null}
    </section>
  );
}
