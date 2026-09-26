"use client";

import "./globals.css";
import { TelaDeErro } from "@/components/layout/tela-de-erro";

/** Última rede: falha no próprio layout raiz. */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#fbfdff_46%,#f6f9fc_100%)] px-4 py-8">
          <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-28 size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
          <span aria-hidden="true" className="pointer-events-none absolute -right-44 -bottom-52 size-[34rem] rounded-full bg-informativo-fundo/75 blur-3xl" />
          <div className="relative w-full">
            <TelaDeErro
              erro={error}
              tentarDeNovo={reset}
              titulo="O sistema não conseguiu abrir"
              dentroDoSistema={false}
            />
          </div>
        </main>
      </body>
    </html>
  );
}
