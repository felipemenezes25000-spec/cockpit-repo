import { describe, expect, it } from "vitest";
import { AVISOS, lerAviso } from "./aviso";

describe("lerAviso", () => {
  it("troca a chave pela frase", () => {
    expect(lerAviso("venda-registrada")).toEqual(AVISOS["venda-registrada"]);
    expect(lerAviso("venda-registrada")?.titulo).toBe("Venda registrada");
  });

  it("ignora vazio, chave desconhecida e nome herdado de objeto", () => {
    expect(lerAviso(null)).toBeNull();
    expect(lerAviso("")).toBeNull();
    expect(lerAviso("nao-existe")).toBeNull();
    // O cookie é editável: "constructor" não pode virar uma frase.
    expect(lerAviso("constructor")).toBeNull();
    expect(lerAviso("__proto__")).toBeNull();
    expect(lerAviso("toString")).toBeNull();
  });

  it("nenhuma frase fala de paciente, valor ou procedimento: o aviso é fixo", () => {
    for (const { titulo, texto } of Object.values(AVISOS)) {
      expect(`${titulo} ${texto}`).not.toMatch(/R\$|\{|\}|\d/);
    }
  });
});
