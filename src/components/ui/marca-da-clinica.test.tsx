import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CLINICA } from "@/lib/nav";
import { MarcaComNome, MarcaDaClinica, SeloDaMarca } from "./marca-da-clinica";

describe("MarcaDaClinica — a logo em uma cor só", () => {
  it("pinta com a cor de onde está e fica fora do leitor de tela", () => {
    const { container } = render(<MarcaDaClinica />);
    const svg = container.querySelector("svg");
    const caminho = svg?.querySelector("path");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(caminho).toHaveAttribute("fill", "currentColor");
    expect(caminho).toHaveAttribute("stroke", "currentColor");
    expect(caminho).toHaveAttribute("fill-rule", "evenodd");
  });

  it("o peso engrossa o traço, e o quadro tem folga para ele não ser cortado", () => {
    const { container } = render(<MarcaDaClinica peso={1.6} />);
    expect(container.querySelector("path")).toHaveAttribute("stroke-width", "1.6");
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "-1 -1 102 102");
  });
});

describe("SeloDaMarca e MarcaComNome — a marca do mesmo jeito em toda tela", () => {
  it("cada tamanho tem o seu quadro e a sua logo, sem classe solta disputando", () => {
    const casos = [
      ["pequeno", "size-10", "size-8"],
      ["medio", "size-12", "size-9.5"],
      ["grande", "size-16", "size-13"],
    ] as const;
    for (const [tamanho, quadro, logo] of casos) {
      const { container, unmount } = render(<SeloDaMarca tamanho={tamanho} />);
      const selo = container.firstElementChild;
      expect(selo).toHaveAttribute("aria-hidden", "true");
      expect(selo?.className).toContain(quadro);
      expect(selo?.querySelector("svg")?.getAttribute("class")).toBe(logo);
      unmount();
    }
  });

  it("com o nome: o leitor de tela lê a clínica e a linha de apoio, não a logo", () => {
    render(<MarcaComNome apoio="Cockpit do consultório" />);
    expect(screen.getByText(CLINICA.nome)).toBeInTheDocument();
    expect(screen.getByText("Cockpit do consultório")).toBeInTheDocument();
  });

  it("na cabine, quadro claro com a logo no azul de texto e apoio no tom da cabine", () => {
    const { container } = render(<MarcaComNome tamanho="grande" tom="cabine" />);
    const selo = container.querySelector('[aria-hidden="true"]');
    expect(selo?.className).toContain("bg-cabine-texto");
    expect(selo?.className).toContain("text-cabine-profunda");
    expect(screen.getByText(CLINICA.descricao).className).toContain("text-cabine-texto-secundario");
  });
});
