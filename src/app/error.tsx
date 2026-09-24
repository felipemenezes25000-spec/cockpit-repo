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
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <TelaDeErro
        erro={error}
        tentarDeNovo={reset}
        titulo="Não foi possível abrir esta página"
        dentroDoSistema={false}
      />
    </main>
  );
}
