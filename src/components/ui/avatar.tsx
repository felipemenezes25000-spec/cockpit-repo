import { cn } from "@/lib/cn";
import { iniciais } from "@/lib/format";

/**
 * Iniciais em quadrado de canto suave — o mesmo raio de 12px que o mockup usa
 * na foto do topo. Nesta etapa não há foto de paciente nem de equipe.
 */
export function Avatar({
  nome,
  tamanho = "md",
  tom = "verde",
  className,
}: {
  nome: string;
  tamanho?: "sm" | "md";
  tom?: "verde" | "neutro";
  className?: string;
}) {
  const tons = {
    verde: "bg-secondary-fixed text-primary",
    neutro: "bg-surface-container text-on-surface-variant",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-controle)] font-semibold",
        tamanho === "sm" ? "size-9 text-xs" : "size-10 text-sm",
        tons[tom],
        className,
      )}
    >
      {iniciais(nome)}
    </span>
  );
}
