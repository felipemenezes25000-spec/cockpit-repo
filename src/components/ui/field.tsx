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

const CONTROLE_BASE =
  "rounded-[var(--radius-controle)] border border-card-border bg-white/80 text-on-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.96),0_1px_2px_rgba(15,35,58,0.025)] transition-[border-color,box-shadow,background-color,transform] duration-200 placeholder:text-outline placeholder:italic hover:border-outline-variant hover:bg-white focus-visible:border-primary/50 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary focus-visible:shadow-[0_0_0_4px_rgba(10,110,209,0.07),0_8px_20px_-16px_rgba(8,84,160,0.45)] aria-[invalid=true]:border-error aria-[invalid=true]:bg-error-container/20 disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline disabled:shadow-none";

const ALTURA = { padrao: "h-11", compacta: "h-9" } as const;
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
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[0.72rem] font-semibold tracking-[0.055em] text-on-surface-variant uppercase">
        {rotulo}
        {obrigatorio ? <span aria-hidden="true" className="ml-1 text-atencao-acento">*</span> : null}
        {!obrigatorio ? <span className="ml-2 font-normal tracking-normal text-outline lowercase">opcional</span> : null}
      </label>
      {ligarAoControle(children, erro ? `${id}-erro` : dica ? `${id}-dica` : null, Boolean(erro), obrigatorio)}
      {erro ? <p id={`${id}-erro`} role="alert" className="mt-0.5 text-xs font-medium text-error">{erro}</p> : dica ? <p id={`${id}-dica`} className="mt-0.5 text-xs leading-5 text-outline">{dica}</p> : null}
    </div>
  );
}

export function GrupoDeCampos({ titulo, descricao, children, className }: { titulo: string; descricao?: string; children: ReactNode; className?: string }) {
  return (
    <fieldset className={cn("border-t border-card-border/80 pt-6", className)}>
      <legend className="sr-only">{titulo}</legend>
      <div className="mb-5">
        <p className="text-sm font-semibold tracking-[-0.015em] text-primary">{titulo}</p>
        {descricao ? <p className="mt-1.5 max-w-2xl text-xs leading-5 text-outline">{descricao}</p> : null}
      </div>
      {children}
    </fieldset>
  );
}
