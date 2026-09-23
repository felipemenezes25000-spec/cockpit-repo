import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  aniversarioNesteAno,
  chaveDoDia,
  dataDoBanco,
  dataValida,
  diferencaEmDias,
  horaValida,
  hoje,
  inicioDoDia,
  inicioDoDiaSeguinte,
  inicioDoMes,
  inicioDeMesRelativo,
  instanteNaClinica,
  mesmoDia,
  mesmoMes,
  partesDoDia,
  somarDias,
} from "./dates";
import { dataParaColuna, lerMes } from "./periodo";

// O processo roda em UTC (vitest.config.mts), como o servidor da Vercel. São
// Paulo está três horas atrás desde 2019 — sem horário de verão.

const iso = (d: Date) => d.toISOString();

describe("o dia é o de São Paulo, não o do servidor", () => {
  it("23h30 em São Paulo ainda é o mesmo dia, embora já seja amanhã em UTC", () => {
    const instante = new Date("2026-09-23T02:30:00Z");
    expect(partesDoDia(instante)).toEqual({ ano: 2026, mes: 9, dia: 22 });
    expect(chaveDoDia(instante)).toBe("2026-09-22");
  });

  it("a virada do ano acontece às 03h00 UTC", () => {
    expect(chaveDoDia(new Date("2026-01-01T02:59:59Z"))).toBe("2025-12-31");
    expect(chaveDoDia(new Date("2026-01-01T03:00:00Z"))).toBe("2026-01-01");
  });

  it("hora de parede da clínica vira o instante certo", () => {
    expect(iso(instanteNaClinica(2026, 9, 22, 14, 30))).toBe("2026-09-22T17:30:00.000Z");
    expect(iso(instanteNaClinica(2026, 1, 1))).toBe("2026-01-01T03:00:00.000Z");
  });

  it("respeita o fuso histórico: em dezembro de 2018 havia horário de verão (UTC−2)", () => {
    expect(iso(instanteNaClinica(2018, 12, 1, 10, 0))).toBe("2018-12-01T12:00:00.000Z");
    expect(iso(instanteNaClinica(2018, 7, 1, 10, 0))).toBe("2018-07-01T13:00:00.000Z");
  });

  it("início e fim do dia são meia-noite da clínica", () => {
    const madrugadaUtc = new Date("2026-09-23T02:00:00Z");
    expect(iso(inicioDoDia(madrugadaUtc))).toBe("2026-09-22T03:00:00.000Z");
    expect(iso(inicioDoDiaSeguinte(madrugadaUtc))).toBe("2026-09-23T03:00:00.000Z");
  });

  it("colunas date do banco viram meia-noite da clínica", () => {
    expect(iso(dataDoBanco("2026-09-22"))).toBe("2026-09-22T03:00:00.000Z");
    expect(dataParaColuna(dataDoBanco("2026-09-22"))).toBe("2026-09-22");
  });
});

describe("somar dias atravessa mês, ano e fevereiro", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2024-02-28", 1, "2024-02-29"],
    ["2024-02-29", 1, "2024-03-01"],
    ["2025-12-31", 1, "2026-01-01"],
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2026-09-22", 30, "2026-10-22"],
  ])("%s %+i dia(s) é %s", (inicio, dias, esperado) => {
    expect(chaveDoDia(somarDias(dataDoBanco(inicio), dias))).toBe(esperado);
  });

  it("diferença em dias conta o calendário, mesmo num dia de 23 horas", () => {
    expect(diferencaEmDias(dataDoBanco("2026-10-01"), dataDoBanco("2026-09-22"))).toBe(9);
    expect(diferencaEmDias(dataDoBanco("2026-09-22"), dataDoBanco("2026-10-01"))).toBe(-9);
    // 4/11/2018 teve 23 horas em São Paulo (início do horário de verão).
    expect(diferencaEmDias(dataDoBanco("2018-11-05"), dataDoBanco("2018-11-03"))).toBe(2);
  });

  it("mesmo dia e mesmo mês comparam no relógio da clínica", () => {
    expect(mesmoDia(new Date("2026-09-23T02:00:00Z"), new Date("2026-09-22T12:00:00Z"))).toBe(true);
    expect(mesmoDia(new Date("2026-09-23T03:00:00Z"), new Date("2026-09-22T12:00:00Z"))).toBe(false);
    expect(mesmoMes(new Date("2026-10-01T02:00:00Z"), new Date("2026-09-15T12:00:00Z"))).toBe(true);
  });
});

describe("dataValida — o calendário de verdade", () => {
  it.each(["2026-02-28", "2024-02-29", "2026-12-31", "2000-02-29", "1900-01-01"])("%s existe", (d) => {
    expect(dataValida(d)).toBe(true);
  });

  it.each([
    "2026-02-29",
    "2026-02-31",
    "2026-04-31",
    "1900-02-29",
    "2026-13-01",
    "2026-00-10",
    "2026-01-00",
    "2026-1-01",
    "22/09/2026",
    "1899-12-31",
    "",
  ])("%j não existe", (d) => {
    expect(dataValida(d)).toBe(false);
  });

  it("hora de parede de 00:00 a 23:59", () => {
    expect(horaValida("00:00")).toBe(true);
    expect(horaValida("23:59")).toBe(true);
    expect(horaValida("24:00")).toBe(false);
    expect(horaValida("7:30")).toBe(false);
    expect(horaValida("12:60")).toBe(false);
  });
});

describe("datas relativas a hoje", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 15/06/2026, 12h00 em São Paulo.
    vi.setSystemTime(new Date("2026-06-15T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("hoje é a meia-noite da clínica", () => {
    expect(iso(hoje())).toBe("2026-06-15T03:00:00.000Z");
    expect(iso(inicioDoMes())).toBe("2026-06-01T03:00:00.000Z");
    expect(iso(inicioDeMesRelativo(-6))).toBe("2025-12-01T03:00:00.000Z");
    expect(iso(inicioDeMesRelativo(7))).toBe("2027-01-01T03:00:00.000Z");
  });

  it("aniversário neste ano", () => {
    expect(chaveDoDia(aniversarioNesteAno(dataDoBanco("1990-02-28")))).toBe("2026-02-28");
    expect(chaveDoDia(aniversarioNesteAno(dataDoBanco("1985-12-31")))).toBe("2026-12-31");
  });

  it("quem nasceu em 29/02 faz aniversário em 01/03 nos anos não bissextos", () => {
    expect(chaveDoDia(aniversarioNesteAno(dataDoBanco("1992-02-29")))).toBe("2026-03-01");
  });

  it("mês da URL: navegação atravessa o ano", () => {
    const junho = lerMes(undefined);
    expect(junho).toMatchObject({ chave: "2026-06", chaveAnterior: "2026-05", chaveProxima: "2026-07", ehMesAtual: true });

    const dezembro = lerMes("2026-12");
    expect(dezembro).toMatchObject({ chaveAnterior: "2026-11", chaveProxima: "2027-01", ehMesAtual: false });
    expect(iso(dezembro.de)).toBe("2026-12-01T03:00:00.000Z");
    expect(iso(dezembro.ate)).toBe("2027-01-01T03:00:00.000Z");

    expect(lerMes("2026-01").chaveAnterior).toBe("2025-12");
    expect(iso(lerMes("2026-02").ate)).toBe("2026-03-01T03:00:00.000Z");
  });

  it("mês inválido na URL cai no mês corrente", () => {
    for (const valor of ["2026-13", "2026-00", "abc", "1999-05", "2026-6"]) {
      expect(lerMes(valor).chave).toBe("2026-06");
    }
    expect(lerMes(["2026-02", "2026-03"]).chave).toBe("2026-02");
  });
});
