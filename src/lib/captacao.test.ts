import { describe, expect, it } from "vitest";
import { instanteNaClinica } from "./dates";
import { calcularPlanoDaMeta, calcularRitmoMensal, percentual } from "./captacao";

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

describe("calcularRitmoMensal", () => {
  const plano = calcularPlanoDaMeta({
    metaFaturamento: 75000,
    faturamentoAtual: 31500,
    ticketMedio: 1500,
    taxaLeadQualificado: 54,
    taxaQualificadoAgendamento: 49,
    taxaAgendamentoVenda: 47,
  });

  it("projeta o mês atual pela média realizada e distribui o gap pelo restante incluindo hoje", () => {
    const ritmo = calcularRitmoMensal({
      inicio: instanteNaClinica(2026, 9, 1),
      fim: instanteNaClinica(2026, 10, 1),
      referencia: instanteNaClinica(2026, 9, 24, 20),
      faturamentoAtual: 31500,
      metaFaturamento: 75000,
      plano,
    });

    expect(ritmo.situacao).toBe("atual");
    expect(ritmo.diasNoMes).toBe(30);
    expect(ritmo.diasDecorridos).toBe(24);
    expect(ritmo.diasRestantes).toBe(7);
    expect(ritmo.mediaFaturamentoDia).toBe(1312.5);
    expect(ritmo.projecaoFaturamento).toBe(39375);
    expect(ritmo.projecaoPercentualMeta).toBe(52.5);
    expect(ritmo.vendasPorDia).toBe(4.1);
    expect(ritmo.leadsPorDia).toBe(33.7);
  });

  it("não inventa projeção para mês futuro", () => {
    const ritmo = calcularRitmoMensal({
      inicio: instanteNaClinica(2026, 10, 1),
      fim: instanteNaClinica(2026, 11, 1),
      referencia: instanteNaClinica(2026, 9, 24, 20),
      faturamentoAtual: 0,
      metaFaturamento: 75000,
      plano,
    });

    expect(ritmo.situacao).toBe("futuro");
    expect(ritmo.diasDecorridos).toBe(0);
    expect(ritmo.projecaoFaturamento).toBe(0);
    expect(ritmo.diasRestantes).toBe(31);
  });
});

describe("percentual", () => {
  it("não divide por zero e mantém uma casa decimal", () => {
    expect(percentual(0, 0)).toBe(0);
    expect(percentual(47, 100)).toBe(47);
    expect(percentual(2, 3)).toBe(66.7);
  });
});
