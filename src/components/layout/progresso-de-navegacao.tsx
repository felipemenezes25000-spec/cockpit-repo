"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EVENTO = "cockpit:navegando";

/** Para quem navega sem clicar num link (atalho de tecla, paleta de comandos). */
export function avisarQueVaiNavegar() {
  window.dispatchEvent(new Event(EVENTO));
}

/** Clique simples num link desta origem que leva a outro endereço. */
function levaParaOutraTela(evento: MouseEvent): boolean {
  if (evento.defaultPrevented || evento.button !== 0) return false;
  if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return false;
  const alvo = evento.target instanceof Element ? evento.target.closest("a[href]") : null;
  if (!(alvo instanceof HTMLAnchorElement)) return false;
  if ((alvo.target && alvo.target !== "_self") || alvo.hasAttribute("download")) return false;
  const destino = new URL(alvo.href, window.location.href);
  if (destino.origin !== window.location.origin) return false;
  return destino.pathname !== window.location.pathname || destino.search !== window.location.search;
}

type Estado = "parado" | "andando" | "fim";

/**
 * A linha fina no alto da tela enquanto a próxima tela carrega — o servidor
 * monta cada tela, e sem ela o clique parecia não ter pego. Anda rápido no
 * começo e vai freando (nunca chega ao fim sozinha); quando o endereço muda,
 * completa e some. Uma navegação que não acontece (link que alguém cancelou)
 * encerra a linha em 12 s. É só decoração: `aria-hidden`, e quem usa leitor
 * de tela ouve o `loading.tsx` ("Carregando…").
 */
export function ProgressoDeNavegacao() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const endereco = `${caminho}?${busca?.toString() ?? ""}`;
  const [estado, setEstado] = useState<Estado>("parado");
  const anterior = useRef(endereco);

  useEffect(() => {
    const comecar = () => setEstado("andando");
    const aoClicar = (evento: MouseEvent) => {
      if (levaParaOutraTela(evento)) comecar();
    };
    const aoEnviar = (evento: SubmitEvent) => {
      const formulario = evento.target;
      if (!evento.defaultPrevented && formulario instanceof HTMLFormElement && formulario.method.toLowerCase() === "get") comecar();
    };
    // Na captura: o Link do Next cancela o clique (navega sem recarregar) e,
    // na fase de bolha, o evento já chegaria aqui como `defaultPrevented`.
    document.addEventListener("click", aoClicar, true);
    document.addEventListener("submit", aoEnviar);
    window.addEventListener(EVENTO, comecar);
    return () => {
      document.removeEventListener("click", aoClicar, true);
      document.removeEventListener("submit", aoEnviar);
      window.removeEventListener(EVENTO, comecar);
    };
  }, []);

  useEffect(() => {
    if (anterior.current === endereco) return;
    anterior.current = endereco;
    setEstado((atual) => (atual === "parado" ? atual : "fim"));
  }, [endereco]);

  useEffect(() => {
    if (estado === "parado") return;
    const espera = window.setTimeout(() => setEstado(estado === "fim" ? "parado" : "fim"), estado === "fim" ? 320 : 12_000);
    return () => window.clearTimeout(espera);
  }, [estado]);

  if (estado === "parado") return null;
  return <div aria-hidden="true" data-estado={estado} className="progresso-navegacao" />;
}
