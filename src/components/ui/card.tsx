import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Painel da Visão Geral: fundo cinza-claro sobre a página branca, borda fina e
 * canto de 16px. É a caixa maior — os cartões brancos ficam dentro dela.
 */
export function Card({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-painel)] border border-card-border bg-card",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function CardCabecalho({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-3 border-b border-card-border px-4 pt-5 pb-4 sm:px-8 sm:pt-8",
        className,
      )}
    >
      <div className="min-w-0">
        <h2 className="t-headline text-primary">{titulo}</h2>
        {descricao ? (
          <p className="mt-1 text-sm text-on-surface-variant">{descricao}</p>
        ) : null}
      </div>
      {/* `max-w-full`: no celular a ação desce para a linha de baixo e, se
          tiver mais de um botão, eles quebram entre si em vez de empurrar a
          página para o lado. */}
      {acao ? <div className="max-w-full shrink-0">{acao}</div> : null}
    </div>
  );
}

export function CardCorpo({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  // Recuo de 16 px no celular: com o px-4 do `<main>`, o px-6 deixava 240 px
  // para o conteúdo a 320 px, e botões e buscas estouravam o cartão.
  return <div className={cn("px-4 py-6 sm:px-8", className)}>{children}</div>;
}

export function CardRodape({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-t border-card-border px-4 py-4 text-xs sm:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
