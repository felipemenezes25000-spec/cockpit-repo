"use client";

import { CalendarDays, ChevronLeft, ChevronRight, LoaderCircle, Stethoscope } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { enderecoDaAgenda } from "./parametros-agenda";
import { classeDeEntrada } from "@/components/ui/field";
import { dataValida } from "@/lib/dates";
import { cn } from "@/lib/cn";
import type { OpcaoProfissional } from "@/server/consultas/agenda";

export const ESPERA_NAVEGACAO_MS = 500;

const semAssinatura = () => () => {};

function useComJavaScript(): boolean {
  return useSyncExternalStore(semAssinatura, () => true, () => false);
}

function IconeDaSeta({ direcao }: { direcao: "anterior" | "proximo" }) {
  const { pending } = useLinkStatus();
  if (pending) return <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />;
  const Icone = direcao === "anterior" ? ChevronLeft : ChevronRight;
  return <Icone aria-hidden="true" size={18} strokeWidth={1.75} />;
}

export function NavegacaoDia({
  dia,
  anterior,
  proximo,
  ehHoje,
  profissional = null,
  profissionais = [],
}: {
  dia: string;
  anterior: string;
  proximo: string;
  ehHoje: boolean;
  profissional?: string | null;
  profissionais?: OpcaoProfissional[];
}) {
  const router = useRouter();
  const comJavaScript = useComJavaScript();
  const [pendente, iniciar] = useTransition();
  const relogio = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setaAcionada = useRef(false);
  const [valor, setValor] = useState(dia);
  const [filtro, setFiltro] = useState(profissional);
  const [daUrl, setDaUrl] = useState({ dia, profissional });
  if (dia !== daUrl.dia || profissional !== daUrl.profissional) {
    setDaUrl({ dia, profissional });
    setValor(dia);
    setFiltro(profissional);
  }

  useEffect(() => () => {
    if (relogio.current) clearTimeout(relogio.current);
  }, []);

  function navegar(novoDia: string, novoProfissional: string | null) {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = null;
    if (!dataValida(novoDia)) return;
    if (novoDia === dia && novoProfissional === profissional) return;
    iniciar(() => router.push(enderecoDaAgenda(novoDia, novoProfissional)));
  }

  function agendarNavegacao(novoDia: string) {
    if (relogio.current) clearTimeout(relogio.current);
    relogio.current = setTimeout(() => navegar(novoDia, filtro), ESPERA_NAVEGACAO_MS);
  }

  const seta =
    "group flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-on-surface-variant shadow-[0_5px_14px_-12px_rgba(7,57,112,.6)] transition-[transform,background-color,border-color,color,box-shadow] duration-150 hover:-translate-y-px hover:border-primary-fixed-dim hover:bg-selecao hover:text-primary hover:shadow-[0_10px_20px_-14px_rgba(7,57,112,.55)] active:translate-y-px active:scale-[0.97]";

  const temFiltro = profissionais.length > 1;

  return (
    <form
      method="get"
      action="/agenda"
      aria-label="Escolher o dia da agenda"
      aria-busy={pendente || undefined}
      onSubmit={(evento) => {
        evento.preventDefault();
        navegar(valor, filtro);
      }}
      className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
    >
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
        <div>
          <label htmlFor="agenda-dia" className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-bold tracking-[0.07em] text-outline uppercase">
            <CalendarDays aria-hidden="true" size={13} className="text-primary" />
            Data
          </label>
          <div className="flex items-center gap-2">
            <Link
              href={enderecoDaAgenda(anterior, profissional)}
              aria-label="Dia anterior"
              onPointerDown={() => {
                setaAcionada.current = true;
              }}
              className={seta}
            >
              <span className="transition-transform duration-150 group-hover:-translate-x-0.5"><IconeDaSeta direcao="anterior" /></span>
            </Link>

            <div className="relative">
              {ehHoje ? <span aria-hidden="true" className="absolute -top-1 -right-1 z-10 size-2.5 rounded-full border-2 border-surface bg-primary-container shadow-sm" /> : null}
              <input
                id="agenda-dia"
                type="date"
                name="dia"
                value={valor}
                onChange={(evento) => {
                  setValor(evento.target.value);
                  agendarNavegacao(evento.target.value);
                }}
                onFocus={() => {
                  setaAcionada.current = false;
                }}
                onBlur={() => {
                  if (setaAcionada.current) {
                    setaAcionada.current = false;
                    if (relogio.current) clearTimeout(relogio.current);
                    relogio.current = null;
                    return;
                  }
                  navegar(valor, filtro);
                }}
                aria-label="Escolher o dia"
                className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "tabular min-w-[9.5rem] bg-surface font-semibold")}
              />
            </div>

            <Link
              href={enderecoDaAgenda(proximo, profissional)}
              aria-label="Dia seguinte"
              onPointerDown={() => {
                setaAcionada.current = true;
              }}
              className={seta}
            >
              <span className="transition-transform duration-150 group-hover:translate-x-0.5"><IconeDaSeta direcao="proximo" /></span>
            </Link>
          </div>
        </div>

        {temFiltro ? (
          <div className="sm:min-w-64">
            <label htmlFor="agenda-profissional" className="mb-1.5 flex items-center gap-1.5 text-[0.68rem] font-bold tracking-[0.07em] text-outline uppercase">
              <Stethoscope aria-hidden="true" size={13} className="text-primary" />
              Profissional
            </label>
            <select
              id="agenda-profissional"
              name="profissional"
              value={filtro ?? ""}
              onChange={(evento) => {
                const escolhido = evento.target.value || null;
                setFiltro(escolhido);
                navegar(valor, escolhido);
              }}
              aria-label="Filtrar por quem atende"
              className={cn(classeDeEntrada({ altura: "compacta" }), "max-w-full bg-surface font-medium")}
            >
              <option value="">Todas as profissionais</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </select>
          </div>
        ) : profissional ? (
          <input type="hidden" name="profissional" value={profissional} />
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {comJavaScript ? null : (
          <button type="submit" className="inline-flex h-10 items-center rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-sm font-semibold text-primary transition-[transform,background-color] hover:bg-selecao active:translate-y-px">
            Ver
          </button>
        )}

        {!ehHoje ? (
          <Link href={enderecoDaAgenda(null, profissional)} className="inline-flex h-10 items-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-3.5 text-sm font-semibold text-primary transition-[transform,background-color,border-color] hover:border-primary-fixed-dim hover:bg-primary-fixed active:translate-y-px">
            Voltar para hoje
          </Link>
        ) : (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo px-3 text-xs font-semibold text-positivo">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo" />
            Hoje
          </span>
        )}

        <p role="status" className="inline-flex min-h-10 items-center gap-1.5 text-xs text-outline">
          {pendente ? (
            <>
              <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
              Carregando…
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
