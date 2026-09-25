import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lerMes } from "@/lib/periodo";
import { linhaDeRegistro, supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const LEADS_DO_MES = [
  // Ganho com venda do mês: entra na receita atribuída.
  { id: "l1", origem: "Instagram", campanha: "Botox", etapa: "ganho", venda_id: "v1", criado_em: "2026-09-02T13:00:00Z", atualizado_em: "2026-09-20T13:00:00Z" },
  // Ganho com venda de outro mês: a venda não está no faturamento do período.
  { id: "l2", origem: "Google", campanha: null, etapa: "ganho", venda_id: "v-agosto", criado_em: "2026-09-03T13:00:00Z", atualizado_em: "2026-09-20T13:00:00Z" },
  { id: "l3", origem: "Instagram", campanha: "Botox", etapa: "qualificado", venda_id: null, criado_em: "2026-09-05T13:00:00Z", atualizado_em: "2026-09-10T13:00:00Z" },
];

describe("painelCaptacao — retornos e atribuição", () => {
  it("retornos são contados no banco, na carteira aberta inteira, com o dia da clínica", async () => {
    const falso = supabaseFalso({
      metas_comerciais: { data: null },
      leads: [{ data: null, count: 3 }, { data: null, count: 2 }, { data: LEADS_DO_MES }],
      lead_etapas: { data: [] },
      vendas: { data: [{ id: "v1", valor_final: 1500 }, { id: "v9", valor_final: 500 }] },
    });
    banco.cliente = falso.cliente;
    const { painelCaptacao } = await import("./captacao");

    const painel = await painelCaptacao(lerMes("2026-09"));

    expect(painel.retornosHoje).toBe(3);
    expect(painel.retornosAtrasados).toBe(2);
    for (const [indice, comparacao] of [[0, "eq"], [1, "lt"]] as const) {
      const passos = falso.passosDe("leads", indice);
      expect(passos).toContainEqual({ metodo: "select", argumentos: ["id", { count: "exact", head: true }] });
      expect(passos).toContainEqual({ metodo: "filter", argumentos: ["proximo_contato", comparacao, "2026-09-25"] });
      expect(passos).toContainEqual({ metodo: "not", argumentos: ["etapa", "in", "(ganho,perdido)"] });
      // Sem recorte do mês de entrada.
      expect(passos.some((p) => p.argumentos[0] === "criado_em")).toBe(false);
    }

    // Receita atribuída só com venda real do período, ligada a um lead da coorte.
    expect(painel.faturamentoAtual).toBe(2000);
    expect(painel.receitaAtribuida).toBe(1500);
    expect(painel.receitaSemAtribuicao).toBe(500);
    expect(painel.percentualReceitaAtribuida).toBe(75);
    expect(painel.leadsAbertos).toBe(1);
    // l3 está parado desde o dia 10.
    expect(painel.leadsParados).toBe(1);
  });

  it("banco sem as colunas da 0030 (42703): a tela pede a migração, não quebra", async () => {
    const falso = supabaseFalso({
      metas_comerciais: { data: null },
      leads: { error: { code: "42703", message: "column leads.proximo_contato does not exist" } },
    });
    banco.cliente = falso.cliente;
    const { painelCaptacao } = await import("./captacao");

    const painel = await painelCaptacao(lerMes("2026-09"));

    expect(painel.estruturaDisponivel).toBe(false);
    expect(falso.passosDe("vendas")).toHaveLength(0);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("outra falha ao contar retornos vira tela de erro, não zero", async () => {
    banco.cliente = supabaseFalso({
      metas_comerciais: { data: null },
      leads: { error: { code: "XX000", message: "falha simulada" } },
    }).cliente;
    const { painelCaptacao } = await import("./captacao");

    await expect(painelCaptacao(lerMes("2026-09"))).rejects.toThrow("Não foi possível carregar o funil de captação.");
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta captação: retornos", "XX000"));
  });
});
