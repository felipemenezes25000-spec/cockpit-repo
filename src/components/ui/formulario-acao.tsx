"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ACAO_INICIAL, type AcaoDeBotao } from "@/lib/acao";
import { cn } from "@/lib/cn";

/**
 * Formulário de uma ação só — arquivar, mudar situação, ativar, revogar.
 *
 * Continua sendo `<form>` de verdade (AGENTS.md §6, regra 6): sem JavaScript
 * o botão ainda envia. O que muda é que a resposta da ação volta para a tela.
 * Antes, uma recusa do banco revalidava a página e nada acontecia; agora a
 * frase aparece colada ao botão, anunciada ao leitor de tela.
 *
 * O sucesso também é anunciado, mas só para leitor de tela (`sr-only`): quem
 * enxerga já vê a lista mudar.
 */
export function FormularioDeAcao({
  acao,
  campos,
  confirmacao,
  children,
  className,
  alinhamento = "inicio",
}: {
  acao: AcaoDeBotao;
  /** Campos escondidos que a ação lê: `{ id, para }`. */
  campos: Record<string, string>;
  /** Pergunta de `window.confirm` antes de enviar, para ação que pede cuidado. */
  confirmacao?: string;
  children: ReactNode;
  className?: string;
  /** De que lado a mensagem de erro se alinha, conforme onde o botão mora. */
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
      className={cn("flex flex-col gap-1", alinhamento === "fim" && "items-end", className)}
    >
      {Object.entries(campos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}

      {children}

      {!estado.ok && estado.mensagem ? (
        <p
          role="alert"
          className={cn(
            "max-w-xs text-xs leading-snug text-negativo",
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
    "border border-card-border bg-surface text-on-surface-variant hover:border-primary hover:text-primary",
  positivo: "border border-positivo-borda bg-surface text-positivo hover:bg-positivo-fundo",
  negativo: "border border-negativo-borda bg-surface text-negativo hover:bg-negativo-fundo",
  informativo:
    "border border-informativo-borda bg-surface text-informativo-texto hover:bg-informativo-fundo",
  silencioso: "text-outline hover:bg-surface-container-low hover:text-primary",
  primario: "bg-primary-container text-on-primary hover:bg-primary",
};

const TAMANHOS = {
  sm: "h-9 px-3.5 text-sm [&_svg]:size-4",
  xs: "h-8 px-3 text-xs [&_svg]:size-3.5",
} as const;

/**
 * O botão de envio do `FormularioDeAcao`.
 *
 * Precisa ser componente filho: `useFormStatus` só enxerga o `<form>` de um
 * ancestral (AGENTS.md §6, regra 8). Enquanto a ação roda, fica indisponível —
 * dois cliques rápidos não viram duas gravações — e troca o ícone pelo
 * indicador de progresso.
 *
 * O ícone chega como elemento (`<Archive />`), não como componente: página de
 * servidor não pode passar função para componente de cliente. O tamanho vem
 * daqui, pelo CSS, para todo botão do sistema ter o mesmo.
 */
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
  /** Nome para leitor de tela quando o texto visível não basta ("Arquivar foto de 12/03"). */
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
        "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-cartao)] font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-wait disabled:opacity-60",
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
