import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

/**
 * Busca em andamento: o indicador de carregamento fica dentro da caixa, no
 * lugar do "limpar" — o recuo direito que o campo reserva para ele. Fora dela
 * (`-right-6`), no celular o campo ocupa a largura do cartão e o ícone passava
 * da borda; mais largo que o recuo (um selo com "buscando" à vista), ele cobre
 * o fim do termo que a pessoa acabou de digitar.
 *
 * O jsdom não calcula layout: as medidas saem das classes do Tailwind
 * (1 unidade = 0,25rem = 4 px) e o indicador é comparado com o recuo do
 * próprio campo, não com um valor fixo.
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

const PX_POR_UNIDADE = 4;

/**
 * Todos os valores de `prefixo-N` em px, com ou sem variante (`sm:right-3`,
 * `max-sm:size-9`), inclusive valor arbitrário (`right-[10px]`). A conta usa o
 * pior caso entre eles: uma variante que empurra o indicador no celular não
 * escapa só porque a classe base está certa. `-right-*` não entra aqui: o
 * deslocamento negativo é reprovado à parte, com ou sem variante.
 */
function valoresEmPixels(classes: string, prefixo: string): number[] {
  const escala = new RegExp(`^(?:\\S*:)?${prefixo}-(\\d+(?:\\.\\d+)?)$`);
  const arbitrario = new RegExp(`^(?:\\S*:)?${prefixo}-\\[(\\d+(?:\\.\\d+)?)(px|rem)\\]$`);
  const valores: number[] = [];
  for (const classe of classes.split(/\s+/)) {
    const naEscala = escala.exec(classe);
    if (naEscala) valores.push(Number(naEscala[1]) * PX_POR_UNIDADE);
    const livre = arbitrario.exec(classe);
    if (livre) valores.push(Number(livre[1]) * (livre[2] === "rem" ? 16 : 1));
  }
  return valores;
}

/** Texto que aparece na tela: o que é só para leitor de tela (`sr-only`) fica de fora. */
function textoVisivel(elemento: Element): string {
  return Array.from(elemento.childNodes)
    .map((no) => {
      if (no.nodeType === Node.TEXT_NODE) return no.textContent ?? "";
      if (no instanceof Element && !no.classList.contains("sr-only")) return textoVisivel(no);
      return "";
    })
    .join("")
    .trim();
}

describe("BuscaProntuarios — carregando", () => {
  it("o indicador ocupa o lugar do limpar, dentro da caixa", () => {
    const { container } = render(<BuscaProntuarios busca="ana" total={3} />);
    const campo = screen.getByRole("searchbox", { name: "Buscar prontuário por paciente ou título" });
    const giro = container.querySelector(".animate-spin");
    expect(giro).not.toBeNull();

    // A caixa posicionada do indicador (o próprio ícone ou o selo que o
    // envolve) mora junto do campo e se ancora à direita dele, nunca para fora.
    const caixa = giro!.closest(".absolute");
    expect(caixa).not.toBeNull();
    expect(caixa!.parentElement).toBe(campo.parentElement);
    const classes = caixa!.getAttribute("class") ?? "";
    // Nenhum deslocamento negativo, nem com variante (`max-sm:-right-6` jogaria
    // o ícone para fora da borda justo no celular) — nem na caixa, nem no ícone.
    expect(classes).not.toMatch(/-right-/);
    expect(giro!.getAttribute("class")).not.toMatch(/-right-/);

    const recuos = valoresEmPixels(campo.className, "pr");
    const direitas = valoresEmPixels(classes, "right");
    const larguras = [...valoresEmPixels(classes, "size"), ...valoresEmPixels(classes, "w")];
    expect(recuos, "recuo direito do campo (pr-*)").not.toHaveLength(0);
    expect(direitas, "âncora do indicador à direita (right-*)").not.toHaveLength(0);
    expect(larguras, "largura fixa do indicador (size-* ou w-*)").not.toHaveLength(0);

    // Cabe inteiro no recuo direito do campo, onde fica o "limpar", em qualquer
    // largura de tela: não sai da caixa e não cobre o texto digitado.
    const piorDireita = Math.max(...direitas) + Math.max(...larguras);
    expect(piorDireita, "indicador passa do recuo e cobre o termo").toBeLessThanOrEqual(Math.min(...recuos));

    // Nenhum rótulo à vista por cima do termo; texto, só para leitor de tela.
    expect(textoVisivel(caixa!), "texto à vista dentro da caixa de busca").toBe("");
    expect(screen.queryByRole("button", { name: "Limpar busca" })).toBeNull();
  });
});
