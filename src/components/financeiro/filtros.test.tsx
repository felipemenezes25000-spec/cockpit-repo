import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const substituir = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: substituir }),
  usePathname: () => "/financeiro/vendas",
  useSearchParams: () => new URLSearchParams("mes=2026-08"),
}));

const { FiltrosFinanceiro } = await import("./filtros");

function montar() {
  render(
    <FiltrosFinanceiro
      grupos={[]}
      busca={{ param: "busca", placeholder: "Buscar por paciente" }}
    />,
  );
  return screen.getByRole("searchbox", { name: "Buscar por paciente" });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  substituir.mockClear();
});

describe("FiltrosFinanceiro — busca", () => {
  it("navega uma vez só, depois que a pessoa para de digitar, mantendo o mês", () => {
    const campo = montar();
    fireEvent.change(campo, { target: { value: "an" } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(campo, { target: { value: "ana " } });
    act(() => vi.advanceTimersByTime(349));
    expect(substituir).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(substituir).toHaveBeenCalledTimes(1);
    expect(substituir).toHaveBeenCalledWith("/financeiro/vendas?mes=2026-08&busca=ana");
  });

  // Limpar logo depois de digitar não pode deixar a busca antiga agendada
  // voltar para a URL.
  it("limpar a busca cancela a navegação que estava agendada", () => {
    const campo = montar();
    fireEvent.change(campo, { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    act(() => vi.advanceTimersByTime(1000));

    expect(substituir).toHaveBeenCalledTimes(1);
    expect(substituir).toHaveBeenCalledWith("/financeiro/vendas?mes=2026-08");
  });
});
