import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

const CONTROLES = new Set(["input", "select", "textarea"]);

function ligarAoControle(
  filhos: ReactNode,
  descricaoId: string | null,
  invalido: boolean,
  obrigatorio: boolean,
): ReactNode {
  if (Children.count(filhos) !== 1) return filhos;
  const unico = Children.toArray(filhos)[0];
  if (!isValidElement(unico) || typeof unico.type !== "string" || !CONTROLES.has(unico.type)) {
    return filhos;
  }
  const props = unico.props as Record<string, unknown>;
  const ja = typeof props["aria-describedby"] === "string" ? props["aria-describedby"] : "";
  const descritos = [...new Set([...ja.split(" "), descricaoId ?? ""].filter(Boolean))].join(" ");
  return cloneElement(unico as ReactElement<Record<string, unknown>>, {
    "aria-describedby": descritos || undefined,
    "aria-invalid": invalido ? true : props["aria-invalid"],
    "aria-required": obrigatorio && !props.required ? true : props["aria-required"],
  });
}

/** Campo: fundo branco, contorno de controle (3:1), foco em anel azul de ação. */
const CONTROLE_BASE =
  "peer rounded-[var(--radius-controle)] border border-borda-controle bg-surface text-on-surface transition-[border-color,background-color] duration-150 placeholder:text-outline hover:border-on-surface-variant focus-visible:border-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-container disabled:cursor-not-allowed disabled:border-card-border disabled:bg-surface-container-low disabled:text-outline";

const ALTURA = { padrao: "h-11 sm:h-10", compacta: "h-9" } as const;
const LARGURA = { cheia: "w-full", auto: "w-auto", nenhuma: "" } as const;
const RECUO = { padrao: "px-3.5", icone: "pr-3.5 pl-10", busca: "pr-10 pl-11", buscaCompacta: "pr-9 pl-10" } as const;
const TEXTO = { sm: "text-sm", xs: "text-xs" } as const;

export function classeDeEntrada({ altura = "padrao", largura = "cheia", recuo = "padrao", texto = "sm" }: { altura?: keyof typeof ALTURA; largura?: keyof typeof LARGURA; recuo?: keyof typeof RECUO; texto?: keyof typeof TEXTO } = {}): string {
  return [CONTROLE_BASE, ALTURA[altura], LARGURA[largura], RECUO[recuo], TEXTO[texto]].filter(Boolean).join(" ");
}

export function classeDeAreaDeTexto({ altura = "padrao" }: { altura?: "padrao" | "curta" } = {}): string {
  return [CONTROLE_BASE, "w-full resize-y px-3.5 py-3 text-sm leading-relaxed", altura === "curta" ? "min-h-16" : "min-h-28"].join(" ");
}

export const ENTRADA = classeDeEntrada();
export const ENTRADA_ERRO = "border-error!";
export const AREA_TEXTO = classeDeAreaDeTexto();

export function Campo({ id, rotulo, dica, erro, obrigatorio = false, children, className }: { id: string; rotulo: string; dica?: string; erro?: string; obrigatorio?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={cn("group/campo flex flex-col gap-1.5", className)}>
      <label
        htmlFor={id}
        className={cn(
          "flex items-center text-[0.8125rem] font-semibold transition-colors duration-150 group-focus-within/campo:text-primary",
          erro ? "text-error" : "text-on-surface",
        )}
      >
        {rotulo}
        {obrigatorio ? (
          <span aria-hidden="true" className="ml-1 text-atencao-acento">*</span>
        ) : (
          <span className="ml-1.5 text-xs font-normal text-outline">
            opcional
          </span>
        )}
      </label>
      {ligarAoControle(children, erro ? `${id}-erro` : dica ? `${id}-dica` : null, Boolean(erro), obrigatorio)}
      {erro ? (
        <p id={`${id}-erro`} role="alert" className="mt-0.5 flex items-start gap-1.5 text-xs font-medium leading-5 text-error">
          <span aria-hidden="true" className="mt-[0.42rem] size-1.5 shrink-0 rounded-full bg-error" />
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-0.5 text-xs leading-5 text-outline transition-colors group-focus-within/campo:text-on-surface-variant">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

export function GrupoDeCampos({ titulo, descricao, children, className }: { titulo: string; descricao?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset
      className={cn(
        "premium-panel rounded-[var(--radius-painel)] border border-card-border bg-surface px-4 py-5 shadow-[0_14px_34px_-30px_rgba(8,41,76,.38)] sm:px-6 sm:py-6",
        className,
      )}
    >
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-5 border-b border-card-border pb-4">
        <p className="titulo-secao text-primary">{titulo}</p>
        {descricao ? <p className="mt-1.5 max-w-2xl text-xs leading-5 text-outline">{descricao}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
