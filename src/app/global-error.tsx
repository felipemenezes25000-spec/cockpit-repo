"use client";

import "./globals.css";
import { TelaDeErro } from "@/components/layout/tela-de-erro";

/**
 * Última rede: falha no próprio layout raiz. Substitui o `<html>` inteiro, por
 * isso repete o idioma e carrega o CSS — sem ele a pessoa veria a página crua.
 */
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
        <main className="flex min-h-dvh items-center justify-center bg-surface">
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
