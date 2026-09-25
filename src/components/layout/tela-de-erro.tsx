"use client";

import { ArrowLeft, Copy, RefreshCw, RotateCcw, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef, useState } from "react";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";

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
    <div className="mx-auto w-full max-w-4xl px-3 py-8 sm:px-4 sm:py-14">
      {dentroDoSistema ? null : (
        <div className="mb-8 flex justify-center">
          <MarcaComNome tamanho="medio" />
        </div>
      )}

      <section role="alert" className="premium-panel relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border px-5 py-7 sm:px-8 sm:py-9">
        <span aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 size-72 rounded-full bg-negativo-fundo/70 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-24 size-72 rounded-full bg-primary-fixed/55 blur-3xl" />

        <div className="relative grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <span className="flex size-14 items-center justify-center rounded-[var(--radius-painel)] border border-negativo-borda bg-negativo-fundo text-negativo shadow-[0_16px_36px_-28px_rgba(153,27,27,.55)]">
              <TriangleAlert aria-hidden="true" size={24} strokeWidth={1.75} />
            </span>

            <p className="rotulo mt-6 text-negativo">Falha de carregamento</p>
            <h1 ref={tituloRef} tabIndex={-1} className="titulo-tela mt-2 max-w-2xl text-on-surface outline-none">
              {titulo}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Pode ter sido uma falha momentânea de conexão. A interface não expõe detalhes técnicos nem dados do banco. Tente novamente; se continuar, use o código de referência para investigação.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={recarregar}
                className="premium-interactive inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-5 text-sm font-semibold text-on-primary shadow-[0_12px_28px_-20px_rgba(8,84,160,.75)] hover:border-primary-hover hover:bg-primary-hover active:translate-y-px"
              >
                <RotateCcw aria-hidden="true" size={16} strokeWidth={1.75} />
                Tentar de novo
              </button>
              {dentroDoSistema ? (
                <Link
                  href="/"
                  className="premium-interactive inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-borda-controle bg-surface px-5 text-sm font-semibold text-primary hover:border-primary-container hover:bg-selecao active:translate-y-px"
                >
                  <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
                  Visão Geral
                </Link>
              ) : null}
            </div>

            {erro.digest ? (
              <div className="mt-7 max-w-xl rounded-[var(--radius-painel)] border border-card-border bg-surface/90 p-3.5 text-left shadow-[0_14px_34px_-30px_rgba(8,41,76,.4)]">
                <p className="rotulo text-[0.65rem] text-outline">Código de referência</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="tabular min-w-0 flex-1 break-all text-xs text-on-surface-variant">{erro.digest}</code>
                  <button
                    type="button"
                    onClick={copiarCodigo}
                    className="premium-interactive inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-2.5 text-xs font-semibold text-primary hover:border-primary-fixed-dim hover:bg-selecao"
                    aria-label="Copiar código do erro"
                  >
                    <Copy aria-hidden="true" size={13} strokeWidth={1.75} />
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="integridade-cabine p-4 sm:p-5">
            <p className="rotulo text-primary">O que acontece agora</p>
            <div className="mt-4 flex flex-col gap-3">
              <div className="flex gap-3 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3">
                <RefreshCw aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-on-surface">Nova tentativa segura</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Recarrega apenas os dados necessários para esta tela.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-3">
                <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-on-surface">Sem exposição técnica</p>
                  <p className="mt-1 text-xs leading-5 text-outline">Mensagem, stack e conteúdo interno do banco não aparecem para a pessoa usuária.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
