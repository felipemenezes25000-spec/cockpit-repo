import { describe, expect, it } from "vitest";
import { lerTabelaDoBuild, ORCAMENTO, paraKb, percentil, tetoDaRota } from "../scripts/desempenho.mjs";

// Trecho no formato que o `next build` 15.5 imprime (com as molduras).
const SAIDA_DO_BUILD = [
  "Route (app)                                 Size  First Load JS",
  "┌ ƒ /                                      1.2 kB         110 kB",
  "├ ○ /_not-found                              994 B         103 kB",
  "├ ƒ /agenda                                 5.4 kB         128 kB",
  "└ ƒ /assinar/[token]                        3.1 kB        1.2 MB",
  "+ First Load JS shared by all               102 kB",
  "  ├ chunks/255-abc.js                      45.8 kB",
  "",
  "ƒ Middleware                               81.9 kB",
].join("\n");

describe("lerTabelaDoBuild", () => {
  it("lê o First Load JS de cada rota e o total compartilhado", () => {
    const { rotas, compartilhadoKb } = lerTabelaDoBuild(SAIDA_DO_BUILD);
    expect(rotas.map((r) => r.rota)).toEqual(["/", "/_not-found", "/agenda", "/assinar/[token]"]);
    expect(rotas[2].kb).toBe(128);
    expect(rotas[3].kb).toBeCloseTo(1228.8);
    expect(compartilhadoKb).toBe(102);
  });

  it("ignora cores ANSI e quebra CRLF", () => {
    const colorido = `\x1b[2m${SAIDA_DO_BUILD}\x1b[22m`.replace(/\n/g, "\r\n");
    expect(lerTabelaDoBuild(colorido).rotas).toHaveLength(4);
  });

  it("não confunde o middleware nem os chunks com rota", () => {
    const { rotas } = lerTabelaDoBuild(SAIDA_DO_BUILD);
    expect(rotas.some((r) => r.rota.includes("chunks") || r.rota === "Middleware")).toBe(false);
  });
});

describe("paraKb", () => {
  it("converte B e MB para kB", () => {
    expect(paraKb("512", "B")).toBe(0.5);
    expect(paraKb("2", "MB")).toBe(2048);
    expect(paraKb("12.5", "kB")).toBe(12.5);
  });
});

describe("percentil", () => {
  it("usa a posição mais próxima (nearest-rank) da lista ordenada", () => {
    const cem = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(percentil(cem, 50)).toBe(50);
    expect(percentil(cem, 95)).toBe(95);
    expect(percentil(cem, 100)).toBe(100);
    expect(percentil([7], 95)).toBe(7);
    expect(percentil([], 95)).toBe(0);
  });
});

describe("tetoDaRota", () => {
  it("usa o teto geral, salvo nas exceções que carregam o cliente do Supabase", () => {
    expect(tetoDaRota("/agenda")).toBe(ORCAMENTO.rotaKb);
    expect(tetoDaRota("/recuperar-senha")).toBe(ORCAMENTO.rotaKb);
    expect(tetoDaRota("/redefinir-senha")).toBeGreaterThan(ORCAMENTO.rotaKb);
  });
});
