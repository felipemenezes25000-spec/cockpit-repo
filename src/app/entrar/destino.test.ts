import { describe, expect, it } from "vitest";
import { destinoSeguro } from "./destino";

/**
 * O `?proximo=` do login não pode virar redirecionamento para outro site.
 * Cada caso abaixo é uma forma conhecida de fazer o navegador sair do host.
 */
describe("destinoSeguro", () => {
  it.each([
    ["/", "/"],
    ["/pacientes", "/pacientes"],
    ["/agenda?dia=2026-09-23", "/agenda?dia=2026-09-23"],
    ["/financeiro/vendas/3f1c1b7e-9c1a-4b0e-8f1e-2b7c2f9d1a00", "/financeiro/vendas/3f1c1b7e-9c1a-4b0e-8f1e-2b7c2f9d1a00"],
    ["/prontuarios#fotos", "/prontuarios#fotos"],
    ["/busca?q=ana%20clara", "/busca?q=ana%20clara"],
  ])("aceita caminho interno %s", (entrada, esperado) => {
    expect(destinoSeguro(entrada)).toBe(esperado);
  });

  it.each([
    // Outro host, de todas as formas que o navegador entende.
    "//site.com",
    "///site.com",
    "/\\site.com",
    "\\\\site.com",
    "/\t/site.com",
    "/\n/site.com",
    "/\r\n/site.com",
    "/ /site.com",
    "/%09/site.com",
    "/%0a/site.com",
    "/%2F%2Fsite.com",
    "/%2f/site.com",
    "/%5Csite.com",
    "/%5c%5csite.com",
    "/\u0000/site.com",
    // Esquema e endereço absoluto.
    "https://site.com",
    "http:site.com",
    "javascript:alert(1)",
    "data:text/html,oi",
    " /pacientes",
    "pacientes",
    // Vazio, gigante e tipos que não são texto.
    "",
    `/${"a".repeat(300)}`,
  ])("recusa %j", (entrada) => {
    expect(destinoSeguro(entrada)).toBe("/");
  });

  it("recusa valor que não é texto (arquivo, nulo, ausente)", () => {
    expect(destinoSeguro(null)).toBe("/");
    expect(destinoSeguro(undefined)).toBe("/");
    expect(destinoSeguro(new Blob(["//site.com"]))).toBe("/");
  });

  it("resolve ponto-ponto sem sair do host", () => {
    expect(destinoSeguro("/assinar/../pacientes")).toBe("/pacientes");
    expect(destinoSeguro("/%2e%2e/%2e%2e/pacientes")).toBe("/pacientes");
  });

  // `.`/`..` só somem na resolução: o texto cru passa na regra da barra única,
  // mas o caminho resolvido vira `//site.com` (outro host para o navegador).
  it.each([
    "/.//site.com",
    "/..//site.com",
    "/a/..//site.com",
    "/%2e//site.com",
    "/%2E%2E//site.com",
    "/././/site.com",
    "/a/../..//site.com/p",
    "/.%2e//site.com?x=1#y",
  ])("recusa ponto-ponto que resolve para outro host %j", (entrada) => {
    expect(destinoSeguro(entrada)).toBe("/");
  });

  it("nunca devolve caminho que começa com // ou /\\", () => {
    const pedacos = ["/", "//", ".", "..", "%2e", "%2E", "a", "\\", "%5c", "site.com", "?", "#"];
    const entradas: string[] = [];
    for (const a of pedacos) {
      for (const b of pedacos) {
        for (const c of pedacos) {
          for (const d of pedacos) entradas.push(`/${a}${b}${c}${d}`);
        }
      }
    }
    for (const entrada of entradas) {
      const destino = destinoSeguro(entrada);
      expect(destino.startsWith("/"), entrada).toBe(true);
      expect(/^\/[/\\]/.test(destino), entrada).toBe(false);
    }
  });
});
