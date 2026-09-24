import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/format";

/**
 * Iniciais num círculo. Na marca, o azul claro de apoio; alternando entre dois
 * tons pelo nome, para duas pacientes vizinhas não parecerem a mesma.
 */
const TONS_DE_MARCA = [
  "bg-primary-fixed text-primary",
  "border border-primary-fixed-dim bg-selecao text-primary",
] as const;

function indiceDoNome(nome: string): number {
  let hash = 0;
  for (const caractere of nome.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR")) {
    hash = (hash * 31 + caractere.charCodeAt(0)) >>> 0;
  }
  return hash % TONS_DE_MARCA.length;
}

export function Avatar({
  nome,
  tamanho = "md",
  tom = "marca",
  className,
}: {
  nome: string;
  tamanho?: "sm" | "md" | "lg";
  /** "cabine": branco sobre o azul da cabine. */
  tom?: "marca" | "neutro" | "cabine";
  className?: string;
}) {
  const classeDoTom = tom === "marca"
    ? TONS_DE_MARCA[indiceDoNome(nome)]
    : tom === "cabine"
      ? "bg-cabine-texto text-cabine-profunda"
      : "border border-card-border bg-surface-container-low text-on-surface-variant";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold tracking-[-0.01em]",
        tamanho === "sm" ? "size-9 text-xs" : tamanho === "lg" ? "size-16 text-lg sm:size-[4.5rem] sm:text-xl" : "size-10 text-sm",
        classeDoTom,
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
