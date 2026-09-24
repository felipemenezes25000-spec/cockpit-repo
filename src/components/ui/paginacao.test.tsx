import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Paginacao } from "./paginacao";

/** O texto que o leitor de tela lê no elemento: todos os nós juntos, menos o que é `aria-hidden`. */
function textoFalado(elemento: Element): string {
  const copia = elemento.cloneNode(true) as Element;
  copia.querySelectorAll('[aria-hidden="true"]').forEach((oculto) => oculto.remove());
  return (copia.textContent ?? "").replace(/\s+/g, " ").trim();
}

/** Acha o elemento mais interno que o leitor de tela lê como `frase`, mesmo com o texto partido em vários nós. */
const falado = (frase: string) => (_: string, elemento: Element | null) =>
  !!elemento &&
  !elemento.closest('[aria-hidden="true"]') &&
  textoFalado(elemento) === frase &&
  !Array.from(elemento.children).some((filho) => textoFalado(filho) === frase);

describe("Paginacao", () => {
  const props = { paginas: 15, parametros: { busca: "ana" }, caminho: "/pacientes", rotulo: "Paginação dos pacientes" };

  it("os links mantêm a busca e têm nome acessível mesmo com a palavra escondida no celular", () => {
    render(<Paginacao {...props} pagina={12} />);
    const anterior = screen.getByRole("link", { name: "Anterior" });
    const proxima = screen.getByRole("link", { name: "Próxima" });
    expect(anterior).toHaveAttribute("href", "/pacientes?busca=ana&pagina=11");
    expect(proxima).toHaveAttribute("href", "/pacientes?busca=ana&pagina=13");
  });

  it("a 320 px os botões viram ícone: a palavra só aparece a partir de sm", () => {
    // 254 px livres no cartão; com as palavras, os três itens pediam 291 px e
    // "Próxima" passava da borda.
    render(<Paginacao {...props} pagina={12} />);
    for (const nome of ["Anterior", "Próxima"]) {
      const palavra = screen.getByText(nome);
      expect(palavra).toHaveClass("sr-only", "sm:not-sr-only");
    }
    // A pílula mostra "12 de 15" e o leitor de tela ouve "Página 12 de 15"; a contagem não quebra linha.
    const contagem = screen.getByText(falado("Página 12 de 15"));
    expect(contagem).toHaveAttribute("aria-current", "page");
    expect(contagem).toHaveClass("whitespace-nowrap");
  });

  it("uma página só não mostra navegação", () => {
    const { container } = render(<Paginacao {...props} paginas={1} pagina={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
