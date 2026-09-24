import { CalendarX2, Pencil } from "lucide-react";
import Link from "next/link";
import { BotoesSituacao } from "./botoes-situacao";
import { FocoAposAcao } from "./foco-apos-acao";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";
import { formatarHora, formatarMoeda } from "@/lib/format";
import type { AtendimentoDoDia } from "@/server/consultas/agenda";

export function ListaDoDia({
  atendimentos,
  dia,
  profissional,
  profissionalId,
  enderecoSemFiltro,
}: {
  atendimentos: AtendimentoDoDia[];
  dia: string;
  profissional?: string | null;
  profissionalId?: string | null;
  enderecoSemFiltro?: string;
}) {
  if (atendimentos.length === 0) {
    if (profissional && enderecoSemFiltro) {
      return (
        <EstadoVazio
          icone={CalendarX2}
          titulo={`Nenhum horário de ${profissional} neste dia`}
          descricao="Pode haver atendimentos de outras profissionais."
          acao={<BotaoLink href={enderecoSemFiltro} tamanho="sm">Ver a agenda de todas</BotaoLink>}
        />
      );
    }

    return (
      <EstadoVazio
        icone={CalendarX2}
        titulo="Nenhum horário neste dia"
        descricao="Marque um atendimento e ele aparece aqui na ordem do relógio."
        acao={<BotaoLink href={`/agenda/novo?dia=${dia}`} variante="primaria" tamanho="sm">Marcar atendimento</BotaoLink>}
      />
    );
  }

  return (
    <ul aria-label="Atendimentos do dia" className="relative flex flex-col gap-3.5 before:absolute before:top-8 before:bottom-8 before:left-[2.2rem] before:w-px before:bg-linear-to-b before:from-transparent before:via-primary-fixed-dim/75 before:to-transparent sm:before:left-[4.35rem]">
      {atendimentos.map((atendimento, indice) => {
        const fim = new Date(atendimento.inicio.getTime() + atendimento.duracaoMin * 60_000);
        const emCurso = atendimento.situacao === "em_atendimento";
        const concluido = atendimento.situacao === "concluido";
        const encerrado = atendimento.situacao === "cancelado" || atendimento.situacao === "ausente";

        return (
          <li
            key={atendimento.id}
            id={`atendimento-${atendimento.id}`}
            style={{ animationDelay: `${Math.min(indice * 45, 260)}ms` }}
            className={cn(
              "dashboard-stagger premium-interactive group relative flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-[18px] border p-4 shadow-[var(--shadow-cartao)] target:border-primary sm:flex-row sm:items-start sm:gap-5 sm:p-5",
              emCurso
                ? "border-primary/20 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(209,232,255,0.35))] shadow-[var(--shadow-realce)]"
                : concluido
                  ? "border-positivo-borda/45 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(234,245,234,0.28))]"
                  : encerrado
                    ? "border-card-border/70 bg-surface-container-low/45"
                    : "border-card-border/85 bg-linear-to-br from-white/95 to-primary-fixed/12",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-4 left-0 w-1 rounded-r-full transition-[background-color,box-shadow] duration-200",
                emCurso
                  ? "bg-primary-container shadow-[0_0_14px_rgba(10,110,209,0.32)]"
                  : concluido
                    ? "bg-positivo"
                    : encerrado
                      ? "bg-outline-variant"
                      : "bg-primary-fixed-dim group-hover:bg-primary-container",
              )}
            />
            {emCurso ? <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary-fixed/55 blur-3xl" /> : null}

            <div className="relative z-[1] flex shrink-0 items-center gap-3 pl-1 sm:w-28 sm:flex-col sm:items-start sm:gap-1.5 sm:pl-0">
              <span className={cn("tabular text-xl font-semibold tracking-[-0.025em]", emCurso ? "text-primary" : "text-on-surface")}>
                {formatarHora(atendimento.inicio)}
              </span>
              <span className="tabular text-xs font-medium text-outline">até {formatarHora(fim)}</span>
              <span className="hidden rounded-full border border-card-border/75 bg-surface/80 px-2 py-0.5 text-[0.65rem] font-medium text-outline shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] sm:inline-flex">
                {atendimento.duracaoMin} min
              </span>
            </div>

            <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Avatar nome={atendimento.paciente} tamanho="sm" tom={emCurso ? "marca" : "neutro"} />
                <Link
                  href={`/pacientes/${atendimento.pacienteId}`}
                  className="inline-flex min-h-6 min-w-0 items-center text-[0.95rem] font-semibold break-words text-on-surface transition-colors hover:text-primary hover:underline"
                >
                  {atendimento.paciente}
                </Link>
                <SituacaoChip situacao={atendimento.situacao} compacto />
              </div>

              <p className="text-sm leading-6 break-words text-on-surface-variant">
                <span className="font-medium text-on-surface">{atendimento.procedimento}</span>
                <span className="text-outline">
                  {" "}· {atendimento.profissional}
                  {atendimento.valor > 0 ? ` · ${formatarMoeda(atendimento.valor)}` : ""}
                </span>
              </p>

              {atendimento.observacoes ? (
                <p className="rounded-[12px] border border-card-border/65 bg-white/52 px-3 py-2 text-xs leading-5 break-words whitespace-pre-line text-outline shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
                  {atendimento.observacoes}
                </p>
              ) : null}

              <FocoAposAcao situacao={atendimento.situacao} className="mt-0.5 flex flex-wrap items-start gap-2 rounded-[var(--radius-cartao)]">
                <BotoesSituacao atendimentoId={atendimento.id} situacao={atendimento.situacao} paciente={atendimento.paciente} compacto />
                <Link
                  href={profissionalId ? `/agenda/${atendimento.id}/editar?profissional=${profissionalId}` : `/agenda/${atendimento.id}/editar`}
                  aria-label={`Remarcar ou editar: ${atendimento.paciente}`}
                  className="group/edit inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-transparent px-3 text-xs font-medium text-on-surface-variant transition-[color,background-color,border-color,transform] duration-200 hover:-translate-y-px hover:border-card-border hover:bg-white/75 hover:text-primary active:translate-y-px"
                >
                  <Pencil aria-hidden="true" size={13} strokeWidth={1.75} className="transition-transform duration-150 group-hover/edit:rotate-[-4deg]" />
                  Remarcar ou editar
                </Link>
              </FocoAposAcao>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
