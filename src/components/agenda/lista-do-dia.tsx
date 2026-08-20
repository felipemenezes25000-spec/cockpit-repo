import { CalendarX2, Pencil } from "lucide-react";
import Link from "next/link";
import { BotoesSituacao } from "./botoes-situacao";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { formatarHora, formatarMoeda } from "@/lib/format";
import type { AtendimentoDoDia } from "@/server/consultas/agenda";

/**
 * Os atendimentos do dia, um cartão por horário, com as ações no próprio
 * cartão: a recepção confirma, inicia e conclui sem sair da lista.
 */
export function ListaDoDia({
  atendimentos,
  dia,
}: {
  atendimentos: AtendimentoDoDia[];
  dia: string;
}) {
  if (atendimentos.length === 0) {
    return (
      <EstadoVazio
        icone={CalendarX2}
        titulo="Nenhum horário neste dia"
        descricao="Marque um atendimento e ele aparece aqui na ordem do relógio."
        acao={
          <BotaoLink href={`/agenda/novo?dia=${dia}`} variante="primaria" tamanho="sm">
            Marcar atendimento
          </BotaoLink>
        }
      />
    );
  }

  return (
    <ul aria-label="Atendimentos do dia" className="flex flex-col gap-3">
      {atendimentos.map((atendimento) => {
        const fim = new Date(
          atendimento.inicio.getTime() + atendimento.duracaoMin * 60_000,
        );

        return (
          <li
            key={atendimento.id}
            className="flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)] sm:flex-row sm:items-start sm:gap-4"
          >
            <div className="flex shrink-0 items-center gap-3 sm:w-28 sm:flex-col sm:items-start sm:gap-1">
              <span className="tabular text-lg font-semibold text-on-surface">
                {formatarHora(atendimento.inicio)}
              </span>
              <span className="tabular text-xs text-outline">
                até {formatarHora(fim)}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Avatar nome={atendimento.paciente} tamanho="sm" />
                <Link
                  href={`/pacientes/${atendimento.pacienteId}`}
                  className="font-medium text-on-surface hover:text-primary hover:underline"
                >
                  {atendimento.paciente}
                </Link>
                <SituacaoChip situacao={atendimento.situacao} compacto />
              </div>

              <p className="text-sm text-on-surface-variant">
                {atendimento.procedimento}
                <span className="text-outline">
                  {" "}
                  · {atendimento.profissional} · {atendimento.duracaoMin} min
                  {atendimento.valor > 0
                    ? ` · ${formatarMoeda(atendimento.valor)}`
                    : ""}
                </span>
              </p>

              {atendimento.observacoes ? (
                <p className="text-xs text-outline">{atendimento.observacoes}</p>
              ) : null}

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <BotoesSituacao
                  atendimentoId={atendimento.id}
                  situacao={atendimento.situacao}
                  compacto
                />
                <Link
                  href={`/agenda/${atendimento.id}/editar`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  <Pencil aria-hidden="true" size={13} strokeWidth={1.75} />
                  Remarcar ou editar
                </Link>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
