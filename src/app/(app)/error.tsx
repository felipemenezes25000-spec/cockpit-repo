"use client";

import { TelaDeErro } from "@/components/layout/tela-de-erro";

/**
 * Falha dentro do sistema: o menu e o cabeçalho continuam de pé, e só a área
 * de conteúdo mostra o aviso. A pessoa troca de módulo sem recarregar tudo.
 */
export default function ErroNoSistema({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <TelaDeErro erro={error} tentarDeNovo={reset} />;
}
