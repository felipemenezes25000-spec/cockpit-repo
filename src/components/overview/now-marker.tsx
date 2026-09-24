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
    <div className="relative my-2.5 flex items-center pl-[13px] sm:pl-[17px]">
      <span className="tabular w-10 shrink-0 text-right text-xs font-bold text-primary sm:w-12">
        {rotulo}
      </span>

      <span className="ml-3 flex w-3 shrink-0 justify-center sm:ml-6">
        <span
          aria-hidden="true"
          className="now-pulse z-10 size-2.5 rounded-full border-2 border-white bg-primary shadow-[0_0_18px_rgba(10,110,209,0.48)] ring-4 ring-primary-fixed/70"
        />
      </span>

      <span aria-hidden="true" className="relative ml-4 h-px flex-1 overflow-visible bg-gradient-to-r from-primary/60 via-primary/25 to-transparent sm:ml-6">
        <span className="absolute -top-px left-0 h-[3px] w-16 rounded-full bg-primary/18 blur-[2px]" />
      </span>

      <span className="ml-3 inline-flex items-center rounded-full border border-primary/10 bg-primary-fixed/55 px-2 py-1 text-[0.62rem] font-bold tracking-[0.08em] text-primary uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        agora
      </span>
    </div>
  );
}
