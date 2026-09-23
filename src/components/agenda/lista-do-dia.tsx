import { CalendarX2, Pencil } from "lucide-react";
import Link from "next/link";
import { BotoesSituacao } from "./botoes-situacao";
import { FocoAposAcao } from "./foco-apos-acao";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { formatarHora, formatarMoeda } from "@/lib/format";
import type { AtendimentoDoDia } from "@/server/consultas/agenda";

/**
 * Os atendimentos do dia, um cartão por horário, com as ações no próprio
 * cartão: a recepção confirma, inicia e conclui sem sair da lista.
 *
 * Cada botão e o link de editar levam o nome da paciente no nome acessível:
 * numa lista, "Confirmar" sozinho não diz de quem.
 */
export function ListaDoDia({
  atendimentos,
  dia,
  profissional,
  profissionalId,
  enderecoSemFiltro,
}: {
  atendimentos: AtendimentoDoDia[];
  dia: string;
  /** Nome da profissional filtrada, quando há filtro. */
  profissional?: string | null;
  /** Id da profissional filtrada: vai para a edição, que volta com o filtro. */
  profissionalId?: string | null;
  /** O mesmo dia, sem o filtro — a saída do estado vazio filtrado. */
  enderecoSemFiltro?: string;
}) {
  if (atendimentos.length === 0) {
    if (profissional && enderecoSemFiltro) {
      return (
        <EstadoVazio
          icone={CalendarX2}
          titulo={`Nenhum horário de ${profissional} neste dia`}
          descricao="Pode haver atendimentos de outras profissionais."
          acao={
            <BotaoLink href={enderecoSemFiltro} tamanho="sm">
              Ver a agenda de todas
            </BotaoLink>
          }
        />
      );
    }

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
            id={`atendimento-${atendimento.id}`}
            className="flex scroll-mt-24 flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)] target:border-primary sm:flex-row sm:items-start sm:gap-4"
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
                  className="inline-flex min-h-6 min-w-0 items-center font-medium break-words text-on-surface hover:text-primary hover:underline"
                >
                  {atendimento.paciente}
                </Link>
                <SituacaoChip situacao={atendimento.situacao} compacto />
              </div>

              <p className="text-sm break-words text-on-surface-variant">
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
                <p className="text-xs break-words whitespace-pre-line text-outline">
                  {atendimento.observacoes}
                </p>
              ) : null}

              <FocoAposAcao
                situacao={atendimento.situacao}
                className="mt-1 flex flex-wrap items-start gap-2 rounded-[var(--radius-cartao)]"
              >
                <BotoesSituacao
                  atendimentoId={atendimento.id}
                  situacao={atendimento.situacao}
                  paciente={atendimento.paciente}
                  compacto
                />
                <Link
                  href={
                    profissionalId
                      ? `/agenda/${atendimento.id}/editar?profissional=${profissionalId}`
                      : `/agenda/${atendimento.id}/editar`
                  }
                  aria-label={`Remarcar ou editar: ${atendimento.paciente}`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  <Pencil aria-hidden="true" size={13} strokeWidth={1.75} />
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
