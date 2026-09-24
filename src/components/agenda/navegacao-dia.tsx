"use client";

import { ChevronLeft, ChevronRight, LoaderCircle } from "lucide-react";
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
    "group flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-card-border/80 bg-white/72 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.92),var(--shadow-cartao)] transition-[transform,background-color,border-color,box-shadow,color] duration-150 hover:-translate-y-px hover:border-primary/20 hover:bg-white hover:text-primary hover:shadow-[var(--shadow-realce)] active:translate-y-px active:scale-[0.97]";

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
      className="premium-panel flex flex-wrap items-center gap-2 rounded-[16px] border p-2.5 shadow-[var(--shadow-cartao)]"
    >
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
          {ehHoje ? <span aria-hidden="true" className="absolute -top-1 -right-1 z-10 size-2.5 rounded-full border-2 border-white bg-primary-container shadow-[0_0_8px_rgba(10,110,209,0.3)]" /> : null}
          <input
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
            className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "tabular bg-white/78 font-medium shadow-[var(--shadow-cartao)]")}
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

      {temFiltro ? (
        <select
          name="profissional"
          value={filtro ?? ""}
          onChange={(evento) => {
            const escolhido = evento.target.value || null;
            setFiltro(escolhido);
            navegar(valor, escolhido);
          }}
          aria-label="Filtrar por quem atende"
          className={cn(classeDeEntrada({ altura: "compacta", largura: "auto" }), "max-w-full bg-white/78 font-medium shadow-[var(--shadow-cartao)]")}
        >
          <option value="">Todas as profissionais</option>
          {profissionais.map((p) => (
            <option key={p.id} value={p.id}>{p.nome}</option>
          ))}
        </select>
      ) : profissional ? (
        <input type="hidden" name="profissional" value={profissional} />
      ) : null}

      {comJavaScript ? null : (
        <button type="submit" className="inline-flex h-10 items-center rounded-[12px] border border-card-border bg-white/75 px-3 text-sm font-semibold text-primary shadow-[var(--shadow-cartao)] transition-[transform,background-color] hover:-translate-y-px hover:bg-white active:translate-y-px">
          Ver
        </button>
      )}

      {!ehHoje ? (
        <Link href={enderecoDaAgenda(null, profissional)} className="inline-flex h-10 items-center rounded-[12px] border border-primary/10 bg-primary-fixed/38 px-3 text-sm font-semibold text-primary transition-[transform,background-color] hover:-translate-y-px hover:bg-primary-fixed/60 active:translate-y-px">
          Voltar para hoje
        </Link>
      ) : (
        <span className="hidden items-center gap-1.5 rounded-[10px] border border-positivo-borda/55 bg-positivo-fundo/55 px-2.5 py-1.5 text-xs font-semibold text-positivo sm:inline-flex">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-positivo" />
          Hoje
        </span>
      )}

      <p role="status" className="inline-flex items-center gap-1.5 text-xs text-outline">
        {pendente ? (
          <>
            <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
            Carregando a agenda…
          </>
        ) : null}
      </p>
    </form>
  );
}
