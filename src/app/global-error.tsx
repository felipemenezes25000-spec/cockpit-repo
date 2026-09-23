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
        <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-[8%] size-[30rem] rounded-full bg-primary-fixed/38 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-[-10rem] size-[32rem] rounded-full bg-secondary-fixed/28 blur-3xl" />
          <TelaDeErro
            erro={error}
            tentarDeNovo={reset}
            titulo="O sistema não conseguiu abrir"
            dentroDoSistema={false}
          />
        </main>
      </body>
    </html>
  );
}
