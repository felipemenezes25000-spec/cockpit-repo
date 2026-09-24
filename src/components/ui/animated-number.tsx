"use client";

import { useEffect, useMemo, useState } from "react";

const inteiro = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });
const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function NumeroAnimado({
  valor,
  tipo = "inteiro",
  duracao = 720,
}: {
  valor: number;
  tipo?: "inteiro" | "moeda";
  duracao?: number;
}) {
  const [exibido, setExibido] = useState(0);
  const formatar = useMemo(() => (tipo === "moeda" ? moeda.format.bind(moeda) : inteiro.format.bind(inteiro)), [tipo]);
  const final = formatar(valor);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setExibido(valor);
      return;
    }

    let quadro = 0;
    const inicio = performance.now();

    function animar(agora: number) {
      const progresso = Math.min(1, (agora - inicio) / duracao);
      const suavizado = 1 - Math.pow(1 - progresso, 4);
      setExibido(valor * suavizado);
      if (progresso < 1) quadro = window.requestAnimationFrame(animar);
    }

    quadro = window.requestAnimationFrame(animar);
    return () => window.cancelAnimationFrame(quadro);
  }, [duracao, valor]);

  return (
    <span aria-label={final}>
      <span aria-hidden="true">{formatar(exibido)}</span>
    </span>
  );
}
