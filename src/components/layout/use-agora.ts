"use client";

import { useEffect, useState } from "react";

/**
 * O instante atual, lido só no navegador e renovado a cada `intervaloMs`.
 *
 * Devolve `null` na renderização do servidor e na primeira do cliente: quem
 * usa mostra uma versão sem hora até montar, e a hidratação nunca diverge.
 */
export function useAgora(intervaloMs = 30_000): number | null {
  const [agora, setAgora] = useState<number | null>(null);

  useEffect(() => {
    const marcar = () => setAgora(Date.now());
    marcar();
    const id = window.setInterval(marcar, intervaloMs);
    return () => window.clearInterval(id);
  }, [intervaloMs]);

  return agora;
}
