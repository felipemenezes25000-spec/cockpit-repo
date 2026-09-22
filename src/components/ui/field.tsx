import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Campo de formulário: rótulo, controle, dica e erro.
 *
 * O erro é ligado ao controle por `aria-describedby` e marcado com
 * `aria-invalid` — quem usa leitor de tela ouve o problema junto do campo, não
 * como um aviso solto no fim da página. O obrigatório vira `aria-required`,
 * porque o asterisco visível é escondido do leitor de tela.
 *
 * A ligação é feita aqui, uma vez, quando o filho é o próprio controle
 * (`input`, `select`, `textarea`). Antes cada formulário precisava lembrar de
 * fazer — e dois de quase cem lembravam.
 */

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

export const ENTRADA =
  "h-11 w-full rounded-[var(--radius-cartao)] border border-outline-variant bg-surface px-3.5 text-sm text-on-surface outline-none transition-colors placeholder:text-outline focus-visible:border-primary disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline";

export const ENTRADA_ERRO = "border-error focus-visible:border-error";

export const AREA_TEXTO =
  "min-h-28 w-full resize-y rounded-[var(--radius-cartao)] border border-outline-variant bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-on-surface outline-none transition-colors placeholder:text-outline focus-visible:border-primary";

export function Campo({
  id,
  rotulo,
  dica,
  erro,
  obrigatorio = false,
  children,
  className,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  erro?: string;
  obrigatorio?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="rotulo">
        {rotulo}
        {/* Campo obrigatório não é erro — é instrução. O vermelho fica
            reservado para quando algo de fato deu errado. */}
        {obrigatorio ? (
          <span aria-hidden="true" className="ml-1 text-atencao-acento">
            *
          </span>
        ) : null}
        {!obrigatorio ? (
          <span className="ml-2 font-normal tracking-normal text-outline lowercase">
            opcional
          </span>
        ) : null}
      </label>

      {ligarAoControle(children, erro ? `${id}-erro` : dica ? `${id}-dica` : null, Boolean(erro), obrigatorio)}

      {erro ? (
        <p id={`${id}-erro`} role="alert" className="text-xs text-error">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="text-xs text-outline">
          {dica}
        </p>
      ) : null}
    </div>
  );
}

/** Agrupa campos sob um título, com uma linha separando as seções. */
export function GrupoDeCampos({
  titulo,
  descricao,
  children,
  className,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("border-t border-card-border pt-6", className)}>
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-4">
        <p className="rotulo">{titulo}</p>
        {descricao ? (
          <p className="mt-1.5 text-xs text-outline">{descricao}</p>
        ) : null}
      </div>
      {children}
    </fieldset>
  );
}
