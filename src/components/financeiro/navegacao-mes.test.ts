import { describe, expect, it } from "vitest";
import { hrefDoMes } from "./navegacao-mes";

describe("hrefDoMes", () => {
  // Antes, as setas levavam só `?mes=`: trocar de mês zerava situação,
  // forma e busca — e o estado vazio filtrado sugere justamente trocar o mês.
  it("mantém os filtros da tela ao trocar de mês", () => {
    expect(hrefDoMes("/financeiro/vendas", "situacao=abertas&busca=ana", "2026-08")).toBe(
      "/financeiro/vendas?situacao=abertas&busca=ana&mes=2026-08",
    );
  });

  it("substitui o mês que já estava na URL", () => {
    expect(hrefDoMes("/financeiro/despesas", "mes=2026-07&categoria=estrutura", "2026-06")).toBe(
      "/financeiro/despesas?mes=2026-06&categoria=estrutura",
    );
  });

  it("volta ao mês atual tirando só o mês", () => {
    expect(hrefDoMes("/financeiro/vendas", "mes=2026-07&forma=pix", null)).toBe(
      "/financeiro/vendas?forma=pix",
    );
    expect(hrefDoMes("/financeiro", "mes=2026-07", null)).toBe("/financeiro");
  });
});
