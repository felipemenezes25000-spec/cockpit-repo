"use client";

import { Activity, CalendarCheck2, Clock3 } from "lucide-react";
import { useAgora } from "@/components/layout/use-agora";
import { ESTILO_SITUACAO } from "@/components/ui/status-chip";
import { descreverEspera, descreverRestante, retratoDoAgora, type AtendimentoDoAgora } from "@/lib/agora";
import { cn } from "@/lib/cn";
import { capitalizar, formatarHora } from "@/lib/format";

const hora = (instante: number) => formatarHora(new Date(instante));

/**
 * O "agora" dentro da cabine da Visão Geral: quem está em atendimento e
 * quanto falta, ou quem é a próxima e em quanto tempo. A hora é lida só no
 * navegador; antes disso, mostra o total do dia.
 */
export function AgoraNaCabine({ atendimentos, className }: { atendimentos: AtendimentoDoAgora[]; className?: string }) {
  const agora = useAgora();
  const ativos = atendimentos.filter((a) => a.situacao !== "cancelado").length;

  if (agora === null) {
    return (
      <div className={cn("min-w-0", className)}>
        <p className="rotulo">Hoje</p>
        <p className="numero-sm mt-2">
          {ativos} {ativos === 1 ? "atendimento" : "atendimentos"}
        </p>
      </div>
    );
  }

  const { emAtendimento, proxima, depois, progresso, faltamMin, emMin } = retratoDoAgora(atendimentos, agora);

  if (emAtendimento) {
    const fim = emAtendimento.inicio + emAtendimento.duracaoMin * 60_000;
    return (
      <div className={cn("min-w-0", className)}>
        <p className="rotulo flex items-center gap-2">
          <Activity aria-hidden="true" size={14} strokeWidth={2.2} />
          Em atendimento
        </p>
        <p className="numero-sm mt-2 truncate">{emAtendimento.paciente}</p>
        <p className="mt-0.5 truncate text-sm text-cabine-texto-secundario">
          {emAtendimento.procedimento ? `${emAtendimento.procedimento} · ` : ""}até <span className="tabular">{hora(fim)}</span>
        </p>
        <span
          className="barra mt-4"
          role="img"
          aria-label={`${Math.round(progresso * 100)}% do tempo previsto já passou`}
        >
          <span style={{ width: `${Math.round(progresso * 100)}%` }} />
        </span>
        <p className="mt-2 text-sm font-semibold">{capitalizar(descreverRestante(faltamMin))}</p>
        {proxima ? (
          <p className="mt-4 truncate text-sm text-cabine-texto-secundario">
            Próxima: <strong className="font-semibold text-cabine-texto">{proxima.paciente}</strong> às{" "}
            <span className="tabular">{hora(proxima.inicio)}</span>, {descreverEspera(emMin ?? 0)}
          </p>
        ) : null}
      </div>
    );
  }

  if (proxima) {
    const situacao = ESTILO_SITUACAO[proxima.situacao];
    const Icone = situacao.icone;
    return (
      <div className={cn("min-w-0", className)}>
        <p className="rotulo flex items-center gap-2">
          <Clock3 aria-hidden="true" size={14} strokeWidth={2.2} />
          Próxima
        </p>
        <p className="numero-sm mt-2 truncate">{proxima.paciente}</p>
        <p className="mt-1 text-sm">
          às <span className="tabular font-semibold">{hora(proxima.inicio)}</span>,{" "}
          <span className="font-semibold">{descreverEspera(emMin ?? 0)}</span>
        </p>
        <p className="mt-0.5 truncate text-sm text-cabine-texto-secundario">{proxima.procedimento}</p>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cabine-linha px-2.5 py-0.5 text-xs font-semibold">
          <Icone aria-hidden="true" size={13} strokeWidth={2} />
          {situacao.rotulo}
        </p>
        {depois ? (
          <p className="mt-4 truncate text-sm text-cabine-texto-secundario">
            Depois: <strong className="font-semibold text-cabine-texto">{depois.paciente}</strong> às{" "}
            <span className="tabular">{hora(depois.inicio)}</span>
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <p className="rotulo flex items-center gap-2">
        <CalendarCheck2 aria-hidden="true" size={14} strokeWidth={2.2} />
        Agora
      </p>
      <p className="numero-sm mt-2">Nada pela frente hoje</p>
      <p className="mt-1 text-sm text-cabine-texto-secundario">
        {ativos === 0 ? "Nenhum atendimento marcado para hoje." : "Os atendimentos de hoje já passaram."}
      </p>
    </div>
  );
}
