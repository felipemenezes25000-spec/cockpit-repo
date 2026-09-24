"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef } from "react";
import { useAgora } from "@/components/layout/use-agora";
import { ESTILO_SITUACAO } from "@/components/ui/status-chip";
import type { AtendimentoDoAgora } from "@/lib/agora";
import { cn } from "@/lib/cn";
import type { SituacaoAtendimento } from "@/lib/dominio";
import { formatarHora } from "@/lib/format";

/** A cor da hora e da situação em cada cartão; o nome fica sempre em texto. */
const COR: Record<SituacaoAtendimento, string> = {
  agendado: "text-informativo-texto",
  aguardando_confirmacao: "text-atencao",
  confirmado: "text-positivo",
  em_atendimento: "text-cabine-texto",
  concluido: "text-positivo",
  cancelado: "text-negativo",
  ausente: "text-negativo",
};

/**
 * O dia em cartões, na ordem do relógio, com um marcador "agora" entre o que
 * passou e o que vem. Cada cartão diz a hora, a paciente e a situação — em
 * texto e ícone, nunca só na cor. Com muitos horários a fila rola de lado,
 * dentro da cabine, e abre já mostrando a hora atual.
 */
export function FilaDoDia({ atendimentos }: { atendimentos: AtendimentoDoAgora[] }) {
  const agora = useAgora(60_000);
  const faixa = useRef<HTMLOListElement>(null);
  const lista = [...atendimentos].sort((a, b) => a.inicio - b.inicio);

  // O marcador entra antes do primeiro atendimento que ainda não começou.
  const posicaoDoAgora = agora === null ? -1 : (() => {
    const indice = lista.findIndex((a) => a.inicio > agora);
    return indice === -1 ? lista.length : indice;
  })();

  useEffect(() => {
    const caixa = faixa.current;
    const marcador = caixa?.querySelector<HTMLElement>("[data-agora]");
    if (!caixa || !marcador) return;
    caixa.scrollLeft = Math.max(0, marcador.offsetLeft - caixa.clientWidth / 3);
  }, [posicaoDoAgora]);

  if (lista.length === 0) {
    return (
      <p className="text-sm text-cabine-texto-secundario">
        Nenhum atendimento marcado para hoje.{" "}
        <Link href="/agenda/novo" className="font-semibold text-cabine-texto underline underline-offset-4">
          Marcar um horário
        </Link>
      </p>
    );
  }

  const marcador = agora === null ? null : (
    <li data-agora className="flex shrink-0 flex-col items-center justify-center rounded-[var(--radius-controle)] bg-cabine-texto px-3 py-2 text-cabine-profunda">
      <span className="text-[0.625rem] font-bold tracking-[0.08em] uppercase">Agora</span>
      <span className="tabular text-sm font-bold">{formatarHora(new Date(agora))}</span>
    </li>
  );

  return (
    <ol
      ref={faixa}
      aria-label="Atendimentos de hoje, na ordem do relógio"
      className="rolagem-discreta -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2"
    >
      {lista.map((atendimento, indice) => {
        const estilo = ESTILO_SITUACAO[atendimento.situacao];
        const Icone = estilo.icone;
        const emCurso = atendimento.situacao === "em_atendimento";
        const encerrado = atendimento.situacao === "cancelado" || atendimento.situacao === "ausente";
        const rotulo = atendimento.situacao === "ausente" ? "Não compareceu" : estilo.rotulo;
        return (
          <Fragment key={atendimento.id}>
            {indice === posicaoDoAgora ? marcador : null}
            <li
              className="dashboard-stagger min-w-[9.5rem] flex-1 snap-start"
              style={{ animationDelay: `${Math.min(indice * 40, 320)}ms` }}
            >
              <Link
                href="/agenda"
                className={cn(
                  "flex h-full flex-col gap-0.5 rounded-[var(--radius-controle)] border px-3 py-2.5 transition-colors",
                  emCurso
                    ? "border-cabine-texto bg-cabine-profunda"
                    : encerrado
                      ? "border-dashed border-negativo bg-surface hover:bg-negativo-fundo"
                      : "border-transparent bg-surface hover:bg-selecao",
                )}
              >
                <span className={cn("tabular text-[0.8125rem] font-bold", COR[atendimento.situacao])}>
                  {formatarHora(new Date(atendimento.inicio))}
                </span>
                <span
                  className={cn(
                    "truncate text-sm font-semibold",
                    emCurso ? "text-cabine-texto" : encerrado ? "text-on-surface-variant line-through" : "text-on-surface",
                  )}
                >
                  {atendimento.paciente}
                </span>
                <span className={cn("flex min-w-0 items-center gap-1 text-[0.72rem] font-semibold", COR[atendimento.situacao])} title={rotulo}>
                  <Icone aria-hidden="true" size={12} strokeWidth={2.2} className="shrink-0" />
                  <span className="truncate">{rotulo}</span>
                </span>
              </Link>
            </li>
          </Fragment>
        );
      })}
      {posicaoDoAgora === lista.length ? marcador : null}
    </ol>
  );
}
