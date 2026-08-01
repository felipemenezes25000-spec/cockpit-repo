"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BarraLateral } from "./sidebar";
import { BarraSuperior } from "./topbar";

/** Estrutura principal: menu lateral, cabeçalho e área de conteúdo. */
export function EstruturaApp({ children }: { children: ReactNode }) {
  const [recolhida, setRecolhida] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const gatilhoGaveta = useRef<HTMLButtonElement>(null);
  const caminho = usePathname();

  const fecharGaveta = useCallback(() => {
    setGavetaAberta(false);
    gatilhoGaveta.current?.focus();
  }, []);

  // Trocar de módulo fecha a gaveta no celular.
  useEffect(() => {
    setGavetaAberta(false);
  }, [caminho]);

  // Esc fecha a gaveta e devolve o foco a quem a abriu.
  useEffect(() => {
    if (!gavetaAberta) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") fecharGaveta();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [gavetaAberta, fecharGaveta]);

  // Com a gaveta aberta, o fundo não rola.
  useEffect(() => {
    if (!gavetaAberta) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [gavetaAberta]);

  return (
    <div className="flex min-h-screen bg-surface">
      <a
        href="#conteudo"
        className="sr-only rounded-[var(--radius-cartao)] bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
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
        <BarraSuperior ref={gatilhoGaveta} aoAbrirGaveta={() => setGavetaAberta(true)} />
        <main id="conteudo" className="flex-1 px-4 py-8 sm:px-8 xl:px-20">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
