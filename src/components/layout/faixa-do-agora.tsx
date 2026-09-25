"use client";

import { Activity, ArrowRight, CalendarClock, CalendarX2, Clock3 } from "lucide-react";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { SituacaoChip } from "@/components/ui/status-chip";
import { descreverEspera, descreverRestante, retratoDoAgora, type AtendimentoDoAgora } from "@/lib/agora";
import { cn } from "@/lib/cn";
import { formatarHora } from "@/lib/format";
import { useAgora } from "./use-agora";

/** A faixa do agora: logo abaixo da barra de módulos, em toda tela. */
export function FaixaDoAgora({ atendimentos }: { atendimentos: AtendimentoDoAgora[] | null }) {
  const agora = useAgora();

  return (
    <section aria-label="Agora na clínica" className="relative border-b border-card-border bg-surface/82 shadow-[0_10px_30px_-28px_rgba(8,41,76,.48)] backdrop-blur-xl">
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-fixed-dim/65 to-transparent" />
      <div className="mx-auto flex min-h-[var(--altura-faixa)] w-full max-w-[1680px] items-center gap-3 px-3 py-2 sm:px-6 xl:px-10 2xl:px-14">
        <Conteudo atendimentos={atendimentos} agora={agora} />
        <Link
          href="/agenda"
          className="group premium-interactive ml-auto inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-2.5 text-sm font-semibold text-primary shadow-[0_8px_20px_-18px_rgba(8,84,160,.55)] hover:border-primary-fixed-dim hover:bg-primary-fixed"
        >
          <span className="hidden min-[360px]:inline">Ver o dia</span>
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

  return <Retrato atendimentos={atendimentos} agora={agora} ativos={ativos} />;
}

function Retrato({ atendimentos, agora, ativos }: { atendimentos: AtendimentoDoAgora[]; agora: number; ativos: number }) {
  const retrato = retratoDoAgora(atendimentos, agora);
  const { emAtendimento, proxima, depois } = retrato;
  const linha = useRef<HTMLDivElement>(null);
  const [cortes, setCortes] = useState(0);
  const [medida, setMedida] = useState(0);
  const maximo = emAtendimento && proxima ? 4 : 3;
  const assinatura = [emAtendimento?.id, proxima?.id, depois?.id, retrato.faltamMin, retrato.emMin].join("|");
  const ultimaAssinatura = useRef(assinatura);

  useLayoutEffect(() => {
    if (ultimaAssinatura.current !== assinatura) {
      ultimaAssinatura.current = assinatura;
      setCortes(0);
      return;
    }
    const caixa = linha.current;
    if (!caixa || cortes >= maximo) return;
    const cortada = Array.from(caixa.querySelectorAll<HTMLElement>("[data-frase]")).some(
      (frase) => frase.getClientRects().length > 0 && frase.scrollWidth > frase.clientWidth + 1,
    );
    if (cortada) setCortes(cortes + 1);
  }, [assinatura, cortes, maximo, medida]);

  useEffect(() => {
    const caixa = linha.current;
    if (!caixa || typeof ResizeObserver === "undefined") return;
    let largura = caixa.clientWidth;
    const observador = new ResizeObserver(() => {
      if (Math.abs(caixa.clientWidth - largura) < 1) return;
      largura = caixa.clientWidth;
      setCortes(0);
      setMedida((vez) => vez + 1);
    });
    observador.observe(caixa);
    return () => observador.disconnect();
  }, []);

  return (
    <div ref={linha} className="flex min-w-0 flex-1 items-center gap-3 lg:gap-4">
      <p className="flex shrink-0 items-center gap-2 rounded-[var(--radius-controle)] border border-primary-fixed bg-gradient-to-b from-surface to-selecao px-2.5 py-1.5 shadow-[0_8px_20px_-18px_rgba(8,84,160,.5)]">
        <span aria-hidden="true" className="now-pulse size-2 rounded-full bg-primary-container shadow-[0_0_0_4px_rgba(10,110,209,.10)]" />
        <span className="rotulo hidden text-primary sm:inline">Agora</span>
        <span className="tabular text-sm font-bold tracking-[-0.015em] text-on-surface">{formatarHora(new Date(agora))}</span>
      </p>

      <Separador />

      {emAtendimento ? (
        <div className="flex min-w-0 items-center gap-3">
          <Frase icone={<Activity aria-hidden="true" size={16} strokeWidth={1.8} className="text-primary-container" />}>
            <span className="hidden text-on-surface-variant md:inline">Em atendimento: </span>
            <strong className="font-semibold text-on-surface">{nomeCurto(emAtendimento.paciente)}</strong>
            <span className="text-on-surface-variant">, {descreverRestante(retrato.faltamMin)}</span>
          </Frase>
          {cortes < 2 ? (
            <span aria-hidden="true" className="barra barra-fina barra-viva hidden w-20 shrink-0 xl:block">
              <span style={{ width: `${Math.round(retrato.progresso * 100)}%` }} />
            </span>
          ) : null}
        </div>
      ) : null}

      {proxima && !(emAtendimento && cortes >= 4) ? (
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
            {cortes < 3 ? (
              <span className="hidden shrink-0 lg:inline-flex">
                <SituacaoChip situacao={proxima.situacao} compacto />
              </span>
            ) : null}
          </div>
        </>
      ) : !emAtendimento && !proxima ? (
        <Frase icone={<CalendarClock aria-hidden="true" size={16} strokeWidth={1.8} />}>
          <span className="text-on-surface-variant">
            {ativos === 0 ? "Nenhum atendimento marcado para hoje." : "Nenhum outro atendimento hoje."}
          </span>
        </Frase>
      ) : null}

      {depois && cortes < 1 ? (
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
      <span data-frase className="min-w-0 truncate">{children}</span>
    </p>
  );
}

function Separador({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("h-6 w-px shrink-0 bg-gradient-to-b from-transparent via-card-border to-transparent", className)} />;
}

/** "Ana Paula Ribeiro Lima" → "Ana Lima": cabe na faixa sem perder quem é. */
function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length <= 2 ? nome.trim() : `${partes[0]} ${partes[partes.length - 1]}`;
}
