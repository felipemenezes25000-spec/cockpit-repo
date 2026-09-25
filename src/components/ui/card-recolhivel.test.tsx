import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { COOKIE_RECOLHIDOS } from "@/lib/recolhidos";
import { CardRecolhivel, ProvedorDePaineis } from "./card-recolhivel";

function apagarCookie() {
  document.cookie = `${COOKIE_RECOLHIDOS}=; Max-Age=0; Path=/`;
}

afterEach(apagarCookie);

describe("CardRecolhivel", () => {
  it("abre aberto, com o título como botão dentro do h2", () => {
    render(
      <CardRecolhivel id="vg-teste" titulo="Pede atenção" descricao="3 em aberto" acao={<a href="/x">Ver todas</a>}>
        <p>Conteúdo do painel</p>
      </CardRecolhivel>,
    );

    const titulo = screen.getByRole("heading", { level: 2, name: "Pede atenção" });
    const botao = screen.getByRole("button", { name: "Pede atenção" });
    expect(titulo).toContainElement(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    // O botão aponta para o corpo que ele controla.
    const corpo = document.getElementById(botao.getAttribute("aria-controls")!);
    expect(corpo).toContainElement(screen.getByText("Conteúdo do painel"));
    expect(corpo).toHaveAttribute("data-aberto", "true");
  });

  it("recolhe e reabre pelo título, e a ação e a descrição continuam à vista", () => {
    render(
      <ProvedorDePaineis inicial={[]}>
        <CardRecolhivel id="vg-teste" titulo="Caixa" descricao="Movimento do mês" acao={<a href="/financeiro">Abrir financeiro</a>}>
          <p>Números</p>
        </CardRecolhivel>
      </ProvedorDePaineis>,
    );

    const botao = screen.getByRole("button", { name: "Caixa" });
    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(botao.getAttribute("aria-controls")!)).toHaveAttribute("data-aberto", "false");
    expect(screen.getByRole("link", { name: "Abrir financeiro" })).toBeInTheDocument();
    expect(screen.getByText("Movimento do mês")).toBeInTheDocument();
    // A escolha vai para o cookie: a próxima tela já sai recolhida do servidor.
    expect(document.cookie).toContain(`${COOKIE_RECOLHIDOS}=vg-teste`);

    fireEvent.click(botao);
    expect(botao).toHaveAttribute("aria-expanded", "true");
    expect(document.cookie).not.toContain("vg-teste");
  });

  it("começa recolhido quando o servidor diz que está no cookie", () => {
    render(
      <ProvedorDePaineis inicial={["vg-retornos"]}>
        <CardRecolhivel id="vg-retornos" titulo="Voltam em breve">
          <p>Lista</p>
        </CardRecolhivel>
        <CardRecolhivel id="vg-outro" titulo="Outro">
          <p>Outra lista</p>
        </CardRecolhivel>
      </ProvedorDePaineis>,
    );

    expect(screen.getByRole("button", { name: "Voltam em breve" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: "Outro" })).toHaveAttribute("aria-expanded", "true");
  });
});
