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
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-[8%] size-[30rem] rounded-full bg-primary-fixed/38 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-[-10rem] size-[32rem] rounded-full bg-secondary-fixed/28 blur-3xl" />
      <TelaDeErro
        erro={error}
        tentarDeNovo={reset}
        titulo="Não foi possível abrir esta página"
        dentroDoSistema={false}
      />
    </main>
  );
}
