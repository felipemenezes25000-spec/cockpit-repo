import { beforeEach, describe, expect, it, vi } from "vitest";

const jarra = vi.hoisted(() => ({ gravados: [] as unknown[][], falhar: false }));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (jarra.falhar) throw new Error("fora de uma requisição");
    return { set: (...argumentos: unknown[]) => jarra.gravados.push(argumentos) };
  },
}));

const { avisarNaProximaTela } = await import("./aviso");

beforeEach(() => {
  jarra.gravados = [];
  jarra.falhar = false;
});

describe("avisarNaProximaTela", () => {
  it("grava só a chave, por pouco tempo, legível pelo navegador", async () => {
    await avisarNaProximaTela("venda-registrada");
    expect(jarra.gravados).toEqual([
      ["cockpit_aviso", "venda-registrada", { path: "/", maxAge: 20, sameSite: "lax", httpOnly: false }],
    ]);
  });

  it("sem requisição, não derruba a gravação que já aconteceu", async () => {
    jarra.falhar = true;
    await expect(avisarNaProximaTela("paciente-cadastrada")).resolves.toBeUndefined();
  });
});
