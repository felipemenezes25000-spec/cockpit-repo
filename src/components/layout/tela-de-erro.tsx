"use client";

import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useRef } from "react";

/**
 * O que a pessoa vê quando uma tela não consegue carregar.
 *
 * Nunca mostra o erro técnico: em produção o Next já troca a mensagem por uma
 * genérica em inglês, e em desenvolvimento ela poderia trazer detalhe do
 * banco. A frase é fixa, em português, e diz o que fazer. O código (`digest`)
 * é um identificador opaco que o Next gera — é ele que liga o que a pessoa viu
 * ao registro técnico nos logs do servidor, sem carregar dado nenhum.
 *
 * "Tentar de novo" refaz a busca no servidor (`router.refresh`) antes de
 * remontar a tela: só `reset()` repetiria o mesmo erro guardado.
 */
export function TelaDeErro({
  erro,
  tentarDeNovo,
  titulo = "Não foi possível carregar esta tela",
  dentroDoSistema = true,
}: {
  erro: Error & { digest?: string };
  tentarDeNovo: () => void;
  titulo?: string;
  /** Fora do sistema (páginas públicas) não há Visão Geral para onde voltar. */
  dentroDoSistema?: boolean;
}) {
  const router = useRouter();
  const tituloRef = useRef<HTMLHeadingElement>(null);

  // Quem navega por teclado ou leitor de tela chega direto ao aviso.
  useEffect(() => {
    tituloRef.current?.focus();
  }, []);

  function recarregar() {
    startTransition(() => {
      router.refresh();
      tentarDeNovo();
    });
  }

  return (
    <div role="alert" className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center">
      <span className="mb-5 flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-negativo-fundo text-negativo">
        <TriangleAlert aria-hidden="true" size={22} strokeWidth={1.75} />
      </span>

      <h1 ref={tituloRef} tabIndex={-1} className="t-headline text-on-surface outline-none">
        {titulo}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
        Pode ter sido uma falha momentânea de conexão com o banco. Nada do que
        você estava fazendo foi gravado pela metade — tente de novo em
        instantes. Se continuar, avise a administradora com o código abaixo.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={recarregar}
          className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary"
        >
          <RotateCcw aria-hidden="true" size={16} strokeWidth={1.75} />
          Tentar de novo
        </button>
        {dentroDoSistema ? (
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-card-border bg-surface px-6 text-sm font-medium text-primary transition-colors hover:bg-surface-container-low"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Visão Geral
          </Link>
        ) : null}
      </div>

      {erro.digest ? (
        <p className="mt-8 text-xs text-outline">
          Código do erro: <code className="tabular select-all">{erro.digest}</code>
        </p>
      ) : null}
    </div>
  );
}
