"use client";

import { CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
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
            "inline-flex max-w-sm items-start gap-2 rounded-[12px] border border-negativo-borda/70 bg-negativo-fundo/72 px-3 py-2 text-xs leading-5 text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
            alinhamento === "fim" && "text-right",
          )}
        >
          <CircleAlert aria-hidden="true" size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" />
          <span>{estado.mensagem}</span>
        </p>
      ) : null}

      {estado.ok && estado.mensagem ? (
        <p
          role="status"
          className={cn(
            "inline-flex max-w-sm items-start gap-2 rounded-[12px] border border-positivo-borda/70 bg-positivo-fundo/72 px-3 py-2 text-xs leading-5 text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
            alinhamento === "fim" && "text-right",
          )}
        >
          <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" />
          <span>{estado.mensagem}</span>
        </p>
      ) : null}
    </form>
  );
}

type Tom = "neutro" | "positivo" | "negativo" | "informativo" | "silencioso" | "primario";

const TONS: Record<Tom, string> = {
  neutro:
    "border border-card-border/90 bg-surface/85 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] hover:-translate-y-0.5 hover:border-primary-fixed-dim hover:bg-primary-fixed/20 hover:text-primary hover:shadow-[var(--shadow-cartao)]",
  positivo:
    "border border-positivo-borda/90 bg-positivo-fundo/55 text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-0.5 hover:bg-positivo-fundo hover:shadow-[0_8px_18px_-12px_rgba(14,118,57,0.65)]",
  negativo:
    "border border-negativo-borda/90 bg-negativo-fundo/45 text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-0.5 hover:bg-negativo-fundo hover:shadow-[0_8px_18px_-12px_rgba(186,26,26,0.45)]",
  informativo:
    "border border-informativo-borda/90 bg-informativo-fundo/55 text-informativo-texto shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:-translate-y-0.5 hover:bg-informativo-fundo hover:shadow-[var(--shadow-cartao)]",
  silencioso: "text-outline hover:bg-surface/80 hover:text-primary",
  primario:
    "border border-primary-container bg-linear-to-b from-primary-container to-primary text-on-primary shadow-[var(--shadow-primary)] hover:-translate-y-0.5 hover:brightness-[0.96] hover:shadow-[0_12px_28px_-12px_rgba(8,84,160,0.68)]",
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
        "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-[var(--radius-controle)] font-medium whitespace-nowrap transition-[transform,box-shadow,background-color,border-color,color,filter] duration-150 ease-[var(--ease-standard)] active:translate-y-px active:scale-[0.985] disabled:cursor-wait disabled:opacity-60 disabled:active:translate-y-0 disabled:active:scale-100",
        TAMANHOS[tamanho],
        TONS[tom],
        className,
      )}
    >
      {tom === "primario" ? <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/45" /> : null}
      <span className="relative inline-flex items-center gap-1.5">
        {pending ? (
          <LoaderCircle aria-hidden="true" className="animate-spin" />
        ) : icone ? (
          <span aria-hidden="true" className="inline-flex transition-transform duration-150 group-hover:scale-[1.04]">
            {icone}
          </span>
        ) : null}
        {children}
      </span>
    </button>
  );
}
