"use client";

import { useEffect, useState } from "react";

/**
 * Atalhos de uma tecla (N, A, V, T) ligados ou desligados, por navegador.
 *
 * Atalho de uma letra só atrapalha quem usa leitor de tela ou comando de voz
 * (WCAG 2.1.4), então dá para desligar — no painel de atalhos da Visão Geral.
 * É preferência de quem usa este navegador, não dado da clínica: fica no
 * armazenamento local, e o Cockpit funciona igual sem ele.
 */
const CHAVE = "cockpit-atalhos-de-tecla";
const EVENTO = "cockpit-atalhos-de-tecla";

export function atalhosLigados(): boolean {
  try {
    return window.localStorage.getItem(CHAVE) !== "desligados";
  } catch {
    return true;
  }
}

export function definirAtalhos(ligados: boolean): void {
  try {
    window.localStorage.setItem(CHAVE, ligados ? "ligados" : "desligados");
  } catch {
    // Sem armazenamento, a escolha vale só até recarregar.
  }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: ligados }));
}

/** Acompanha a preferência, inclusive quando outra parte da tela a muda. */
export function useAtalhosLigados(): boolean {
  const [ligados, setLigados] = useState(true);

  useEffect(() => {
    setLigados(atalhosLigados());
    const aoMudar = (evento: Event) => setLigados(Boolean((evento as CustomEvent<boolean>).detail));
    window.addEventListener(EVENTO, aoMudar);
    return () => window.removeEventListener(EVENTO, aoMudar);
  }, []);

  return ligados;
}

/** O foco está num lugar onde a tecla é texto, não comando. */
export function estaEditando(alvo: EventTarget | null): boolean {
  const elemento = alvo as HTMLElement | null;
  return (
    elemento instanceof HTMLInputElement ||
    elemento instanceof HTMLTextAreaElement ||
    elemento instanceof HTMLSelectElement ||
    Boolean(elemento?.isContentEditable)
  );
}
