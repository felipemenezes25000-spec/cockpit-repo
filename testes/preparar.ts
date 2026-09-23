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
