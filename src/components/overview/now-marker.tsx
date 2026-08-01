"use client";

import { useEffect, useState } from "react";
import { formatarHora } from "@/lib/format";

/**
 * Marcador "agora" da agenda do dia.
 *
 * Só aparece no intervalo que contém o horário atual. A hora real é lida
 * apenas no navegador, depois da montagem: no servidor o componente devolve
 * nada, o que evita divergência de hidratação.
 */
export function MarcadorAgora({ de, ate }: { de: number; ate: number }) {
  const [visivel, setVisivel] = useState(false);
  const [rotulo, setRotulo] = useState("");

  useEffect(() => {
    function avaliar() {
      const agora = Date.now();
      setVisivel(agora >= de && agora < ate);
      setRotulo(formatarHora(new Date()));
    }

    avaliar();
    const id = setInterval(avaliar, 60_000);
    return () => clearInterval(id);
  }, [de, ate]);

  if (!visivel) return null;

  return (
    <div className="relative my-2 flex items-center" aria-label={`Agora, ${rotulo}`}>
      <span className="tabular w-12 shrink-0 text-right text-xs font-bold text-primary">
        {rotulo}
      </span>
      {/* Mesma geometria dos atendimentos: o ponto cai sobre a linha do tempo */}
      <span className="ml-4 flex w-3 shrink-0 justify-center sm:ml-6">
        <span
          aria-hidden="true"
          className="z-10 size-2 rounded-full bg-primary ring-4 ring-card"
        />
      </span>
      <span aria-hidden="true" className="ml-4 h-px flex-1 bg-primary/30 sm:ml-6" />
      <span className="rotulo ml-3 text-primary">agora</span>
    </div>
  );
}
