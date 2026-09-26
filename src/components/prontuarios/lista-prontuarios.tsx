import { CalendarDays, ChevronRight, FileText, History, SearchX } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarData, formatarHora } from "@/lib/format";
import type { ProntuarioDaLista } from "@/server/consultas/prontuarios";

export function ListaProntuarios({
  prontuarios,
  busca,
}: {
  prontuarios: ProntuarioDaLista[];
  busca: string;
}) {
  if (prontuarios.length === 0) {
    return (
      <EstadoVazio
        icone={busca ? SearchX : FileText}
        titulo={busca ? "Nenhum prontuário encontrado" : "Nenhum prontuário registrado"}
        descricao={
          busca
            ? "Tente buscar por outro nome de paciente ou pelo título do registro."
            : "O primeiro registro clínico pode ser criado pela ficha da paciente ou por aqui."
        }
        acao={
          busca ? null : (
            <BotaoLink href="/prontuarios/novo" variante="primaria" tamanho="sm">
              <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
              Novo prontuário
            </BotaoLink>
          )
        }
      />
    );
  }

  return (
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="rotulo text-primary">Registros encontrados</p>
          <p className="mt-1 break-words text-xs leading-5 text-outline">Cada nova edição preserva o histórico anterior.</p>
        </div>
        <span className="max-w-full rounded-full border border-card-border bg-surface-container-low px-2.5 py-1 text-xs font-medium text-outline">
          Mais recentes primeiro
        </span>
      </div>

      <ul className="flex min-w-0 flex-col gap-3.5">
        {prontuarios.map((prontuario, indice) => (
          <li
            key={prontuario.id}
            style={{ animationDelay: `${Math.min(indice * 45, 240)}ms` }}
            className="dashboard-stagger premium-interactive group relative isolate min-w-0 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-card-border bg-surface p-4 sm:p-5"
          >
            <span aria-hidden="true" className="absolute inset-y-4 left-0 w-1 rounded-r-full bg-primary-fixed-dim transition-colors duration-200 group-hover:bg-primary-container" />

            <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3.5 pl-1">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-gradient-to-br from-surface to-selecao text-primary shadow-[0_14px_26px_-22px_rgba(8,84,160,.6)]">
                  <FileText aria-hidden="true" size={21} strokeWidth={1.7} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/prontuarios/${prontuario.id}`}
                      className="inline-flex min-h-6 max-w-full items-center break-words text-[1rem] font-bold tracking-[-0.015em] text-on-surface transition-colors after:absolute after:inset-0 after:content-[''] hover:text-primary"
                    >
                      {prontuario.titulo}
                    </Link>
                    {prontuario.exemplo ? (
                      <span className="rounded-full border border-atencao-borda bg-atencao-fundo px-2 py-0.5 text-[0.68rem] font-medium text-atencao">
                        exemplo
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1.5 min-w-0 break-words text-sm font-semibold leading-5 text-on-surface-variant">
                    {prontuario.paciente}
                    {prontuario.contato ? <span className="font-normal text-outline"> · {prontuario.contato}</span> : null}
                  </p>

                  <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs text-outline">
                    <span className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-2.5">
                      <CalendarDays aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0 text-primary" />
                      <span className="min-w-0 break-words">Registro {formatarData(prontuario.dataRegistro)}</span>
                    </span>

                    {prontuario.ultimaVersao ? (
                      <span className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-[var(--radius-cartao)] border border-primary-fixed bg-selecao px-2.5 font-medium text-primary">
                        <History aria-hidden="true" size={13} strokeWidth={1.75} className="shrink-0" />
                        <span className="min-w-0 break-words">Versão {prontuario.ultimaVersao.numero} · {formatarData(prontuario.ultimaVersao.criadoEm)} às {formatarHora(prontuario.ultimaVersao.criadoEm)}</span>
                      </span>
                    ) : null}

                    {prontuario.atendimento ? (
                      <span className="inline-flex min-h-7 max-w-full items-center rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-2.5 py-1">
                        <span className="min-w-0 break-words">{prontuario.atendimento.procedimento ?? "Atendimento"} · {formatarData(prontuario.atendimento.inicio)}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="relative z-[1] grid w-full min-w-0 grid-cols-2 gap-2 pl-1 sm:w-auto lg:shrink-0 lg:pl-0">
                <BotaoLink href={`/prontuarios/${prontuario.id}`} variante="contorno" tamanho="sm" className="w-full">
                  <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
                  Abrir
                </BotaoLink>
                <BotaoLink href={`/prontuarios/${prontuario.id}/editar`} variante="secundaria" tamanho="sm" className="w-full">
                  <History aria-hidden="true" size={16} strokeWidth={1.75} />
                  Nova versão
                </BotaoLink>
                <span aria-hidden="true" className="hidden size-9 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline transition-[transform,color,border-color,background-color] group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary xl:flex">
                  <ChevronRight size={16} />
                </span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
