"use client";

import { ArrowDown, CalendarCheck, CheckCircle2, Sparkles, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { ROTULO_ETAPA, type EtapaLead } from "@/lib/captacao";
import type { EtapaDoPainel } from "@/server/consultas/captacao";
import estilos from "./funil-vivo.module.css";

const ICONE = {
  novo: UsersRound,
  qualificado: Sparkles,
  agendamento: CalendarCheck,
  ganho: CheckCircle2,
} as const;

const LARGURA = [100, 82, 64, 47] as const;

function numero(valor: number): string {
  return new Intl.NumberFormat("pt-BR").format(valor);
}

export function FunilVivo({ etapas }: { etapas: EtapaDoPainel[] }) {
  const [ativa, setAtiva] = useState<EtapaLead>("novo");
  const selecionada = useMemo(
    () => etapas.find((etapa) => etapa.etapa === ativa) ?? etapas[0],
    [ativa, etapas],
  );

  if (etapas.length === 0) return null;

  return (
    <section className={`cabine ${estilos.palco} relative min-h-[34rem] overflow-hidden p-4 sm:p-6`} aria-labelledby="titulo-funil">
      <div aria-hidden="true" className={`${estilos.luz} ${estilos.luzA}`} />
      <div aria-hidden="true" className={`${estilos.luz} ${estilos.luzB}`} />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="rotulo">Funil de captação e vendas</p>
          <h2 id="titulo-funil" className="mt-2 text-xl font-semibold tracking-[-0.025em] text-cabine-texto sm:text-2xl">
            Da atenção até a venda
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-6 text-cabine-texto-secundario">
            Toque em cada etapa para ver volume, conversão e o esforço que ainda falta para a meta.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-[var(--radius-controle)] border border-cabine-linha px-3 py-2 text-xs font-semibold text-cabine-texto-secundario">
          <span className="now-pulse size-2 rounded-full bg-cabine-texto" />
          dados do período
        </span>
      </div>

      <div className="relative z-10 mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_13.5rem] xl:items-center">
        <div className="relative mx-auto flex w-full max-w-[38rem] flex-col items-center gap-2 py-3 sm:py-5">
          <div aria-hidden="true" className={estilos.eixo} />
          {etapas.map((etapa, indice) => {
            const Icone = ICONE[etapa.etapa];
            const atual = selecionada?.etapa === etapa.etapa;
            return (
              <div key={etapa.etapa} className="relative flex w-full flex-col items-center">
                <button
                  type="button"
                  onClick={() => setAtiva(etapa.etapa)}
                  aria-pressed={atual}
                  aria-label={`${ROTULO_ETAPA[etapa.etapa]}: ${numero(etapa.volume)}`}
                  className={`${estilos.segmento} group relative min-h-[5.6rem] overflow-hidden px-5 py-3 text-left text-cabine-texto focus-visible:z-20`}
                  style={{ width: `${LARGURA[indice] ?? 47}%` }}
                >
                  <span aria-hidden="true" className={estilos.brilho} />
                  <span className="relative z-10 flex h-full items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[0.68rem] font-semibold tracking-[0.08em] text-cabine-texto-secundario uppercase">
                        {ROTULO_ETAPA[etapa.etapa]}
                      </span>
                      <span className="mt-1 block text-2xl font-semibold tracking-[-0.035em] tabular-nums sm:text-3xl">
                        {numero(etapa.volume)}
                      </span>
                    </span>
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-white/40 bg-white/10 transition-transform duration-200 group-hover:scale-105">
                      <Icone aria-hidden="true" size={20} strokeWidth={1.8} />
                    </span>
                  </span>
                </button>
                {indice < etapas.length - 1 ? (
                  <span aria-hidden="true" className="relative z-10 -my-1 flex size-7 items-center justify-center rounded-full border border-cabine-linha bg-cabine-profunda text-cabine-texto">
                    <ArrowDown size={14} strokeWidth={2} />
                  </span>
                ) : null}
              </div>
            );
          })}

          <span aria-hidden="true" className={`${estilos.particula}`} />
          <span aria-hidden="true" className={`${estilos.particula} ${estilos.particula2}`} />
          <span aria-hidden="true" className={`${estilos.particula} ${estilos.particula3}`} />
        </div>

        {selecionada ? (
          <aside className="rounded-[var(--radius-painel)] border border-cabine-linha bg-cabine-profunda/65 p-4 xl:self-stretch">
            <p className="rotulo">Etapa selecionada</p>
            <p className="mt-2 text-base font-semibold text-cabine-texto">{ROTULO_ETAPA[selecionada.etapa]}</p>
            <p className="numero mt-4 text-cabine-texto">{numero(selecionada.volume)}</p>
            <p className="mt-1 text-xs text-cabine-texto-secundario">movimentações no período</p>

            <div className="mt-5 border-t border-cabine-linha pt-4">
              <span className="block text-xs text-cabine-texto-secundario">Conversão da etapa</span>
              <strong className="mt-1 block text-xl font-semibold tabular-nums text-cabine-texto">
                {selecionada.conversao === null ? "—" : `${selecionada.conversao.toLocaleString("pt-BR")}%`}
              </strong>
            </div>

            <div className="mt-4 border-t border-cabine-linha pt-4">
              <span className="block text-xs text-cabine-texto-secundario">Necessário a partir de agora</span>
              <strong className="mt-1 block text-xl font-semibold tabular-nums text-cabine-texto">
                +{numero(selecionada.necessarioAgora)}
              </strong>
              <p className="mt-1 text-xs leading-5 text-cabine-texto-secundario">para alimentar o restante da meta com as premissas atuais.</p>
            </div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}
