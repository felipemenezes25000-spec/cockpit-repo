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
