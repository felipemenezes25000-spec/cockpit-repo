"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ACAO_INICIAL, type AcaoDeBotao } from "@/lib/acao";
import { cn } from "@/lib/cn";

export function FormularioDeAcao({
  acao,
  campos,
  confirmacao,
  children,
  className,
  alinhamento = "inicio",
}: {
  acao: AcaoDeBotao;
  campos: Record<string, string>;
  confirmacao?: string;
  children: ReactNode;
  className?: string;
  alinhamento?: "inicio" | "fim";
}) {
  const [estado, executar] = useActionState(acao, ACAO_INICIAL);

  return (
    <form
      action={executar}
      onSubmit={
        confirmacao
          ? (evento) => {
              if (!window.confirm(confirmacao)) evento.preventDefault();
            }
          : undefined
      }
      className={cn("flex flex-col gap-1.5", alinhamento === "fim" && "items-end", className)}
    >
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}

      {children}

      {!estado.ok && estado.mensagem ? (
        <p
          role="alert"
          className={cn(
            "max-w-xs rounded-lg border border-negativo-borda/65 bg-negativo-fundo/65 px-2.5 py-1.5 text-xs leading-snug text-negativo",
            alinhamento === "fim" && "text-right",
          )}
        >
          {estado.mensagem}
        </p>
      ) : null}

      {estado.ok && estado.mensagem ? (
        <p role="status" className="sr-only">
          {estado.mensagem}
        </p>
      ) : null}
    </form>
  );
}

type Tom = "neutro" | "positivo" | "negativo" | "informativo" | "silencioso" | "primario";

const TONS: Record<Tom, string> = {
  neutro:
    "border border-card-border/90 bg-surface/85 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:border-primary-fixed-dim hover:bg-primary-fixed/20 hover:text-primary",
  positivo:
    "border border-positivo-borda/90 bg-positivo-fundo/55 text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-positivo-fundo hover:shadow-[0_6px_14px_-10px_rgba(14,118,57,0.65)]",
  negativo:
    "border border-negativo-borda/90 bg-negativo-fundo/45 text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-negativo-fundo",
  informativo:
    "border border-informativo-borda/90 bg-informativo-fundo/55 text-informativo-texto shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-informativo-fundo",
  silencioso: "text-outline hover:bg-surface/80 hover:text-primary",
  primario:
    "border border-primary-container bg-linear-to-b from-primary-container to-primary text-on-primary shadow-[var(--shadow-primary)] hover:brightness-[0.96]",
};

const TAMANHOS = {
  sm: "h-9 px-3.5 text-sm [&_svg]:size-4",
  xs: "h-8 px-3 text-xs [&_svg]:size-3.5",
} as const;

export function BotaoDeAcao({
  children,
  icone,
  tom = "neutro",
  tamanho = "sm",
  className,
  rotuloAcessivel,
}: {
  children: ReactNode;
  icone?: ReactNode;
  tom?: Tom;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
  rotuloAcessivel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={rotuloAcessivel}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-controle)] font-medium whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color,filter] duration-150 ease-[var(--ease-standard)] active:translate-y-px active:scale-[0.985] disabled:cursor-wait disabled:opacity-60 disabled:active:translate-y-0 disabled:active:scale-100",
        TAMANHOS[tamanho],
        TONS[tom],
        className,
      )}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" className="animate-spin" />
      ) : icone ? (
        <span aria-hidden="true" className="inline-flex">
          {icone}
        </span>
      ) : null}
      {children}
    </button>
  );
}
