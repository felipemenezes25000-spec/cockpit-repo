import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => null }));

const { descreverSugerido } = await import("./returns-panel");

describe("descreverSugerido — o texto ao lado da fase do retorno", () => {
  it("antes da data sugerida, conta os dias que faltam", () => {
    expect(descreverSugerido("aguardando", 12)).toBe("sugerido em 12 dias");
    expect(descreverSugerido("no_periodo", 1)).toBe("sugerido em 1 dia");
    expect(descreverSugerido("no_periodo", 0)).toBe("sugerido em 0 dias");
  });

  it("no período com a data já passada, não diz 'além do sugerido'", () => {
    // Ao lado de "No período", "15 dias além do sugerido" se contradizia.
    expect(descreverSugerido("no_periodo", -15)).toBe("sugerido há 15 dias");
    expect(descreverSugerido("no_periodo", -1)).toBe("sugerido há 1 dia");
  });

  it("'além do sugerido' fica para quem passou do período", () => {
    expect(descreverSugerido("passou", -40)).toBe("40 dias além do sugerido");
  });
});
