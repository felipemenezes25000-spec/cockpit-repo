"use client";

import { ArrowRight, CircleCheckBig, ListTodo, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { Prioridade } from "@/lib/dominio";

/** O que o servidor manda de cada pendência — já com a frase do prazo pronta. */
export type PendenciaDoTicker = {
  id: string;
  /** "Pagamento", "Anamnese"… */
  tipo: string;
  paciente: string | null;
  descricao: string;
  prioridade: Prioridade;
  /** "venceu há 3 dias", "prazo hoje", ou nulo sem prazo. */
  prazo: string | null;
  atrasada: boolean;
  destino: string;
};

const PRIORIDADE: Record<Prioridade, string> = {
  alta: "Prioridade alta",
  media: "Prioridade média",
  baixa: "Prioridade baixa",
};

/** Velocidade do letreiro, em px por segundo: dá para ler sem correr atrás. */
const VELOCIDADE = 48;

/** "Ana Paula Ribeiro Lima" → "Ana Lima". */
function nomeCurto(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return partes.length <= 2 ? nome.trim() : `${partes[0]} ${partes[partes.length - 1]}`;
}

function Itens({ pendencias, copia }: { pendencias: PendenciaDoTicker[]; copia?: boolean }) {
  return (
    <ul className={cn("flex shrink-0 items-center", copia && "ticker-copia")} aria-hidden={copia || undefined}>
      {pendencias.map((p) => (
        <li key={p.id} className="ticker-li flex shrink-0 items-center">
          <Link href={p.destino} tabIndex={copia ? -1 : undefined} className="ticker-item group">
            <span aria-hidden="true" className={cn("ticker-ponto", `ticker-ponto-${p.prioridade}`)} />
            <span className="sr-only">{PRIORIDADE[p.prioridade]}: </span>
            <span className="ticker-tipo">{p.tipo}</span>
            {p.paciente ? <strong className="font-semibold text-cabine-texto">{nomeCurto(p.paciente)}</strong> : null}
            <span className="text-cabine-texto-secundario">{p.descricao}</span>
            {p.prazo ? <span className={cn("ticker-prazo", p.atrasada && "ticker-prazo-atrasado")}>{p.prazo}</span> : null}
            <ArrowRight aria-hidden="true" size={13} strokeWidth={2.2} className="ticker-seta" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * O letreiro de pendências no alto de toda tela logada: o que falta fazer
 * passando devagar, da mais urgente para a menos, cada uma um link para onde
 * ela se resolve.
 *
 * Movimento com controle (WCAG 2.2.2): para sozinho com o ponteiro em cima
 * ou com o foco dentro, e o botão ao lado pausa de vez. Com "reduzir
 * movimento", não corre: vira uma faixa que rola de lado. A segunda cópia da
 * lista existe só para o laço não ter emenda — fica fora do leitor de tela e
 * do Tab. Sem pendência, a faixa diz que está tudo em dia.
 */
export function TickerDePendencias({ pendencias, total, altas }: { pendencias: PendenciaDoTicker[]; total: number; altas: number }) {
  const [pausado, setPausado] = useState(false);
  const [duracao, setDuracao] = useState(60);
  const trilho = useRef<HTMLDivElement>(null);
  const janela = useRef<HTMLDivElement>(null);

  // A duração acompanha o tamanho da lista: a velocidade fica sempre a mesma.
  useEffect(() => {
    const primeira = trilho.current?.firstElementChild as HTMLElement | null;
    if (!primeira) return;
    const medir = () => setDuracao(Math.max(24, Math.round(primeira.scrollWidth / VELOCIDADE)));
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(primeira);
    return () => observador.disconnect();
  }, [pendencias]);

  const rotuloTotal = `${total} ${total === 1 ? "pendência" : "pendências"} em aberto${altas > 0 ? `, ${altas} de prioridade alta` : ""}`;

  return (
    <section aria-label="Pendências em aberto" className="ticker sem-impressao">
      <div className="mx-auto flex h-10 w-full max-w-[1680px] items-center gap-2 px-3 sm:gap-3 sm:px-6 xl:px-10 2xl:px-14">
        <Link href="/relacionamento" className="ticker-rotulo" aria-label={`${rotuloTotal}. Abrir o Relacionamento`}>
          <ListTodo aria-hidden="true" size={15} strokeWidth={2.1} />
          <span aria-hidden="true" className="hidden sm:inline">Pendências</span>
          <span aria-hidden="true" className={cn("ticker-contagem", altas > 0 && "ticker-contagem-alta")}>{total}</span>
        </Link>

        {pendencias.length === 0 ? (
          <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-[0.8125rem] text-cabine-texto-secundario">
            <CircleCheckBig aria-hidden="true" size={15} strokeWidth={2} className="shrink-0 text-cabine-texto" />
            Nada pendente agora — tudo em dia.
          </p>
        ) : (
          <>
            <div
              ref={janela}
              className="ticker-janela min-w-0 flex-1"
              onBlur={(evento) => {
                // O Tab rola a janela até o link focado; ao sair, ela volta ao
                // começo para o laço seguir sem emenda.
                if (!evento.currentTarget.contains(evento.relatedTarget as Node | null)) evento.currentTarget.scrollLeft = 0;
              }}
            >
              <div
                ref={trilho}
                data-pausado={pausado || undefined}
                className="ticker-trilho"
                style={{ "--ticker-duracao": `${duracao}s` } as CSSProperties}
              >
                <Itens pendencias={pendencias} />
                <Itens pendencias={pendencias} copia />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPausado((valor) => !valor)}
              aria-pressed={pausado}
              aria-label={pausado ? "Voltar a passar as pendências" : "Parar de passar as pendências"}
              title={pausado ? "Voltar a passar" : "Parar"}
              className={cn("ticker-pausa", pausado && "ring-1 ring-inset ring-cabine-texto/20 bg-white/10 text-cabine-texto")}
            >
              {pausado ? <Play aria-hidden="true" size={14} strokeWidth={2.2} /> : <Pause aria-hidden="true" size={14} strokeWidth={2.2} />}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
