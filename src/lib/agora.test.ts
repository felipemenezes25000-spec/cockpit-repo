import { describe, expect, it } from "vitest";
import {
  descreverEspera,
  descreverRestante,
  duracaoPorExtenso,
  retratoDoAgora,
  type AtendimentoDoAgora,
} from "./agora";

const BASE = Date.UTC(2026, 8, 24, 13, 0); // 10:00 em São Paulo
const min = (m: number) => BASE + m * 60_000;

function atendimento(parcial: Partial<AtendimentoDoAgora> & { id: string; inicio: number }): AtendimentoDoAgora {
  return { duracaoMin: 60, situacao: "confirmado", paciente: `Paciente ${parcial.id}`, procedimento: "Limpeza de pele", ...parcial };
}

describe("retratoDoAgora", () => {
  it("dia vazio não tem ninguém em atendimento nem próxima", () => {
    const retrato = retratoDoAgora([], BASE);
    expect(retrato.emAtendimento).toBeNull();
    expect(retrato.proxima).toBeNull();
    expect(retrato.emMin).toBeNull();
    expect(retrato.restantes).toBe(0);
  });

  it("acha quem está em atendimento, quanto já correu e quanto falta", () => {
    const lista = [atendimento({ id: "a", inicio: min(-30), duracaoMin: 60, situacao: "em_atendimento" })];
    const retrato = retratoDoAgora(lista, BASE);
    expect(retrato.emAtendimento?.id).toBe("a");
    expect(retrato.progresso).toBeCloseTo(0.5);
    expect(retrato.faltamMin).toBe(30);
  });

  it("o progresso não passa de 100% quando o atendimento se estende", () => {
    const lista = [atendimento({ id: "a", inicio: min(-90), duracaoMin: 60, situacao: "em_atendimento" })];
    const retrato = retratoDoAgora(lista, BASE);
    expect(retrato.progresso).toBe(1);
    expect(retrato.faltamMin).toBe(-30);
  });

  it("a próxima é a primeira que ainda vai acontecer, fora encerrados", () => {
    const lista = [
      atendimento({ id: "cancelado", inicio: min(20), situacao: "cancelado" }),
      atendimento({ id: "depois", inicio: min(120) }),
      atendimento({ id: "proxima", inicio: min(53), situacao: "aguardando_confirmacao" }),
      atendimento({ id: "concluido", inicio: min(-120), situacao: "concluido" }),
    ];
    const retrato = retratoDoAgora(lista, BASE);
    expect(retrato.proxima?.id).toBe("proxima");
    expect(retrato.emMin).toBe(53);
    expect(retrato.depois?.id).toBe("depois");
    expect(retrato.restantes).toBe(2);
  });

  it("horário que começou sem baixa continua como próxima enquanto não termina", () => {
    const lista = [atendimento({ id: "atrasada", inicio: min(-12), duracaoMin: 45 })];
    const retrato = retratoDoAgora(lista, BASE);
    expect(retrato.proxima?.id).toBe("atrasada");
    expect(retrato.emMin).toBe(-12);
  });

  it("horário que já terminou sem baixa sai da faixa", () => {
    const lista = [atendimento({ id: "esquecida", inicio: min(-120), duracaoMin: 60 })];
    expect(retratoDoAgora(lista, BASE).proxima).toBeNull();
  });
});

describe("frases do agora", () => {
  it("escreve durações por extenso", () => {
    expect(duracaoPorExtenso(45)).toBe("45 min");
    expect(duracaoPorExtenso(60)).toBe("1 h");
    expect(duracaoPorExtenso(130)).toBe("2 h 10 min");
    expect(duracaoPorExtenso(-12)).toBe("12 min");
  });

  it("descreve a espera pela próxima", () => {
    expect(descreverEspera(53)).toBe("em 53 min");
    expect(descreverEspera(0)).toBe("agora");
    expect(descreverEspera(-12)).toBe("horário passou há 12 min");
  });

  it("descreve o que resta do atendimento em curso", () => {
    expect(descreverRestante(1)).toBe("falta 1 min");
    expect(descreverRestante(18)).toBe("faltam 18 min");
    expect(descreverRestante(0)).toBe("termina agora");
    expect(descreverRestante(-5)).toBe("passou 5 min do previsto");
  });
});
