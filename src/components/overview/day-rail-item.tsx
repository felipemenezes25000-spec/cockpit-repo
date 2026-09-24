import { ChevronRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ESTILO_SITUACAO, SituacaoChip } from "@/components/ui/status-chip";
import { formatarHora } from "@/lib/format";
import type { AtendimentoDoDia } from "@/server/consultas/agenda";

/** Primeiro nome com o título, quando houver: "Dra. Marina". */
function nomeCurto(nome: string): string {
  const partes = nome.split(" ");
  if (partes[0].endsWith(".")) return `${partes[0]} ${partes[1] ?? ""}`.trim();
  return partes[0];
}

export function ItemLinhaDoDia({ atendimento }: { atendimento: AtendimentoDoDia }) {
  const estilo = ESTILO_SITUACAO[atendimento.situacao];

  const emCurso = atendimento.situacao === "em_atendimento";
  const encerrado =
    atendimento.situacao === "cancelado" || atendimento.situacao === "ausente";

  return (
    <Link
      href="/agenda"
      aria-label={`Ver atendimento de ${atendimento.paciente} às ${formatarHora(atendimento.inicio)}`}
      className={cn(
        "premium-interactive group relative mb-2 flex items-center justify-between gap-2 overflow-hidden rounded-[16px] border p-3 sm:gap-4 sm:p-4",
        emCurso
          ? "border-primary/18 bg-[linear-gradient(135deg,rgba(255,255,255,0.97),rgba(236,247,255,0.88))] shadow-[inset_0_1px_0_rgba(255,255,255,0.98),var(--shadow-realce)]"
          : "border-transparent bg-transparent hover:bg-white/72",
      )}
    >
      {emCurso ? (
        <>
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-primary shadow-[0_0_14px_rgba(10,110,209,0.35)]" />
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 right-4 size-32 rounded-full bg-primary-fixed/55 blur-3xl" />
        </>
      ) : null}

      <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-90" />

      <span className="relative flex min-w-0 items-center gap-3 sm:gap-6">
        <span
          className={cn(
            "tabular w-10 shrink-0 text-right text-sm sm:w-12",
            emCurso ? "font-bold text-primary" : "font-medium text-on-surface-variant",
          )}
        >
          {formatarHora(atendimento.inicio)}
        </span>

        <span
          aria-hidden="true"
          className={cn(
            "z-10 size-3 shrink-0 rounded-full border border-white/70 ring-4 transition-transform duration-150 group-hover:scale-110",
            estilo.marcador,
            emCurso ? "now-pulse ring-primary-fixed/70" : "ring-card group-hover:ring-white",
          )}
        />

        <span className="min-w-0">
          <span className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              className={cn(
                "truncate text-on-surface",
                emCurso ? "font-bold tracking-[-0.01em]" : "font-medium",
                encerrado && "line-through decoration-outline",
              )}
            >
              {atendimento.paciente}
            </span>
            <SituacaoChip situacao={atendimento.situacao} compacto />
          </span>

          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className={cn("truncate", emCurso ? "font-medium text-on-surface-variant" : "text-outline")}>{atendimento.procedimento}</span>
            {atendimento.profissional ? (
              <span className="truncate text-outline">· {nomeCurto(atendimento.profissional)}</span>
            ) : null}
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-container-low/80 px-1.5 py-0.5 text-[0.66rem] font-medium text-outline">
              <Clock3 aria-hidden="true" size={11} strokeWidth={1.7} />
              {atendimento.duracaoMin} min
            </span>
          </span>
        </span>
      </span>

      <ChevronRight
        aria-hidden="true"
        size={22}
        strokeWidth={1.5}
        className={cn(
          "relative hidden shrink-0 transition-[transform,color] duration-150 sm:block",
          emCurso ? "text-primary" : "text-outline-variant group-hover:translate-x-0.5 group-hover:text-primary",
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
      <span className="w-10 shrink-0 sm:w-12" />
      <span className="w-3 shrink-0" />
      <span className="ml-8 inline-flex items-center rounded-full border border-card-border/70 bg-white/42 px-2 py-1 text-[0.66rem] font-medium text-outline sm:ml-12">
        {formatarIntervalo(minutos)} livre
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
