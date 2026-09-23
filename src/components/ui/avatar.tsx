import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/format";

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
  const tons = {
    marca:
      "border border-primary/10 bg-[linear-gradient(145deg,var(--color-primary-fixed),#ffffff)] text-primary shadow-[var(--shadow-cartao)]",
    neutro:
      "border border-card-border bg-[linear-gradient(145deg,#ffffff,var(--color-surface-container-low))] text-on-surface-variant shadow-[var(--shadow-cartao)]",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[12px] font-semibold tracking-[-0.02em]",
        tamanho === "sm" ? "size-9 text-xs" : "size-10 text-sm",
        tons[tom],
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
