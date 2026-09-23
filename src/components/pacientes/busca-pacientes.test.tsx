import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BuscaPacientes } from "./busca-pacientes";

const replace = vi.fn<(url: string) => void>();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(),
}));

function caixa(): HTMLInputElement {
  const campo = screen.getByRole("searchbox", { name: /buscar paciente/i });
  if (!(campo instanceof HTMLInputElement)) throw new Error("busca não é um input");
  return campo;
}

describe("BuscaPacientes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    replace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("busca sozinha depois da pausa na digitação, uma vez só", () => {
    render(<BuscaPacientes busca="" situacao="ativas" total={0} />);

    fireEvent.change(caixa(), { target: { value: "an" } });
    act(() => vi.advanceTimersByTime(200));
    fireEvent.change(caixa(), { target: { value: "ana" } });
    expect(replace).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(350));
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/pacientes?busca=ana");
  });

  // A URL volta sem o espaço final. Antes, a caixa era reescrita com ela e
  // quem pausava depois de "ana " para digitar o sobrenome perdia o espaço.
  it("não apaga o que foi digitado quando a URL responde à própria busca", () => {
    const { rerender } = render(<BuscaPacientes busca="" situacao="ativas" total={0} />);

    fireEvent.change(caixa(), { target: { value: "ana " } });
    act(() => vi.advanceTimersByTime(350));
    expect(replace).toHaveBeenCalledWith("/pacientes?busca=ana");

    fireEvent.change(caixa(), { target: { value: "ana s" } });
    rerender(<BuscaPacientes busca="ana" situacao="ativas" total={3} />);

    expect(caixa().value).toBe("ana s");
  });

  it("acompanha a URL quando ela muda por fora (voltar no navegador)", () => {
    const { rerender } = render(<BuscaPacientes busca="ana" situacao="ativas" total={3} />);

    rerender(<BuscaPacientes busca="bia" situacao="ativas" total={1} />);
    expect(caixa().value).toBe("bia");

    rerender(<BuscaPacientes busca="" situacao="ativas" total={10} />);
    expect(caixa().value).toBe("");
  });

  it("trocar o filtro cancela a busca agendada e navega uma vez com os dois critérios", () => {
    render(<BuscaPacientes busca="" situacao="ativas" total={0} />);

    fireEvent.change(caixa(), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("radio", { name: "Arquivadas" }));
    act(() => vi.advanceTimersByTime(1000));

    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/pacientes?busca=ana&situacao=arquivadas");
  });
});
