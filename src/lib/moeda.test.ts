import { describe, expect, it } from "vitest";
import { lerCentavos, lerValorEmReais } from "./atendimento";
import {
  bpDoBanco,
  bpParaBanco,
  centavosDoBanco,
  centavosParaBanco,
  centavosParaReais,
  custoDaTaxa,
  formatarPercentual,
  lerPercentual,
  paraCentavos,
  percentualInformado,
  somaEmCentavos,
} from "./moeda";

describe("lerCentavos — o que a recepção digita", () => {
  it.each([
    ["150", 15000],
    ["150,5", 15050],
    ["150,50", 15050],
    ["1.250,00", 125000],
    ["1250,00", 125000],
    ["1 250,00", 125000],
    [",50", 50],
    ["R$ 150", 15000],
    ["r$150,00", 15000],
    ["150.50", 15050],
    ["150.5", 15050],
    ["1.250", 125000],
    ["0,01", 1],
    ["0,29", 29],
    ["1.000.000,00", 100_000_000],
    ["  12,3  ", 1230],
    ["", 0],
  ])("%j vira %i centavos", (texto, centavos) => {
    expect(lerCentavos(texto)).toBe(centavos);
  });

  it.each([
    "1.2.3",
    "1.250.5",
    "150,555",
    "1,250.00",
    "1,2,3",
    "0.001",
    "-5",
    "12a",
    "abc",
    "1.000.000,01",
    "9999999999",
  ])("recusa %j em vez de adivinhar", (texto) => {
    expect(lerCentavos(texto)).toBeNull();
  });

  it("não sofre com ponto flutuante: 0,29 é 29, não 28", () => {
    // 0.29 * 100 === 28.999999999999996 em ponto flutuante.
    expect(lerCentavos("0,29")).toBe(29);
    expect(paraCentavos("1,15")).toBe(115);
  });

  it("lerValorEmReais devolve reais para a coluna numeric", () => {
    expect(lerValorEmReais("1.250,50")).toBe(1250.5);
    expect(lerValorEmReais("xyz")).toBeNull();
  });
});

describe("conversões com o banco", () => {
  it("centavos ↔ numeric(10,2)", () => {
    expect(centavosDoBanco(0.29)).toBe(29);
    expect(centavosDoBanco(1250.5)).toBe(125050);
    expect(centavosParaBanco(125050)).toBe(1250.5);
    expect(centavosParaBanco(1)).toBe(0.01);
  });

  it("pontos-base ↔ numeric(5,2)", () => {
    expect(bpDoBanco(6.5)).toBe(650);
    expect(bpDoBanco(0.35)).toBe(35);
    expect(bpParaBanco(650)).toBe(6.5);
  });
});

describe("lerPercentual", () => {
  it.each([
    ["6", 600],
    ["6,5", 650],
    ["6.5", 650],
    ["6,55", 655],
    ["6%", 600],
    ["100", 10_000],
    ["0", 0],
    ["", 0],
  ])("%j vira %i bp", (texto, bp) => {
    expect(lerPercentual(texto)).toBe(bp);
  });

  it.each(["100,01", "6,555", "abc", "-1", "1000"])("recusa %j", (texto) => {
    expect(lerPercentual(texto)).toBeNull();
  });
});

describe("custoDaTaxa — um arredondamento por operação", () => {
  it("R$ 1.000,00 a 6% é R$ 60,00", () => {
    expect(custoDaTaxa(100_000, 600)).toBe(6000);
  });

  it("R$ 0,01 a 6,5% não tem taxa (0,065 centavo arredonda para 0)", () => {
    expect(custoDaTaxa(1, 650)).toBe(0);
  });

  it("R$ 1.000,01 a 6,5%: 6.500,065 centavos arredondam para 6.500", () => {
    expect(custoDaTaxa(100_001, 650)).toBe(6500);
  });

  it("meio centavo arredonda para cima, como o round() do Postgres", () => {
    // 1 × 5000 / 10000 = 0,5
    expect(custoDaTaxa(1, 5000)).toBe(1);
    // 8 × 650 / 10000 = 0,52
    expect(custoDaTaxa(8, 650)).toBe(1);
  });

  it("taxa zero não custa nada, e 100% custa tudo", () => {
    expect(custoDaTaxa(12_345, 0)).toBe(0);
    expect(custoDaTaxa(12_345, 10_000)).toBe(12_345);
  });
});

describe("formatarPercentual", () => {
  it.each([
    [650, "6,5%"],
    [600, "6%"],
    [655, "6,55%"],
    [1000, "10%"],
    [10_000, "100%"],
    [0, "0%"],
  ])("%i bp é %s", (bp, texto) => {
    expect(formatarPercentual(bp)).toBe(texto);
  });
});

describe("lerPercentual lê dígitos, sem ponto flutuante", () => {
  it.each([
    ["0,07", 7],
    ["1,1", 110],
    ["4,35", 435],
    ["100,00", 10_000],
    [" 2,49 % ", 249],
  ])("%j vira %i bp", (texto, bp) => {
    expect(lerPercentual(texto)).toBe(bp);
  });

  it("todo percentual de duas casas entre 0 e 100 volta exato", () => {
    for (let bp = 0; bp <= 10_000; bp++) {
      const texto = `${Math.floor(bp / 100)},${String(bp % 100).padStart(2, "0")}`;
      expect(lerPercentual(texto)).toBe(bp);
    }
  });

  it("vazio é 0 bp, mas não conta como informado", () => {
    expect(lerPercentual("")).toBe(0);
    expect(percentualInformado("")).toBe(false);
    expect(percentualInformado(" % ")).toBe(false);
    expect(percentualInformado("0")).toBe(true);
  });
});

describe("somaEmCentavos — somar o que vem do banco sem resto de float", () => {
  it("0,10 + 0,20 é 30 centavos, não 30,000000000000004", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(somaEmCentavos([0.1, 0.2])).toBe(30);
  });

  it("mil parcelas de R$ 0,01 fecham R$ 10,00 exatos", () => {
    const total = somaEmCentavos(Array.from({ length: 1000 }, () => 0.01));
    expect(total).toBe(1000);
    expect(centavosParaReais(total)).toBe(10);
  });

  it("aceita texto do numeric, ignora nulo e soma negativo (ajuste)", () => {
    expect(somaEmCentavos(["1500.50", null, undefined, -30, 0.01])).toBe(147_051);
  });

  it("lista vazia é zero", () => {
    expect(somaEmCentavos([])).toBe(0);
  });
});
