import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { COOKIE_DO_AVISO } from "@/lib/aviso";

vi.mock("next/navigation", () => ({
  usePathname: () => "/financeiro/vendas/1",
  useSearchParams: () => new URLSearchParams(),
}));

const { AvisosDaTela } = await import("./avisos-da-tela");

afterEach(() => {
  document.cookie = `${COOKIE_DO_AVISO}=; Max-Age=0; Path=/`;
  vi.useRealTimers();
});

describe("AvisosDaTela", () => {
  it("mostra a frase da chave deixada pela ação e apaga o cookie", () => {
    document.cookie = `${COOKIE_DO_AVISO}=venda-registrada; Path=/`;
    render(<AvisosDaTela />);

    const regiao = screen.getByRole("status");
    expect(regiao).toHaveTextContent("Venda registrada");
    expect(regiao).toHaveTextContent("Os recebimentos já estão no financeiro.");
    // Lido uma vez: recarregar a página não repete o aviso.
    expect(document.cookie).not.toContain(COOKIE_DO_AVISO);
  });

  it("chave desconhecida não vira aviso, mas a região viva fica na página", () => {
    document.cookie = `${COOKIE_DO_AVISO}=qualquer-coisa; Path=/`;
    render(<AvisosDaTela />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("some sozinho depois de 6,5 s", () => {
    vi.useFakeTimers();
    document.cookie = `${COOKIE_DO_AVISO}=paciente-cadastrada; Path=/`;
    render(<AvisosDaTela />);
    expect(screen.getByText("Cadastro criado")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText("Cadastro criado")).toBeInTheDocument();
    // O tempo acaba e a saída (220 ms) começa.
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText("Cadastro criado")).toBeNull();
  });

  it("o botão fecha na hora", () => {
    vi.useFakeTimers();
    document.cookie = `${COOKIE_DO_AVISO}=horario-que-nao-existe; Path=/`;
    document.cookie = `${COOKIE_DO_AVISO}=atendimento-marcado; Path=/`;
    render(<AvisosDaTela />);
    fireEvent.click(screen.getByRole("button", { name: "Fechar aviso" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText("Horário marcado")).toBeNull();
  });
});
