"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

/**
 * Luz contextual sem estado React: escreve as coordenadas direto no elemento.
 * Só existe em mouse/trackpad; touch e reduced-motion ficam com a superfície
 * estática. O pai precisa ser `relative overflow-hidden group`.
 */
export function LuzDoCursor({
  className,
  tamanho = 340,
}: {
  className?: string;
  tamanho?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const camada = ref.current;
    const pai = camada?.parentElement;
    if (!camada || !pai) return;

    const ponteiroFino = window.matchMedia("(hover: hover) and (pointer: fine)");
    const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!ponteiroFino.matches || movimentoReduzido.matches) return;

    function mover(evento: PointerEvent) {
      if (evento.pointerType && evento.pointerType !== "mouse") return;
      const retangulo = pai.getBoundingClientRect();
      camada.style.setProperty("--cursor-x", `${evento.clientX - retangulo.left}px`);
      camada.style.setProperty("--cursor-y", `${evento.clientY - retangulo.top}px`);
    }

    pai.addEventListener("pointermove", mover, { passive: true });
    return () => pai.removeEventListener("pointermove", mover);
  }, []);

  const estilo = {
    "--cursor-x": "50%",
    "--cursor-y": "35%",
    "--cursor-glow-size": `${tamanho}px`,
    background:
      "radial-gradient(circle var(--cursor-glow-size) at var(--cursor-x) var(--cursor-y), rgba(209,232,255,0.34), rgba(167,205,242,0.12) 32%, transparent 68%)",
  } as CSSProperties;

  return (
    <span
      ref={ref}
      aria-hidden="true"
      style={estilo}
      className={cn(
        "pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        className,
      )}
    />
  );
}
