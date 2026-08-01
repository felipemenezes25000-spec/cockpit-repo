import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ESTILO_SITUACAO, SituacaoChip } from "@/components/ui/status-chip";
import { formatarHora } from "@/lib/format";
import { duracaoDoAtendimento } from "@/data/appointments";
import { nomePaciente } from "@/data/patients";
import { procedimentoPorId } from "@/data/procedures";
import { nomeCurto, profissionalPorId } from "@/data/professionals";
import type { Atendimento } from "@/data/types";

export function ItemLinhaDoDia({ atendimento }: { atendimento: Atendimento }) {
  const procedimento = procedimentoPorId(atendimento.procedimentoId);
  const profissional = profissionalPorId(atendimento.profissionalId);
  const estilo = ESTILO_SITUACAO[atendimento.situacao];

  const emCurso = atendimento.situacao === "em_atendimento";
  const encerrado =
    atendimento.situacao === "cancelado" || atendimento.situacao === "ausente";

  return (
    <Link
      href="/agenda"
      aria-label={`Ver atendimento de ${nomePaciente(atendimento.pacienteId)} às ${formatarHora(atendimento.inicio)}`}
      className={cn(
        "group relative mb-2 flex items-center justify-between gap-4 rounded-[var(--radius-cartao)] border p-4 transition-all",
        /* O atendimento em curso sobe: fundo branco, sombra e ponto pulsando */
        emCurso
          ? "border-card-border bg-surface shadow-[var(--shadow-realce)]"
          : "border-transparent hover:border-card-border hover:bg-surface",
        encerrado && "opacity-70",
      )}
    >
      <span className="flex min-w-0 items-center gap-4 sm:gap-6">
        <span
          className={cn(
            "tabular w-12 shrink-0 text-right text-sm",
            emCurso ? "font-bold text-primary" : "font-medium text-on-surface-variant",
          )}
        >
          {formatarHora(atendimento.inicio)}
        </span>

        {/* Ponto sobre a linha do tempo — repete a situação, nunca sozinho */}
        <span
          aria-hidden="true"
          className={cn(
            "z-10 size-3 shrink-0 rounded-full ring-4",
            estilo.marcador,
            emCurso ? "animate-pulse ring-surface" : "ring-card group-hover:ring-surface",
          )}
        />

        <span className="min-w-0">
          <span className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={cn(
                "truncate text-on-surface",
                emCurso ? "font-bold" : "font-medium",
                encerrado && "line-through decoration-outline",
              )}
            >
              {nomePaciente(atendimento.pacienteId)}
            </span>
            <SituacaoChip situacao={atendimento.situacao} compacto />
          </span>
          <span
            className={cn(
              "block truncate text-sm",
              emCurso ? "font-medium text-on-surface-variant" : "text-outline",
            )}
          >
            {procedimento?.nome}
            {profissional ? ` · ${nomeCurto(profissional.nome)}` : ""}
            {` · ${duracaoDoAtendimento(atendimento)} min`}
          </span>
        </span>
      </span>

      <ChevronRight
        aria-hidden="true"
        size={22}
        strokeWidth={1.5}
        className={cn(
          "shrink-0 transition-colors",
          emCurso ? "text-primary" : "text-outline-variant group-hover:text-primary",
        )}
      />
    </Link>
  );
}

/** Intervalo livre entre dois atendimentos. A altura acompanha a duração. */
export function IntervaloLivre({ minutos }: { minutos: number }) {
  const altura = Math.round(Math.min(88, Math.max(26, minutos * 0.55)));

  return (
    <div className="relative flex items-center" style={{ height: `${altura}px` }}>
      <span className="w-12 shrink-0" />
      <span className="w-3 shrink-0" />
      <span className="ml-10 text-xs text-outline sm:ml-12">
        {formatarIntervalo(minutos)} sem atendimento
      </span>
    </div>
  );
}

function formatarIntervalo(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
