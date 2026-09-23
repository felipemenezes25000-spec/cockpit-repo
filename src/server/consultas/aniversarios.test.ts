import { beforeEach, describe, expect, it, vi } from "vitest";
import { partesDoDia } from "@/lib/dates";
import { supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function paciente(n: number, mes: number) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    nome: `Paciente ${n}`,
    nome_social: null,
    data_nascimento: `1990-${String(mes).padStart(2, "0")}-15`,
  };
}

describe("aniversariantesDoMes — último atendimento", () => {
  it("manda os ids em lotes de até 100, para a URL não passar do limite do gateway", async () => {
    const { mes } = partesDoDia();
    const pacientes = Array.from({ length: 250 }, (_, i) => paciente(i + 1, mes));
    const falso = supabaseFalso({ pacientes: { data: pacientes }, atendimentos: { data: [] } });
    banco.cliente = falso.cliente;
    const { aniversariantesDoMes } = await import("./aniversarios");

    expect(await aniversariantesDoMes()).toHaveLength(250);

    const lotes = falso.chamadas
      .filter((c) => c.alvo === "atendimentos")
      .map((c) => c.passos.find((p) => p.metodo === "in")?.argumentos[1] as string[]);
    expect(lotes.map((l) => l.length)).toEqual([100, 100, 50]);
    expect(new Set(lotes.flat()).size).toBe(250);
  });

  it("sem aniversariante no mês, nem consulta os atendimentos", async () => {
    const { mes } = partesDoDia();
    const outroMes = (mes % 12) + 1;
    const falso = supabaseFalso({ pacientes: { data: [paciente(1, outroMes)] } });
    banco.cliente = falso.cliente;
    const { aniversariantesDoMes } = await import("./aniversarios");

    expect(await aniversariantesDoMes()).toEqual([]);
    expect(falso.chamadas.some((c) => c.alvo === "atendimentos")).toBe(false);
  });
});
