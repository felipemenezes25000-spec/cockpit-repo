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

/*
 * Aparência dos controles de formulário.
 *
 * Altura, largura, recuo e tamanho do texto são OPÇÕES de uma função, não
 * classes para sobrescrever depois. `cn()` só junta texto: escrever
 * `cn(ENTRADA, "h-9 w-auto")` deixava `h-11 w-full` e `h-9 w-auto` na mesma
 * lista, e no Tailwind v4 quem vence é a ordem do CSS gerado, não a da
 * classe. Foi assim que a navegação de dias da Agenda empilhou as setas em
 * cima e embaixo de uma data de largura inteira.
 *
 * O exemplo no campo vazio ("Maria Aparecida da Silva", "000.000.000-00") é
 * itálico: com a cor de texto terciário, que passa no contraste, ele ficava
 * parecido demais com um valor já preenchido.
 */

const CONTROLE_BASE =
  "rounded-[var(--radius-cartao)] border border-outline-variant bg-surface text-on-surface transition-colors placeholder:text-outline placeholder:italic focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-[invalid=true]:border-error disabled:cursor-not-allowed disabled:bg-surface-container-low disabled:text-outline";

const ALTURA = { padrao: "h-11", compacta: "h-9" } as const;
const LARGURA = { cheia: "w-full", auto: "w-auto", nenhuma: "" } as const;
const RECUO = {
  padrao: "px-3.5",
  /** Ícone à esquerda (lupa). */
  icone: "pr-3.5 pl-10",
  /** Ícone à esquerda e botão de limpar à direita. */
  busca: "pr-10 pl-11",
  /** O mesmo, no controle compacto. */
  buscaCompacta: "pr-9 pl-10",
} as const;
const TEXTO = { sm: "text-sm", xs: "text-xs" } as const;

export function classeDeEntrada({
  altura = "padrao",
  largura = "cheia",
  recuo = "padrao",
  texto = "sm",
}: {
  altura?: keyof typeof ALTURA;
  largura?: keyof typeof LARGURA;
  recuo?: keyof typeof RECUO;
  texto?: keyof typeof TEXTO;
} = {}): string {
  return [CONTROLE_BASE, ALTURA[altura], LARGURA[largura], RECUO[recuo], TEXTO[texto]]
    .filter(Boolean)
    .join(" ");
}

export function classeDeAreaDeTexto({ altura = "padrao" }: { altura?: "padrao" | "curta" } = {}): string {
  return [
    CONTROLE_BASE,
    "w-full resize-y px-3.5 py-2.5 text-sm leading-relaxed",
    altura === "curta" ? "min-h-16" : "min-h-28",
  ].join(" ");
}

export const ENTRADA = classeDeEntrada();

/**
 * Borda de erro. Com `!` porque disputa `border-color` com a base, e sem ele
 * o CSS gerado punha a borda neutra por último — o campo com erro nunca ficou
 * vermelho. Controle ligado a `Campo` já ganha a borda por `aria-invalid`;
 * esta classe cobre o controle montado fora dele. Só a borda: o foco é o
 * anel (`outline`) da base, que continua visível com a borda vermelha.
 */
export const ENTRADA_ERRO = "border-error!";

export const AREA_TEXTO = classeDeAreaDeTexto();

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
