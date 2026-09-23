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
    <ul className="divide-y divide-card-border">
      {prontuarios.map((prontuario) => (
        <li
          key={prontuario.id}
          className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/prontuarios/${prontuario.id}`}
                className="inline-flex min-h-6 items-center font-medium text-on-surface transition-colors hover:text-primary"
              >
                {prontuario.titulo}
              </Link>
              {prontuario.exemplo ? (
                <span className="rounded-[var(--radius-tag)] bg-atencao-fundo px-2 py-0.5 text-xs font-medium text-atencao">
                  exemplo
                </span>
              ) : null}
            </div>

            <p className="mt-1 text-sm text-on-surface-variant">
              {prontuario.paciente}
              {prontuario.contato ? (
                <span className="text-outline"> · {prontuario.contato}</span>
              ) : null}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-outline">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" size={14} strokeWidth={1.75} />
                {formatarData(prontuario.dataRegistro)}
              </span>

              {prontuario.ultimaVersao ? (
                <span className="inline-flex items-center gap-1.5">
                  <History aria-hidden="true" size={14} strokeWidth={1.75} />
                  Versão {prontuario.ultimaVersao.numero} ·{" "}
                  {formatarData(prontuario.ultimaVersao.criadoEm)} às{" "}
                  {formatarHora(prontuario.ultimaVersao.criadoEm)}
                </span>
              ) : null}

              {prontuario.atendimento ? (
                <span>
                  {prontuario.atendimento.procedimento ?? "Atendimento"} ·{" "}
                  {formatarData(prontuario.atendimento.inicio)}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <BotaoLink
              href={`/prontuarios/${prontuario.id}`}
              variante="contorno"
              tamanho="sm"
            >
              <FileText aria-hidden="true" size={16} strokeWidth={1.75} />
              Abrir
            </BotaoLink>
            <BotaoLink
              href={`/prontuarios/${prontuario.id}/editar`}
              variante="secundaria"
              tamanho="sm"
            >
              <History aria-hidden="true" size={16} strokeWidth={1.75} />
              Nova versão
            </BotaoLink>
          </div>
        </li>
      ))}
    </ul>
  );
}
