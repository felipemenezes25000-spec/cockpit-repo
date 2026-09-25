import { describe, expect, it } from "vitest";
import { instanteNaClinica } from "./dates";
import {
  calcularPlanoDaMeta,
  calcularRitmoMensal,
  canalValido,
  leadAberto,
  lerFiltroAtencao,
  normalizarContato,
  percentual,
  recorteDeRetorno,
  situacaoDoRetorno,
  validarContato,
} from "./captacao";

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

describe("validarContato", () => {
  const HOJE = "2026-09-25";
  const valido = { canal: "whatsapp", observacao: "Pediu os valores.", proximo_contato: "" };

  it("canal da lista, sem retorno: passa", () => {
    expect(validarContato(valido, HOJE)).toEqual({});
  });

  it("canal fora da lista (o mesmo da CHECK do banco) é recusado", () => {
    expect(validarContato({ ...valido, canal: "sinal de fumaça" }, HOJE).canal).toBeTruthy();
    expect(validarContato({ ...valido, canal: "" }, HOJE).canal).toBeTruthy();
    for (const canal of ["whatsapp", "telefone", "instagram", "email", "presencial", "outro"]) {
      expect(canalValido(canal)).toBe(true);
    }
  });

  it("observação até 1000 caracteres; 1001 volta como erro do campo", () => {
    expect(validarContato({ ...valido, observacao: "x".repeat(1000) }, HOJE)).toEqual({});
    expect(validarContato({ ...valido, observacao: "x".repeat(1001) }, HOJE).observacao).toMatch(/1000/);
  });

  it("retorno hoje ou depois passa; no passado não", () => {
    expect(validarContato({ ...valido, proximo_contato: HOJE }, HOJE)).toEqual({});
    expect(validarContato({ ...valido, proximo_contato: "2026-10-02" }, HOJE)).toEqual({});
    expect(validarContato({ ...valido, proximo_contato: "2026-09-24" }, HOJE).proximo_contato).toMatch(/passado/);
  });

  it("data que não existe no calendário é inválida, não normalizada", () => {
    // 31/09 viraria 01/10 em silêncio com `instanteNaClinica` (AGENTS.md §7.2).
    expect(validarContato({ ...valido, proximo_contato: "2026-09-31" }, HOJE).proximo_contato).toBe("Data inválida.");
    expect(validarContato({ ...valido, proximo_contato: "25/09/2026" }, HOJE).proximo_contato).toBe("Data inválida.");
  });

  it("normaliza canal e aparas antes de validar", () => {
    expect(normalizarContato({ canal: " WhatsApp ", observacao: "  ok  ", proximo_contato: " 2026-09-26 " })).toEqual({
      canal: "whatsapp",
      observacao: "ok",
      proximo_contato: "2026-09-26",
    });
  });
});

describe("situacaoDoRetorno", () => {
  const HOJE = "2026-09-25";

  it("lê o próximo contato contra o dia da clínica", () => {
    expect(situacaoDoRetorno("qualificado", "2026-09-23", HOJE)).toBe("atrasado");
    expect(situacaoDoRetorno("novo", HOJE, HOJE)).toBe("hoje");
    expect(situacaoDoRetorno("agendamento", "2026-09-26", HOJE)).toBe("futuro");
    expect(situacaoDoRetorno("novo", null, HOJE)).toBe("sem_retorno");
  });

  it("lead encerrado nunca tem retorno, mesmo com data velha", () => {
    expect(situacaoDoRetorno("ganho", "2026-09-20", HOJE)).toBe("encerrado");
    expect(situacaoDoRetorno("perdido", HOJE, HOJE)).toBe("encerrado");
    expect(leadAberto("ganho")).toBe(false);
    expect(leadAberto("perdido")).toBe(false);
    expect(leadAberto("agendamento")).toBe(true);
  });
});

describe("lerFiltroAtencao", () => {
  it("aceita só os quatro recortes; valor torto na URL cai no padrão", () => {
    expect(lerFiltroAtencao("parados")).toBe("parados");
    expect(lerFiltroAtencao("retorno_hoje")).toBe("retorno_hoje");
    expect(lerFiltroAtencao("retorno_atrasado")).toBe("retorno_atrasado");
    expect(lerFiltroAtencao("todos")).toBe("todos");
    expect(lerFiltroAtencao("retorno_ontem")).toBe("todos");
    expect(lerFiltroAtencao("RETORNO_HOJE")).toBe("todos");
    expect(lerFiltroAtencao("")).toBe("todos");
    expect(lerFiltroAtencao(null)).toBe("todos");
    expect(lerFiltroAtencao(undefined)).toBe("todos");
  });

  it("só os retornos saem da coorte do mês", () => {
    expect(recorteDeRetorno("retorno_hoje")).toBe(true);
    expect(recorteDeRetorno("retorno_atrasado")).toBe(true);
    expect(recorteDeRetorno("parados")).toBe(false);
    expect(recorteDeRetorno("todos")).toBe(false);
  });
});
