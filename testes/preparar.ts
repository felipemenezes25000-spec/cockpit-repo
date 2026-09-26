import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

/**
 * Preparação comum dos testes.
 *
 * Nos testes de componente (jsdom), cada teste começa com a tela limpa. A
 * importação é dinâmica para não carregar o Testing Library nos testes que
 * rodam em Node puro.
 */
afterEach(async () => {
  if (typeof document !== "undefined") {
    const { cleanup } = await import("@testing-library/react");
    cleanup();
  }
});

/**
 * O jsdom não desenha: `getContext` só existe com o pacote `canvas` nativo, e
 * sem ele cada chamada vira um erro no console. O quadro de rubrica já trata
 * contexto nulo (não desenha), então o teste de componente segue igual.
 */
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
}
