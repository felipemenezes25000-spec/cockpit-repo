import { describe, expect, it } from "vitest";
import { escreverRecolhidos, lerRecolhidos } from "./recolhidos";

describe("painéis recolhidos no cookie", () => {
  it("lê os ids separados por ponto, sem repetir", () => {
    expect(lerRecolhidos("vg-pendencias.fin-ultimas-movimentacoes.vg-pendencias")).toEqual([
      "vg-pendencias",
      "fin-ultimas-movimentacoes",
    ]);
  });

  it("descarta o que não parece id de painel (o cookie pode ser editado)", () => {
    expect(lerRecolhidos("vg-caixa.<script>.MAIUSCULA..a b")).toEqual(["vg-caixa"]);
    expect(lerRecolhidos(undefined)).toEqual([]);
    expect(lerRecolhidos("")).toEqual([]);
  });

  it("escreve o que lê de volta", () => {
    const ids = ["vg-caixa", "pac-cadastro"];
    expect(lerRecolhidos(escreverRecolhidos(ids))).toEqual(ids);
  });

  it("não cresce sem limite", () => {
    const muitos = Array.from({ length: 200 }, (_, i) => `p-${i}`);
    expect(lerRecolhidos(escreverRecolhidos(muitos))).toHaveLength(60);
  });
});
