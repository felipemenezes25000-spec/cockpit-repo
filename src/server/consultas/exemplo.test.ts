import { beforeEach, describe, expect, it, vi } from "vitest";
import { linhaDeRegistro, supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("temDadosDeExemplo", () => {
  it("há paciente de exemplo: mostra a faixa", async () => {
    // O PostgREST devolve `count` junto de `data`; o falso só entrega `data`
    // e `error`, então o número vem pelo construtor.
    banco.cliente = {
      from: () => ({
        select: () => ({ eq: async () => ({ count: 3, error: null }) }),
      }),
    };
    const { temDadosDeExemplo } = await import("./exemplo");
    expect(await temDadosDeExemplo()).toBe(true);
  });

  it("nenhum paciente de exemplo: esconde a faixa", async () => {
    banco.cliente = {
      from: () => ({
        select: () => ({ eq: async () => ({ count: 0, error: null }) }),
      }),
    };
    const { temDadosDeExemplo } = await import("./exemplo");
    expect(await temDadosDeExemplo()).toBe(false);
  });

  it("consulta falhou: a faixa NÃO some e a falha é registrada", async () => {
    banco.cliente = supabaseFalso({
      pacientes: { error: { code: "XX000", message: "falha simulada" } },
    }).cliente;
    const { temDadosDeExemplo } = await import("./exemplo");

    expect(await temDadosDeExemplo()).toBe(true);
    // O formato da linha de log é de `lib/registro.ts`; aqui importa que
    // o contexto e o código cheguem a ela.
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("exemplo", "XX000"));
  });
});
