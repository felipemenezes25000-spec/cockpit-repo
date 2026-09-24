"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
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
      onSubmit={confirmacao ? (evento) => { if (!window.confirm(confirmacao)) evento.preventDefault(); } : undefined}
      className={cn("flex flex-col gap-1.5", alinhamento === "fim" && "items-end", className)}
    >
      {Object.entries(campos).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}
      {children}

      {!estado.ok && estado.mensagem ? (
        <p role="alert" className={cn("inline-flex max-w-sm items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3 py-2 text-xs leading-5 text-negativo", alinhamento === "fim" && "text-right")}>
          <CircleAlert aria-hidden="true" size={14} strokeWidth={1.8} className="mt-0.5 shrink-0" />
          <span>{estado.mensagem}</span>
        </p>
      ) : null}

      {/* O sucesso é só para o leitor de tela: quem enxerga já vê a lista
          mudar. Visível, a frase repetia a mudança da linha ("Resolvida") e,
          quando o formulário sobrevive à revalidação — "Concluir" vira
          "Reabrir" na mesma tarefa —, ficava colada ao botão novo. */}
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
  neutro: "border border-borda-controle bg-surface text-on-surface-variant hover:border-primary-container hover:bg-selecao hover:text-primary",
  positivo: "border border-positivo-borda bg-positivo-fundo text-positivo hover:border-positivo",
  negativo: "border border-negativo-borda bg-negativo-fundo text-negativo hover:border-negativo",
  informativo: "border border-informativo-borda bg-informativo-fundo text-informativo-texto hover:border-informativo",
  silencioso: "text-on-surface-variant hover:bg-surface-container-low hover:text-primary",
  primario: "border border-primary-container bg-primary-container text-on-primary hover:border-primary-hover hover:bg-primary-hover",
};

const TAMANHOS = {
  md: "h-10 px-4 text-sm [&_svg]:size-4.5",
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
  rotuloPendente,
  indisponivel = false,
  motivoIndisponivel,
}: {
  children: ReactNode;
  icone?: ReactNode;
  tom?: Tom;
  tamanho?: keyof typeof TAMANHOS;
  className?: string;
  rotuloAcessivel?: string;
  rotuloPendente?: ReactNode;
  indisponivel?: boolean;
  motivoIndisponivel?: string;
}) {
  const { pending } = useFormStatus();
  const desabilitado = pending || indisponivel;

  return (
    <button
      type="submit"
      disabled={desabilitado}
      aria-busy={pending || undefined}
      aria-disabled={indisponivel || undefined}
      aria-label={rotuloAcessivel}
      title={indisponivel ? motivoIndisponivel : undefined}
      className={cn(
        "group relative inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-[var(--radius-controle)] font-semibold whitespace-nowrap transition-[transform,background-color,border-color,color,filter] duration-150 ease-[var(--ease-standard)] active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none disabled:active:translate-y-0 disabled:active:scale-100",
        TAMANHOS[tamanho],
        TONS[tom],
        className,
      )}
    >
      <span className="relative inline-flex items-center gap-1.5">
        {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" /> : icone ? <span aria-hidden="true" className="inline-flex transition-transform duration-150">{icone}</span> : null}
        {pending && rotuloPendente ? rotuloPendente : children}
      </span>
    </button>
  );
}
