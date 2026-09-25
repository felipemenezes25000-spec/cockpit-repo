import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tom = "neutro" | "negativo";

const TOM: Record<Tom, string> = {
  neutro: "bg-primary-fixed text-primary",
  negativo: "bg-negativo-fundo text-negativo",
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
    <section className={cn("premium-panel mx-auto w-full max-w-2xl rounded-[var(--radius-painel)] border px-6 py-9 text-center sm:px-10 sm:py-11", className)}>
      <span aria-hidden="true" className={cn("vazio-icone mx-auto flex size-14 items-center justify-center rounded-[var(--radius-painel)]", TOM[tom])}>
        <Icone size={26} strokeWidth={1.7} />
      </span>
      <p className={cn("rotulo mt-6", tom === "negativo" ? "text-negativo" : "text-primary")}>{rotulo}</p>
      <h1 ref={tituloRef} tabIndex={tituloRef ? -1 : undefined} className="titulo-tela mx-auto mt-2 max-w-xl text-on-surface outline-none">
        {titulo}
      </h1>
      <div className="mx-auto mt-3 max-w-lg text-sm leading-6 text-on-surface-variant">{children}</div>
      {selos ? <div className="mt-6 flex flex-wrap justify-center gap-2">{selos}</div> : null}
      {acoes ? <div className="mt-7 flex flex-wrap justify-center gap-2">{acoes}</div> : null}
    </section>
  );
}
