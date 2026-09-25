import { CalendarX2, Clock3, Pencil } from "lucide-react";
import Link from "next/link";
import { BotoesSituacao } from "./botoes-situacao";
import { FocoAposAcao } from "./foco-apos-acao";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { BotaoWhatsApp } from "@/components/ui/botao-whatsapp";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SituacaoChip } from "@/components/ui/status-chip";
import { cn } from "@/lib/cn";
import { formatarData, formatarHora, formatarMoeda } from "@/lib/format";
import { linkWhatsApp, mensagemConfirmacao } from "@/lib/relacionamento";
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
    <ul aria-label="Atendimentos do dia" className="relative flex flex-col gap-3.5 before:absolute before:top-8 before:bottom-8 before:left-[1.2rem] before:w-px before:bg-gradient-to-b before:from-primary-fixed-dim before:via-card-border before:to-transparent sm:before:left-[4.7rem]">
      {atendimentos.map((atendimento, indice) => {
        const fim = new Date(atendimento.inicio.getTime() + atendimento.duracaoMin * 60_000);
        const emCurso = atendimento.situacao === "em_atendimento";
        const concluido = atendimento.situacao === "concluido";
        const encerrado = atendimento.situacao === "cancelado" || atendimento.situacao === "ausente";
        const pedeConfirmacao = atendimento.situacao === "agendado" || atendimento.situacao === "aguardando_confirmacao";
        const whatsapp = pedeConfirmacao
          ? linkWhatsApp(atendimento.telefone, mensagemConfirmacao(atendimento.paciente, formatarData(atendimento.inicio), formatarHora(atendimento.inicio)))
          : null;

        return (
          <li
            key={atendimento.id}
            id={`atendimento-${atendimento.id}`}
            style={{ animationDelay: `${Math.min(indice * 45, 260)}ms` }}
            className={cn(
              "dashboard-stagger premium-interactive group relative flex scroll-mt-40 flex-col gap-4 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border p-4 target:border-primary sm:flex-row sm:items-start sm:gap-5 sm:p-5",
              emCurso
                ? "border-primary-fixed-dim bg-selecao shadow-[0_18px_42px_-30px_rgba(10,110,209,.6)]"
                : concluido
                  ? "border-card-border bg-surface"
                  : encerrado
                    ? "border-card-border bg-surface-container-low"
                    : "border-card-border bg-surface",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-y-4 left-0 w-1 rounded-r-full transition-[background-color] duration-200",
                emCurso
                  ? "bg-primary-container"
                  : concluido
                    ? "bg-positivo"
                    : encerrado
                      ? "bg-outline-variant"
                      : "bg-primary-fixed-dim group-hover:bg-primary-container",
              )}
            />

            <div className="relative z-[1] flex shrink-0 items-center gap-3 pl-2 sm:w-32 sm:flex-col sm:items-start sm:gap-1.5 sm:pl-2">
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-2 -left-[0.28rem] hidden size-3 rounded-full border-[3px] border-surface sm:block",
                  emCurso ? "now-pulse bg-primary-container" : concluido ? "bg-positivo" : encerrado ? "bg-outline-variant" : "bg-primary-fixed-dim",
                )}
              />
              <span className={cn("tabular text-2xl font-bold tracking-[-0.04em]", emCurso ? "text-primary" : "text-on-surface")}>
                {formatarHora(atendimento.inicio)}
              </span>
              <span className="tabular inline-flex items-center gap-1 text-xs font-medium text-outline">
                <Clock3 aria-hidden="true" size={11} />
                até {formatarHora(fim)}
              </span>
              <span className="hidden rounded-full border border-card-border bg-surface px-2 py-0.5 text-[0.65rem] font-semibold text-outline sm:inline-flex">
                {atendimento.duracaoMin} min
              </span>
            </div>

            <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <Avatar nome={atendimento.paciente} tamanho="sm" tom={emCurso ? "marca" : "neutro"} className={emCurso ? "ring-2 ring-primary-fixed-dim ring-offset-2 ring-offset-selecao" : undefined} />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/pacientes/${atendimento.pacienteId}`}
                    className="inline-flex min-h-6 min-w-0 items-center text-[0.98rem] font-semibold break-words text-on-surface transition-colors hover:text-primary hover:underline"
                  >
                    {atendimento.paciente}
                  </Link>
                  <p className="mt-0.5 text-xs text-outline">{atendimento.profissional}</p>
                </div>
                <SituacaoChip situacao={atendimento.situacao} compacto />
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3 py-2.5 text-sm">
                <span className="font-semibold text-on-surface">{atendimento.procedimento}</span>
                {atendimento.valor > 0 ? (
                  <>
                    <span aria-hidden="true" className="size-1 rounded-full bg-outline-variant" />
                    <span className="tabular font-medium text-on-surface-variant">{formatarMoeda(atendimento.valor)}</span>
                  </>
                ) : null}
              </div>

              {atendimento.observacoes ? (
                <p className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 py-2.5 text-xs leading-5 break-words whitespace-pre-line text-outline">
                  {atendimento.observacoes}
                </p>
              ) : null}

              <FocoAposAcao situacao={atendimento.situacao} className="mt-0.5 flex flex-wrap items-start gap-2 rounded-[var(--radius-cartao)]">
                <BotoesSituacao atendimentoId={atendimento.id} situacao={atendimento.situacao} paciente={atendimento.paciente} compacto />
                <Link
                  href={profissionalId ? `/agenda/${atendimento.id}/editar?profissional=${profissionalId}` : `/agenda/${atendimento.id}/editar`}
                  aria-label={`Remarcar ou editar: ${atendimento.paciente}`}
                  className="group/edit inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-[color,background-color,border-color,transform] duration-200 hover:border-primary-fixed-dim hover:bg-selecao hover:text-primary active:translate-y-px"
                >
                  <Pencil aria-hidden="true" size={13} strokeWidth={1.75} className="transition-transform duration-150 group-hover/edit:rotate-[-4deg]" />
                  Remarcar ou editar
                </Link>
                {whatsapp ? (
                  <BotaoWhatsApp href={whatsapp} paraQuem={atendimento.paciente} tamanho="xs">
                    Pedir confirmação
                  </BotaoWhatsApp>
                ) : null}
              </FocoAposAcao>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
