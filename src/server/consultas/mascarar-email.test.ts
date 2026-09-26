import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/server", () => ({ clienteServidor: vi.fn(), clienteAnonimo: vi.fn() }));

const { mascararEmail } = await import("./documentos");

describe("mascararEmail — a ficha mostra para onde vai o código, sem expor o endereço", () => {
  it("mesma regra do banco (0032)", () => {
    expect(mascararEmail("beatriz@exemplo.com")).toBe("b•••••z@exemplo.com");
    expect(mascararEmail("ana@exemplo.com")).toBe("a••a@exemplo.com");
    expect(mascararEmail("jo@exemplo.com")).toBe("j••@exemplo.com");
    expect(mascararEmail("maria.fernanda.souza@exemplo.com")).toBe("m••••••a@exemplo.com");
  });

  it("vazio ou sem arroba não vira máscara", () => {
    expect(mascararEmail(null)).toBeNull();
    expect(mascararEmail("")).toBeNull();
    expect(mascararEmail("@exemplo.com")).toBeNull();
    expect(mascararEmail("semarroba")).toBeNull();
  });
});
