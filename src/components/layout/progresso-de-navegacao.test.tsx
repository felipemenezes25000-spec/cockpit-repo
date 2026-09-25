import { fireEvent, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const { ProgressoDeNavegacao, avisarQueVaiNavegar } = await import("./progresso-de-navegacao");

function tela(links: ReactNode) {
  const resultado = render(
    <>
      <ProgressoDeNavegacao />
      {links}
    </>,
  );
  // O jsdom não navega: cancela na bolha, depois de a barra (na captura) ver o clique.
  for (const link of resultado.container.querySelectorAll("a")) link.addEventListener("click", (evento) => evento.preventDefault());
  return resultado;
}

const barra = () => document.querySelector(".progresso-navegacao");

describe("ProgressoDeNavegacao", () => {
  it("clique num link para outra tela liga a barra", () => {
    const { getByText } = tela(<a href="/agenda">Agenda</a>);
    expect(barra()).toBeNull();
    fireEvent.click(getByText("Agenda"));
    expect(barra()).toHaveAttribute("data-estado", "andando");
    expect(barra()).toHaveAttribute("aria-hidden", "true");
  });

  it("não liga para link de fora, nova aba, Ctrl+clique ou a própria tela", () => {
    const { getByText } = tela(
      <>
        <a href="https://wa.me/5511987654321">Fora</a>
        <a href="/agenda" target="_blank">Nova aba</a>
        <a href="/agenda">Com Ctrl</a>
        <a href="#conteudo">Aqui</a>
      </>,
    );
    for (const nome of ["Fora", "Nova aba", "Aqui"]) fireEvent.click(getByText(nome));
    fireEvent.click(getByText("Com Ctrl"), { ctrlKey: true });
    expect(barra()).toBeNull();
  });

  it("quem navega sem link (atalho de tecla, paleta) também liga", () => {
    tela(null);
    fireEvent(window, new Event("cockpit:navegando"));
    expect(barra()).not.toBeNull();
    avisarQueVaiNavegar();
    expect(barra()).toHaveAttribute("data-estado", "andando");
  });
});
