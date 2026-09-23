import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

const ID = "00000000-0000-4000-8000-000000000002";

function procedimento(usos: number, id = ID) {
  return {
    id,
    nome: "Botox",
    duracao_min: 45,
    valor_padrao: 1200,
    retorno_sugerido_dias: 120,
    ativo: true,
    exemplo: false,
    atendimentos: [{ count: usos }],
  };
}

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("listarProcedimentos — usos", () => {
  // Antes os usos vinham de baixar `procedimento_id` de todos os atendimentos:
  // o PostgREST corta em 1000 linhas, e a contagem parava ali.
  it("a contagem vem do banco, na mesma consulta, e passa de 1000", async () => {
    const falso = supabaseFalso({ procedimentos: { data: [procedimento(1234)] } });
    banco.cliente = falso.cliente;
    const { listarProcedimentos } = await import("./procedimentos");

    const [p] = await listarProcedimentos();

    expect(p.usos).toBe(1234);
    expect(falso.chamadas.map((c) => c.alvo)).toEqual(["procedimentos"]);
    expect(String(falso.passosDe("procedimentos").find((c) => c.metodo === "select")?.argumentos[0])).toContain(
      "atendimentos(count)",
    );
  });

  it("falha na leitura vira tela de erro, não \"0 atendimentos\"", async () => {
    banco.cliente = supabaseFalso({
      procedimentos: { error: { code: "XX000", message: "falha simulada" } },
    }).cliente;
    const { listarProcedimentos } = await import("./procedimentos");

    await expect(listarProcedimentos()).rejects.toThrow("Não foi possível carregar os procedimentos.");
  });
});

describe("procedimentoPorId", () => {
  it("conta os usos do mesmo jeito que a lista", async () => {
    banco.cliente = supabaseFalso({ procedimentos: { data: procedimento(7) } }).cliente;
    const { procedimentoPorId } = await import("./procedimentos");

    expect((await procedimentoPorId(ID))?.usos).toBe(7);
  });

  it("id torto é 404, sem ir ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { procedimentoPorId } = await import("./procedimentos");

    expect(await procedimentoPorId("nao-e-uuid")).toBeNull();
    expect(falso.chamadas).toHaveLength(0);
  });

  it("não existe (ou a RLS esconde) é 404", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { procedimentoPorId } = await import("./procedimentos");

    expect(await procedimentoPorId(ID)).toBeNull();
  });

  it("falha do banco não é \"não existe\": vira tela de erro", async () => {
    banco.cliente = supabaseFalso({
      procedimentos: { error: { code: "XX000", message: "falha simulada" } },
    }).cliente;
    const { procedimentoPorId } = await import("./procedimentos");

    await expect(procedimentoPorId(ID)).rejects.toThrow("Não foi possível carregar o procedimento.");
  });
});
