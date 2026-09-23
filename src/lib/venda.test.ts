import { describe, expect, it } from "vitest";
import {
  calcularVenda,
  decidirEfeito,
  formaParcela,
  formaUsaCartao,
  FORMAS_EM_ORDEM,
  montarComparativo,
  parcelasValidas,
  recebimentoConfirmado,
  recebimentoEmAberto,
  ROTULO_FORMA,
  situacaoDaConfirmacao,
  taxaDaPrevia,
} from "./venda";

describe("calcularVenda — a conta inteira em centavos", () => {
  it("R$ 1.000,00 em 5x a 6%: taxa R$ 60,00, líquido R$ 940,00", () => {
    expect(calcularVenda({ originalCent: 100_000, descontoCent: 0, taxaBp: 600 })).toEqual({
      originalCent: 100_000,
      descontoCent: 0,
      finalCent: 100_000,
      taxaBp: 600,
      taxaCent: 6000,
      liquidoCent: 94_000,
    });
  });

  it("a taxa incide sobre o valor final, depois do desconto", () => {
    const conta = calcularVenda({ originalCent: 50_000, descontoCent: 5_000, taxaBp: 500 });
    expect(conta).toMatchObject({ finalCent: 45_000, taxaCent: 2250, liquidoCent: 42_750 });
  });

  it("a taxa desconta da clínica, nunca acrescenta para a paciente", () => {
    const conta = calcularVenda({ originalCent: 30_000, descontoCent: 0, taxaBp: 350 });
    if ("erro" in conta) throw new Error(conta.erro);
    expect(conta.finalCent).toBe(30_000);
    expect(conta.liquidoCent).toBeLessThan(conta.finalCent);
    expect(conta.finalCent - conta.taxaCent).toBe(conta.liquidoCent);
  });

  it("R$ 0,01 no cartão: sem taxa, líquido de 1 centavo", () => {
    expect(calcularVenda({ originalCent: 1, descontoCent: 0, taxaBp: 650 })).toMatchObject({
      taxaCent: 0,
      liquidoCent: 1,
    });
  });

  it("confere com o banco: R$ 1.000,01 a 6,5% dá taxa R$ 65,00 e líquido R$ 935,01", () => {
    // Mesmo caso do teste `crédito 3x a 6,5%` de supabase/testes/permissoes.sql.
    expect(calcularVenda({ originalCent: 100_001, descontoCent: 0, taxaBp: 650 })).toMatchObject({
      taxaCent: 6500,
      liquidoCent: 93_501,
    });
  });

  it("desconto integral dá venda de valor zero, sem taxa", () => {
    expect(calcularVenda({ originalCent: 20_000, descontoCent: 20_000, taxaBp: 600 })).toMatchObject({
      finalCent: 0,
      taxaCent: 0,
      liquidoCent: 0,
    });
  });

  it.each([
    [{ originalCent: -1, descontoCent: 0, taxaBp: 0 }, "O valor original não pode ser negativo."],
    [{ originalCent: 100, descontoCent: -1, taxaBp: 0 }, "O desconto não pode ser negativo."],
    [{ originalCent: 100, descontoCent: 101, taxaBp: 0 }, "O desconto não pode passar do valor original."],
    [{ originalCent: 100, descontoCent: 0, taxaBp: 10_001 }, "Taxa fora de 0% a 100%."],
  ])("recusa %j", (entrada, erro) => {
    expect(calcularVenda(entrada)).toEqual({ erro });
  });
});

describe("parcelamento", () => {
  it("só o crédito parcela, até 24 vezes", () => {
    expect(parcelasValidas("credito", 1)).toBe(true);
    expect(parcelasValidas("credito", 24)).toBe(true);
    expect(parcelasValidas("credito", 25)).toBe(false);
    expect(parcelasValidas("credito", 0)).toBe(false);
    expect(parcelasValidas("credito", 1.5)).toBe(false);
    expect(parcelasValidas("debito", 2)).toBe(false);
    expect(parcelasValidas("pix", 3)).toBe(false);
    expect(parcelasValidas("pix", 1)).toBe(true);
  });

  it("cartão é débito e crédito; o resto não tem operadora", () => {
    expect(FORMAS_EM_ORDEM.filter(formaUsaCartao)).toEqual(["debito", "credito"]);
    expect(FORMAS_EM_ORDEM.filter(formaParcela)).toEqual(["credito"]);
  });

  it("toda forma de pagamento tem rótulo", () => {
    for (const forma of FORMAS_EM_ORDEM) expect(ROTULO_FORMA[forma]).toBeTruthy();
  });
});

describe("mudança de forma ou taxa", () => {
  const antes = { forma: "credito" as const, parcelas: 3, taxaBp: 600, taxaCent: 6000, liquidoCent: 94_000 };
  const depois = { forma: "pix" as const, parcelas: 1, taxaBp: 0, taxaCent: 0, liquidoCent: 100_000 };

  it("comparativo mostra quanto a clínica passa a receber a mais ou a menos", () => {
    expect(montarComparativo(antes, depois).diferencaCent).toBe(6000);
    expect(montarComparativo(depois, antes).diferencaCent).toBe(-6000);
  });

  it("previsto é reescrito; confirmado vira ajuste; diferença zero não gera nada", () => {
    expect(decidirEfeito("previsto", 0, 90_000)).toEqual({ tipo: "atualizar_previsto" });
    expect(decidirEfeito("pendente", 0, 90_000)).toEqual({ tipo: "atualizar_previsto" });
    expect(decidirEfeito("recebido", 94_000, 100_000)).toEqual({ tipo: "ajuste", valorCent: 6000 });
    expect(decidirEfeito("recebido_divergencia", 94_000, 90_000)).toEqual({
      tipo: "ajuste",
      valorCent: -4000,
    });
    expect(decidirEfeito("recebido", 94_000, 94_000)).toEqual({ tipo: "nada" });
  });
});

describe("confirmação do recebimento", () => {
  it("divergência é decidida pelo sistema: qualquer centavo diferente do líquido", () => {
    expect(situacaoDaConfirmacao(94_000, 94_000)).toBe("recebido");
    expect(situacaoDaConfirmacao(93_999, 94_000)).toBe("recebido_divergencia");
    expect(situacaoDaConfirmacao(94_001, 94_000)).toBe("recebido_divergencia");
  });

  it("zero digitado é divergência, não recebido (comportamento atual — §8.4)", () => {
    expect(situacaoDaConfirmacao(0, 94_000)).toBe("recebido_divergencia");
    // Venda de valor zero confirmada com zero não diverge.
    expect(situacaoDaConfirmacao(0, 0)).toBe("recebido");
  });

  it("só previsto e pendente estão em aberto; confirmado e cancelado são terminais", () => {
    expect(recebimentoEmAberto("previsto")).toBe(true);
    expect(recebimentoEmAberto("pendente")).toBe(true);
    expect(recebimentoEmAberto("recebido")).toBe(false);
    expect(recebimentoEmAberto("recebido_divergencia")).toBe(false);
    expect(recebimentoEmAberto("cancelado")).toBe(false);

    expect(recebimentoConfirmado("recebido")).toBe(true);
    expect(recebimentoConfirmado("recebido_divergencia")).toBe(true);
    expect(recebimentoConfirmado("cancelado")).toBe(false);
  });
});

describe("mudança depois da confirmação — dívidas contábeis, comportamento atual", () => {
  it("recebimento cancelado não é tocado: a função SQL só enxerga o vivo", () => {
    expect(decidirEfeito("cancelado", 0, 90_000)).toEqual({ tipo: "nada" });
  });

  it("com divergência, a primeira alteração absorve a divergência no ajuste", () => {
    // Líquido previsto R$ 940,00, entrou R$ 900,00. Troca para PIX (líquido
    // R$ 1.000,00): o ajuste é contra o que entrou, não contra o líquido.
    expect(decidirEfeito("recebido_divergencia", 90_000, 100_000)).toEqual({
      tipo: "ajuste",
      valorCent: 10_000,
    });
  });

  it("alteração repetida acumula ajuste: 6% → 3% → 6% deixa +R$ 30,00 (AGENTS.md §13, decisão em aberto)", () => {
    const recebido = 94_000; // R$ 1.000,00 a 6%, confirmado sem divergência
    const primeira = decidirEfeito("recebido", recebido, 97_000); // vai para 3%
    const segunda = decidirEfeito("recebido", recebido, 94_000); // volta para 6%

    expect(primeira).toEqual({ tipo: "ajuste", valorCent: 3000 });
    // A segunda compara de novo com o que entrou e ignora o ajuste anterior:
    // não estorna os R$ 30,00. Se a clínica decidir outra regra, este teste
    // muda junto com a função SQL `venda_alterar_pagamento`.
    expect(segunda).toEqual({ tipo: "nada" });
  });
});

describe("taxaDaPrevia", () => {
  it("sem taxa manual, usa a padrão", () => {
    expect(taxaDaPrevia({ manual: false, textoManual: "", bpPadrao: 650 })).toBe(650);
    expect(taxaDaPrevia({ manual: false, textoManual: "3", bpPadrao: 650 })).toBe(650);
  });

  it("taxa manual vazia não vira 0% nem volta para a padrão", () => {
    expect(taxaDaPrevia({ manual: true, textoManual: "", bpPadrao: 650 })).toBeNull();
    expect(taxaDaPrevia({ manual: true, textoManual: " % ", bpPadrao: 650 })).toBeNull();
  });

  it("taxa manual inválida não é mostrada", () => {
    expect(taxaDaPrevia({ manual: true, textoManual: "abc", bpPadrao: 650 })).toBeNull();
    expect(taxaDaPrevia({ manual: true, textoManual: "101", bpPadrao: 650 })).toBeNull();
  });

  it("taxa manual digitada vale, inclusive 0 explícito", () => {
    expect(taxaDaPrevia({ manual: true, textoManual: "4,5", bpPadrao: 650 })).toBe(450);
    expect(taxaDaPrevia({ manual: true, textoManual: "0", bpPadrao: 650 })).toBe(0);
  });
});
