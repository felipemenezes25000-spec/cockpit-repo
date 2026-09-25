"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { formatarMoeda } from "@/lib/format";

type Formato = "inteiro" | "moeda";

const INTEIRO = new Intl.NumberFormat("pt-BR");
const DURACAO_MS = 950;

function formatar(valor: number, formato: Formato): string {
  return formato === "moeda" ? formatarMoeda(Math.round(valor * 100) / 100) : INTEIRO.format(Math.round(valor));
}

/** Rápido no começo e freando no fim: o número "assenta" no valor. */
function desacelera(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

const semAssinatura = () => () => {};

/**
 * Um número que conta até o valor quando a tela abre pelo sistema, e que
 * desliza do valor antigo para o novo quando muda (depois de uma gravação).
 *
 * Na PRIMEIRA carga da página, que vem pronta do servidor, ele não conta: o
 * número já está pintado, e voltar a zero seria um piscar. Quem sabe se o
 * componente nasceu no servidor é o `useSyncExternalStore` (na hidratação ele
 * usa o retrato do servidor, `false`). A conta roda num `useLayoutEffect`,
 * antes da pintura, então a tela nunca mostra o valor final e depois o zero.
 * Com "reduzir movimento", o número aparece pronto.
 */
export function NumeroVivo({ valor, formato = "inteiro", className }: { valor: number; formato?: Formato; className?: string }) {
  const noCliente = useSyncExternalStore(semAssinatura, () => true, () => false);
  const nasceuNoCliente = useRef(noCliente);
  const primeiraVez = useRef(true);
  const naTela = useRef(valor);
  const [mostrado, setMostrado] = useState(valor);

  useLayoutEffect(() => {
    const deOnde = primeiraVez.current ? (nasceuNoCliente.current ? 0 : valor) : naTela.current;
    primeiraVez.current = false;
    const reduzido = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzido || deOnde === valor) {
      naTela.current = valor;
      setMostrado(valor);
      return;
    }

    let quadro = 0;
    const inicio = performance.now();
    naTela.current = deOnde;
    setMostrado(deOnde);
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / DURACAO_MS);
      const atual = deOnde + (valor - deOnde) * desacelera(t);
      naTela.current = atual;
      setMostrado(t === 1 ? valor : atual);
      if (t < 1) quadro = window.requestAnimationFrame(passo);
    };
    quadro = window.requestAnimationFrame(passo);
    return () => window.cancelAnimationFrame(quadro);
  }, [valor]);

  return <span className={className}>{formatar(mostrado, formato)}</span>;
}
