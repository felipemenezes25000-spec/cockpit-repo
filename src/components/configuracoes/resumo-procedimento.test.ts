import { describe, expect, it } from "vitest";
import { resumoDoProcedimento } from "./resumo-procedimento";

describe("resumoDoProcedimento", () => {
  it("retorno de um dia fica no singular", () => {
    expect(resumoDoProcedimento({ duracaoMin: 30, valorPadrao: 0, retornoSugeridoDias: 1, usos: 1 })).toBe(
      "30 min · sem valor de tabela · retorno em 1 dia · 1 atendimento",
    );
  });

  it("vários dias e atendimentos ficam no plural; sem retorno diz isso", () => {
    expect(resumoDoProcedimento({ duracaoMin: 60, valorPadrao: 0, retornoSugeridoDias: 15, usos: 3 })).toBe(
      "60 min · sem valor de tabela · retorno em 15 dias · 3 atendimentos",
    );
    expect(resumoDoProcedimento({ duracaoMin: 45, valorPadrao: 0, retornoSugeridoDias: null, usos: 0 })).toBe(
      "45 min · sem valor de tabela · sem retorno sugerido",
    );
  });

  it("mostra o valor de tabela quando existe", () => {
    expect(resumoDoProcedimento({ duracaoMin: 30, valorPadrao: 150, retornoSugeridoDias: null, usos: 0 })).toMatch(
      /^30 min · R\$\s?150,00 · sem retorno sugerido$/,
    );
  });
});
