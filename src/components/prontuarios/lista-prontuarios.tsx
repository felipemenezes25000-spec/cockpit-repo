import { CalendarDays, FileText, History, SearchX } from "lucide-react";
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
    <ul className="flex flex-col gap-3.5">
      {prontuarios.map((prontuario) => (
        <li
          key={prontuario.id}
          className="premium-interactive relative isolate overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 sm:p-5"
        >

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-selecao text-primary">
                <FileText aria-hidden="true" size={20} strokeWidth={1.65} />
              </span>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/prontuarios/${prontuario.id}`}
                    className="inline-flex min-h-6 items-center text-[0.95rem] font-semibold text-on-surface transition-colors hover:text-primary hover:underline"
                  >
                    {prontuario.titulo}
                  </Link>
                  {prontuario.exemplo ? (
                    <span className="rounded-full border border-atencao-borda bg-atencao-fundo px-2 py-0.5 text-[0.68rem] font-medium text-atencao">
                      exemplo
                    </span>
                  ) : null}
                </div>

                <p className="mt-1.5 text-sm font-medium text-on-surface-variant">
                  {prontuario.paciente}
                  {prontuario.contato ? <span className="font-normal text-outline"> · {prontuario.contato}</span> : null}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-outline">
                  <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5">
                    <CalendarDays aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
                    {formatarData(prontuario.dataRegistro)}
                  </span>

                  {prontuario.ultimaVersao ? (
                    <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5">
                      <History aria-hidden="true" size={13} strokeWidth={1.75} className="text-primary" />
                      Versão {prontuario.ultimaVersao.numero} · {formatarData(prontuario.ultimaVersao.criadoEm)} às {formatarHora(prontuario.ultimaVersao.criadoEm)}
                    </span>
                  ) : null}

                  {prontuario.atendimento ? (
                    <span className="inline-flex min-h-7 items-center rounded-full border border-card-border bg-surface px-2.5">
                      {prontuario.atendimento.procedimento ?? "Atendimento"} · {formatarData(prontuario.atendimento.inicio)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
              <BotaoLink href={`/prontuarios/${prontuario.id}`} variante="contorno" tamanho="sm">
                <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
                Abrir
              </BotaoLink>
              <BotaoLink href={`/prontuarios/${prontuario.id}/editar`} variante="secundaria" tamanho="sm">
                <History aria-hidden="true" size={16} strokeWidth={1.75} />
                Nova versão
              </BotaoLink>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
