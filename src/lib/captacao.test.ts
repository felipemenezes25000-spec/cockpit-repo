import { describe, expect, it } from "vitest";
import { calcularPlanoDaMeta, percentual } from "./captacao";

describe("calcularPlanoDaMeta", () => {
  it("parte do gap financeiro e sobe o funil arredondando para cima", () => {
    expect(calcularPlanoDaMeta({
      metaFaturamento: 75000,
      faturamentoAtual: 31500,
      ticketMedio: 1500,
      taxaLeadQualificado: 54,
      taxaQualificadoAgendamento: 49,
      taxaAgendamentoVenda: 47,
    })).toEqual({
      gapFinanceiro: 43500,
      percentualMeta: 42,
      vendasNecessarias: 29,
      agendamentosNecessarios: 62,
      qualificadosNecessarios: 127,
      leadsNecessarios: 236,
    });
  });

  it("zera a necessidade quando a meta já foi atingida", () => {
    expect(calcularPlanoDaMeta({
      metaFaturamento: 10000,
      faturamentoAtual: 12000,
      ticketMedio: 1000,
      taxaLeadQualificado: 50,
      taxaQualificadoAgendamento: 50,
      taxaAgendamentoVenda: 50,
    }).leadsNecessarios).toBe(0);
  });
});

describe("percentual", () => {
  it("não divide por zero e mantém uma casa decimal", () => {
    expect(percentual(0, 0)).toBe(0);
    expect(percentual(47, 100)).toBe(47);
    expect(percentual(2, 3)).toBe(66.7);
  });
});
