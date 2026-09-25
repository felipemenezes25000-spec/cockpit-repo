"use client";

import { TelaDeErro } from "@/components/layout/tela-de-erro";

/** Falha nas páginas fora do sistema: login, recuperação de senha, assinatura. */
export default function ErroForaDoSistema({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#fbfdff_46%,#f6f9fc_100%)] px-4 py-8">
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-28 size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none -right-44 -bottom-52 size-[34rem] rounded-full bg-informativo-fundo/75 blur-3xl" />
      <div className="relative w-full">
        <TelaDeErro
          erro={error}
          tentarDeNovo={reset}
          titulo="Não foi possível abrir esta página"
          dentroDoSistema={false}
        />
      </div>
    </main>
  );
}
