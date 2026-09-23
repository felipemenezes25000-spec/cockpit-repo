import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

const PROFISSIONAL = "c0000000-0000-4000-8000-000000000001";
/** 23/09/2026 em São Paulo. */
const DIA = new Date("2026-09-23T15:00:00.000Z");

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("atendimentosDoDia — filtro de profissional", () => {
  it("com o filtro, a consulta pede só a agenda daquela profissional", async () => {
    const falso = supabaseFalso({ atendimentos: { data: [] } });
    banco.cliente = falso.cliente;
    const { atendimentosDoDia } = await import("./agenda");

    await atendimentosDoDia(DIA, PROFISSIONAL);

    expect(falso.passosDe("atendimentos")).toContainEqual({
      metodo: "eq",
      argumentos: ["profissional_id", PROFISSIONAL],
    });
  });

  it("sem filtro, ou com id torto, a agenda é de todas — o texto nunca chega ao banco", async () => {
    for (const filtro of [undefined, null, "todas", "1 or 1=1"]) {
      const falso = supabaseFalso({ atendimentos: { data: [] } });
      banco.cliente = falso.cliente;
      const { atendimentosDoDia } = await import("./agenda");

      await atendimentosDoDia(DIA, filtro);

      expect(falso.passosDe("atendimentos").some((p) => p.metodo === "eq")).toBe(false);
    }
  });

  it("o recorte do dia é o de São Paulo, e a ordem é a do relógio", async () => {
    const falso = supabaseFalso({ atendimentos: { data: [] } });
    banco.cliente = falso.cliente;
    const { atendimentosDoDia } = await import("./agenda");

    await atendimentosDoDia(DIA);

    const passos = falso.passosDe("atendimentos");
    expect(passos).toContainEqual({ metodo: "gte", argumentos: ["inicio", "2026-09-23T03:00:00.000Z"] });
    expect(passos).toContainEqual({ metodo: "lt", argumentos: ["inicio", "2026-09-24T03:00:00.000Z"] });
    expect(passos).toContainEqual({ metodo: "order", argumentos: ["inicio", { ascending: true }] });
  });

  it("falha na leitura vira tela de erro, não agenda vazia", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: { error: { code: "XX000", message: "falha simulada" } },
    }).cliente;
    const { atendimentosDoDia } = await import("./agenda");

    await expect(atendimentosDoDia(DIA)).rejects.toThrow("Não foi possível carregar a agenda.");
  });
});
