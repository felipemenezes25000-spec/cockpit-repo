import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A busca navega sozinha depois de uma pausa na digitação. A espera vive no
 * evento de digitação: a sincronização com a URL (voltar no navegador) não
 * pode disparar uma navegação, e uma letra nova cancela a anterior.
 */

const replace = vi.fn();
let consulta = "pagina=3";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(consulta),
}));

const { BuscaProntuarios } = await import("./busca-prontuarios");

function campo() {
  return screen.getByRole("searchbox", { name: "Buscar prontuário por paciente ou título" });
}

beforeEach(() => {
  vi.useFakeTimers();
  replace.mockClear();
  consulta = "pagina=3";
});

afterEach(() => {
  vi.useRealTimers();
});

describe("BuscaProntuarios", () => {
  it("navega uma vez só, com o último termo, e volta para a primeira página", () => {
    render(<BuscaProntuarios busca="" total={0} />);

    fireEvent.change(campo(), { target: { value: "Ma" } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(campo(), { target: { value: "Maria " } });
    act(() => vi.advanceTimersByTime(349));
    expect(replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/prontuarios?busca=Maria");
  });

  it("não navega quando a busca muda pela URL", () => {
    const { rerender } = render(<BuscaProntuarios busca="" total={0} />);
    rerender(<BuscaProntuarios busca="Ana" total={1} />);
    act(() => vi.advanceTimersByTime(1000));

    expect(campo()).toHaveProperty("value", "Ana");
    expect(replace).not.toHaveBeenCalled();
  });

  it("limpar navega na hora e cancela a espera pendente", () => {
    consulta = "busca=Ana";
    render(<BuscaProntuarios busca="Ana" total={1} />);

    fireEvent.change(campo(), { target: { value: "Anab" } });
    fireEvent.click(screen.getByRole("button", { name: "Limpar busca" }));
    act(() => vi.advanceTimersByTime(1000));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/prontuarios");
  });

  it("sair da tela no meio da pausa não navega depois", () => {
    const { unmount } = render(<BuscaProntuarios busca="" total={0} />);
    fireEvent.change(campo(), { target: { value: "Bia" } });
    unmount();
    act(() => vi.advanceTimersByTime(1000));

    expect(replace).not.toHaveBeenCalled();
  });
});
