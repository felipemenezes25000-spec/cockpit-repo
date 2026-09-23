"use client";

import { ArrowLeft, Copy, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";

export function TelaDeErro({
  erro,
  tentarDeNovo,
  titulo = "Não foi possível carregar esta tela",
  dentroDoSistema = true,
}: {
  erro: Error & { digest?: string };
  tentarDeNovo: () => void;
  titulo?: string;
  dentroDoSistema?: boolean;
}) {
  const router = useRouter();
  const tituloRef = useRef<HTMLHeadingElement>(null);
  const [copiado, definirCopiado] = useState(false);

  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  function recarregar() {
    startTransition(() => {
      router.refresh();
      tentarDeNovo();
    });
  }

  async function copiarCodigo() {
    if (!erro.digest) return;
    try {
      await navigator.clipboard.writeText(erro.digest);
      definirCopiado(true);
      window.setTimeout(() => definirCopiado(false), 1800);
    } catch {
      definirCopiado(false);
    }
  }

  return (
    <div role="alert" className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
      <section className="premium-panel relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+6px)] border px-6 py-8 text-center sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 rounded-full bg-negativo-fundo blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 h-px bg-white/95" />

        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-negativo-borda/70 bg-negativo-fundo text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.8),var(--shadow-cartao)]">
          <TriangleAlert aria-hidden="true" size={24} strokeWidth={1.75} />
        </span>

        <p className="rotulo mt-6 text-negativo">Falha de carregamento</p>
        <h1 ref={tituloRef} tabIndex={-1} className="mx-auto mt-3 max-w-xl text-[clamp(1.7rem,4vw,2.55rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-on-surface outline-none">
          {titulo}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-on-surface-variant">
          Pode ter sido uma falha momentânea de conexão. A interface não exibe detalhes técnicos nem dados do banco. Tente novamente; se continuar, encaminhe o código de referência à administradora.
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={recarregar}
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-primary/10 bg-primary-container px-5 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary active:translate-y-px active:scale-[0.99]"
          >
            <RotateCcw aria-hidden="true" size={16} strokeWidth={1.75} />
            Tentar de novo
          </button>
          {dentroDoSistema ? (
            <Link
              href="/"
              className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-card-border/85 bg-surface/75 px-5 text-sm font-semibold text-primary shadow-[var(--shadow-cartao)] transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-primary-fixed-dim hover:bg-surface active:translate-y-px"
            >
              <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
              Visão Geral
            </Link>
          ) : null}
        </div>

        {erro.digest ? (
          <div className="mx-auto mt-8 max-w-md rounded-[var(--radius-controle)] border border-card-border/75 bg-surface-container-low/60 p-3 text-left">
            <p className="rotulo text-[0.65rem] text-outline">Código de referência</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="tabular min-w-0 flex-1 break-all text-xs text-on-surface-variant">{erro.digest}</code>
              <button
                type="button"
                onClick={copiarCodigo}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-card-border bg-surface px-2.5 text-xs font-semibold text-primary transition-colors hover:border-primary-fixed-dim hover:bg-primary-fixed/35"
                aria-label="Copiar código do erro"
              >
                <Copy aria-hidden="true" size={13} strokeWidth={1.75} />
                {copiado ? "Copiado" : "Copiar"}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
