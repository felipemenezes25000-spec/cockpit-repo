import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/format";

const TONS_DE_MARCA = [
  "border border-primary/10 bg-[linear-gradient(145deg,var(--color-primary-fixed),#ffffff)] text-primary shadow-[var(--shadow-cartao)]",
  "border border-primary/10 bg-[linear-gradient(145deg,var(--color-secondary-fixed),#ffffff)] text-primary shadow-[var(--shadow-cartao)]",
  "border border-primary/10 bg-[linear-gradient(145deg,#eef6ff,#ffffff)] text-primary shadow-[var(--shadow-cartao)]",
  "border border-primary/10 bg-[linear-gradient(145deg,#f2f4ff,#ffffff)] text-primary shadow-[var(--shadow-cartao)]",
] as const;

function indiceDoNome(nome: string): number {
  let hash = 0;
  for (const caractere of nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")) {
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
  tamanho?: "sm" | "md";
  tom?: "marca" | "neutro";
  className?: string;
}) {
  const classeDoTom = tom === "marca"
    ? TONS_DE_MARCA[indiceDoNome(nome)]
    : "border border-card-border bg-[linear-gradient(145deg,#ffffff,var(--color-surface-container-low))] text-on-surface-variant shadow-[var(--shadow-cartao)]";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[12px] font-semibold tracking-[-0.02em] transition-[transform,box-shadow] duration-200",
        tamanho === "sm" ? "size-9 text-xs" : "size-10 text-sm",
        classeDoTom,
        className,
      )}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-2 top-0 h-px bg-white/80" />
      <span className="relative">{iniciais(nome)}</span>
    </span>
  );
}
