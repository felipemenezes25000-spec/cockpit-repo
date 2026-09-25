"use client";

import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ProvedorDePaineis } from "@/components/ui/card-recolhivel";
import type { AtendimentoDoAgora } from "@/lib/agora";
import type { UsuarioAtual } from "@/lib/perfil";
import { AvisosDaTela } from "./avisos-da-tela";
import { FaixaDoAgora } from "./faixa-do-agora";
import { NavegacaoInferiorMobile } from "./mobile-bottom-nav";
import { ProgressoDeNavegacao } from "./progresso-de-navegacao";
import { GavetaDeModulos } from "./sidebar";
import { TickerDePendencias, type PendenciaDoTicker } from "./ticker-de-pendencias";
import { BarraSuperior } from "./topbar";

/**
 * A estrutura de toda tela logada: o letreiro de pendências no alto, a barra
 * de módulos, a faixa do agora logo abaixo e o conteúdo — que entra em
 * cascata a cada troca de endereço (`.palco`) e sabe quais painéis a pessoa
 * recolheu. Por cima de tudo, a barra de progresso da navegação e o aviso
 * depois de salvar. Abaixo de 1024 px os módulos vão para a gaveta (botão de
 * menu) e para a barra inferior.
 */
export function EstruturaApp({
  children,
  usuario,
  pendenciasAltas,
  letreiro,
  recolhidos,
  agenda,
  aviso,
}: {
  children: ReactNode;
  usuario: UsuarioAtual;
  pendenciasAltas: number;
  letreiro: { pendencias: PendenciaDoTicker[]; total: number; altas: number };
  recolhidos: string[];
  agenda: AtendimentoDoAgora[] | null;
  aviso?: ReactNode;
}) {
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
    <div className="app-premium fundo-vivo flex min-h-screen flex-col">
      {/* Os dois leem o endereço (useSearchParams): cada um no seu Suspense. */}
      <Suspense fallback={null}>
        <ProgressoDeNavegacao />
      </Suspense>
      <a href="#conteudo" className="sr-only rounded-[var(--radius-controle)] bg-primary-container px-4 py-2 font-semibold text-on-primary shadow-flutuante focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50">Ir para o conteúdo</a>

      <TickerDePendencias pendencias={letreiro.pendencias} total={letreiro.total} altas={letreiro.altas} />

      <BarraSuperior
        ref={gatilhoGaveta}
        aoAbrirGaveta={() => setGavetaAberta(true)}
        usuario={usuario}
        pendenciasAltas={pendenciasAltas}
      />
      <FaixaDoAgora atendimentos={agenda} />

      <GavetaDeModulos aberta={gavetaAberta} aoFechar={fecharGaveta} />

      <main id="conteudo" className="relative flex-1 px-3 pt-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:pt-7 lg:pb-10 xl:px-10 2xl:px-14">
        <ProvedorDePaineis inicial={recolhidos}>
          <div key={caminho} className="palco mx-auto w-full max-w-[1680px]">
            {aviso}
            {children}
          </div>
        </ProvedorDePaineis>
      </main>

      <NavegacaoInferiorMobile
        aoAbrirMenu={() => setGavetaAberta(true)}
        pendenciasAltas={pendenciasAltas}
      />

      <Suspense fallback={null}>
        <AvisosDaTela />
      </Suspense>
    </div>
  );
}
