"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { classeDeEntrada } from "@/components/ui/field";
import { cn } from "@/lib/cn";

/**
 * Navegação entre dias, com o dia na URL: `?dia=AAAA-MM-DD`.
 *
 * Recarregar, voltar pelo navegador e mandar o link de um dia específico
 * funcionam — mesmo raciocínio da busca de pacientes.
 */
export function NavegacaoDia({
  dia,
  anterior,
  proximo,
  ehHoje,
}: {
  /** "AAAA-MM-DD" do dia exibido e dos vizinhos, calculados no servidor. */
  dia: string;
  anterior: string;
  proximo: string;
  ehHoje: boolean;
}) {
  const router = useRouter();

  const seta =
    "flex size-9 items-center justify-center rounded-[var(--radius-cartao)] border border-card-border bg-surface text-on-surface-variant transition-colors hover:border-primary hover:text-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link href={`/agenda?dia=${anterior}`} aria-label="Dia anterior" className={seta}>
        <ChevronLeft aria-hidden="true" size={18} strokeWidth={1.75} />
      </Link>

      <input
        type="date"
        value={dia}
        onChange={(e) => {
          if (e.target.value) router.push(`/agenda?dia=${e.target.value}`);
        }}
        aria-label="Escolher o dia"
        className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "tabular")}
      />

      <Link href={`/agenda?dia=${proximo}`} aria-label="Dia seguinte" className={seta}>
        <ChevronRight aria-hidden="true" size={18} strokeWidth={1.75} />
      </Link>

      {!ehHoje ? (
        <Link
          href="/agenda"
          className="inline-flex h-9 items-center rounded-[var(--radius-cartao)] px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
        >
          Voltar para hoje
        </Link>
      ) : null}
    </div>
  );
}
