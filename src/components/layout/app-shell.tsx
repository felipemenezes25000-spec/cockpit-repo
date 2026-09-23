"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BarraLateral } from "./sidebar";
import { BarraSuperior } from "./topbar";
import type { UsuarioAtual } from "@/lib/perfil";

export function EstruturaApp({
  children,
  usuario,
  pendenciasAltas,
  aviso,
}: {
  children: ReactNode;
  usuario: UsuarioAtual;
  pendenciasAltas: number;
  aviso?: ReactNode;
}) {
  const [recolhida, setRecolhida] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const gatilhoGaveta = useRef<HTMLButtonElement>(null);
  const caminho = usePathname();

  const fecharGaveta = useCallback(() => {
    setGavetaAberta(false);
    gatilhoGaveta.current?.focus();
  }, []);

  useEffect(() => {
    setGavetaAberta(false);
  }, [caminho]);

  useEffect(() => {
    if (!gavetaAberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fecharGaveta();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [gavetaAberta, fecharGaveta]);

  useEffect(() => {
    if (!gavetaAberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [gavetaAberta]);

  return (
    <div className="relative flex min-h-screen bg-transparent">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_42%_0%,rgba(10,110,209,0.065),transparent_52%)]"
      />
      <a
        href="#conteudo"
        className="sr-only rounded-[var(--radius-cartao)] bg-primary px-4 py-2 text-on-primary shadow-[var(--shadow-flutuante)] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
      >
        Ir para o conteúdo
      </a>

      <BarraLateral
        recolhida={recolhida}
        aoAlternarRecolhida={() => setRecolhida((v) => !v)}
        gavetaAberta={gavetaAberta}
        aoFecharGaveta={fecharGaveta}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior
          ref={gatilhoGaveta}
          aoAbrirGaveta={() => setGavetaAberta(true)}
          usuario={usuario}
          pendenciasAltas={pendenciasAltas}
        />
        <main
          id="conteudo"
          className="relative flex-1 px-3 py-5 sm:px-6 sm:py-7 xl:px-10 2xl:px-14"
        >
          <div className="page-reveal mx-auto w-full max-w-[1600px]">
            {aviso}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
