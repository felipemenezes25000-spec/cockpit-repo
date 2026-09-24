"use client";

import { Activity, ArrowRight, CalendarClock, CalendarX2, Clock3 } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SituacaoChip } from "@/components/ui/status-chip";
import { descreverEspera, descreverRestante, retratoDoAgora, type AtendimentoDoAgora } from "@/lib/agora";
import { cn } from "@/lib/cn";
import { formatarHora } from "@/lib/format";
import { useAgora } from "./use-agora";

/**
 * A faixa do agora: logo abaixo da barra de módulos, em toda tela.
 *
 * Três frases lado a lado — quem está em atendimento, quem é a próxima e quem
 * vem depois — e um atalho para o dia inteiro. Prazo vai escrito ("em 53 min",
 * "faltam 18 min"), nunca em mostrador. A hora é lida só no navegador.
 */
export function FaixaDoAgora({ atendimentos }: { atendimentos: AtendimentoDoAgora[] | null }) {
  const agora = useAgora();

  return (
    <section aria-label="Agora na clínica" className="border-b border-card-border bg-surface">
      <div className="mx-auto flex min-h-[var(--altura-faixa)] w-full max-w-[1600px] items-center gap-3 px-3 py-2 sm:px-6 xl:px-10 2xl:px-14">
        <Conteudo atendimentos={atendimentos} agora={agora} />
        <Link
          href="/agenda"
          className="group ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-controle)] px-2.5 text-sm font-semibold text-primary transition-colors hover:bg-selecao"
        >
          Ver o dia
          <ArrowRight aria-hidden="true" size={15} strokeWidth={1.9} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </section>
  );
}

function Conteudo({ atendimentos, agora }: { atendimentos: AtendimentoDoAgora[] | null; agora: number | null }) {
  if (atendimentos === null) {
    return (
      <Frase icone={<CalendarX2 aria-hidden="true" size={16} strokeWidth={1.8} />}>
        <span className="text-on-surface-variant">Não foi possível ler a agenda de hoje agora.</span>
      </Frase>
    );
  }

  const ativos = atendimentos.filter((a) => a.situacao !== "cancelado").length;

  // Antes de montar não há hora: mostra só o que não depende do relógio.
  if (agora === null) {
    return (
      <Frase icone={<CalendarClock aria-hidden="true" size={16} strokeWidth={1.8} />}>
        <span className="text-on-surface-variant">
          Hoje: <strong className="font-semibold text-on-surface">{ativos}</strong>{" "}
          {ativos === 1 ? "atendimento" : "atendimentos"}
        </span>
      </Frase>
    );
  }

  const retrato = retratoDoAgora(atendimentos, agora);
  const { emAtendimento, proxima, depois } = retrato;

  return (
    <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
      <p className="flex shrink-0 items-center gap-2">
        <span aria-hidden="true" className="now-pulse size-2 rounded-full bg-primary-container" />
        <span className="rotulo hidden sm:inline">Agora</span>
        <span className="tabular text-sm font-bold text-on-surface">{formatarHora(new Date(agora))}</span>
      </p>

      <Separador />

      {emAtendimento ? (
        <div className="flex min-w-0 items-center gap-3">
          <Frase icone={<Activity aria-hidden="true" size={16} strokeWidth={1.8} className="text-primary-container" />}>
            <span className="hidden text-on-surface-variant md:inline">Em atendimento: </span>
            <strong className="font-semibold text-on-surface">{nomeCurto(emAtendimento.paciente)}</strong>
            <span className="text-on-surface-variant">, {descreverRestante(retrato.faltamMin)}</span>
          </Frase>
          <span aria-hidden="true" className="barra barra-fina hidden w-20 shrink-0 xl:block">
            <span style={{ width: `${Math.round(retrato.progresso * 100)}%` }} />
          </span>
        </div>
      ) : null}

      {proxima ? (
        <>
          {emAtendimento ? <Separador className="hidden md:block" /> : null}
          <div className={cn("min-w-0 items-center gap-2", emAtendimento ? "hidden md:flex" : "flex")}>
            <Frase icone={<Clock3 aria-hidden="true" size={16} strokeWidth={1.8} className="text-primary" />}>
              <span className="text-on-surface-variant">Próxima: </span>
              <strong className="font-semibold text-on-surface">{nomeCurto(proxima.paciente)}</strong>
              <span className="text-on-surface-variant">
                {" "}às <span className="tabular">{formatarHora(new Date(proxima.inicio))}</span>,{" "}
                <span className={cn((retrato.emMin ?? 0) < 0 && "font-semibold text-atencao")}>{descreverEspera(retrato.emMin ?? 0)}</span>
              </span>
            </Frase>
            <SituacaoChip situacao={proxima.situacao} compacto className="hidden shrink-0 lg:inline-flex" />
          </div>
        </>
      ) : !emAtendimento ? (
        <Frase icone={<CalendarClock aria-hidden="true" size={16} strokeWidth={1.8} />}>
          <span className="text-on-surface-variant">
            {ativos === 0 ? "Nenhum atendimento marcado para hoje." : "Nenhum outro atendimento hoje."}
          </span>
        </Frase>
      ) : null}

      {depois ? (
        <>
          <Separador className="hidden xl:block" />
          <div className="hidden min-w-0 xl:flex">
            <Frase>
              <span className="text-on-surface-variant">Depois: </span>
              <strong className="font-semibold text-on-surface">{nomeCurto(depois.paciente)}</strong>
              <span className="text-on-surface-variant">
                {" "}às <span className="tabular">{formatarHora(new Date(depois.inicio))}</span>
              </span>
            </Frase>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Frase({ icone, children }: { icone?: ReactNode; children: ReactNode }) {
  return (
    <p className="flex min-w-0 items-center gap-2 text-sm">
      {icone ? <span className="flex shrink-0 text-outline">{icone}</span> : null}
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

function Separador({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-6 w-px shrink-0 bg-card-border", className)} />;
}

/** "Ana Paula Ribeiro Lima" → "Ana Lima": cabe na faixa sem perder quem é. */
function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length <= 2 ? nome.trim() : `${partes[0]} ${partes[partes.length - 1]}`;
}
