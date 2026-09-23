import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Busca em andamento: o indicador de carregamento fica dentro da caixa, no
 * lugar do "limpar". Fora dela (`-right-6`), no celular o campo ocupa a
 * largura do cartão e o ícone passava da borda.
 */

vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useTransition: () => [true, (tarefa: () => void) => tarefa()],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("busca=ana"),
}));

const { BuscaProntuarios } = await import("./busca-prontuarios");

describe("BuscaProntuarios — carregando", () => {
  it("o indicador ocupa o lugar do limpar, dentro da caixa", () => {
    const { container } = render(<BuscaProntuarios busca="ana" total={3} />);
    const indicador = container.querySelector(".animate-spin");
    expect(indicador).not.toBeNull();
    expect(indicador?.getAttribute("class")).toContain("right-3.5");
    expect(indicador?.getAttribute("class")).not.toMatch(/-right-/);
    expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
  });
});
