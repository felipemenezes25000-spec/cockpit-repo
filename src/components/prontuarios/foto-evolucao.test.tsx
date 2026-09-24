import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ImagemDoProntuario } from "@/server/consultas/prontuario-imagens";

vi.mock("@/server/acoes/prontuario-imagens", () => ({
  alternarArquivamentoImagem: vi.fn(),
  atualizarImagem: vi.fn(),
  eliminarImagem: vi.fn(),
}));

const { FotoDaEvolucao } = await import("./foto-evolucao");

function imagem(parcial: Partial<ImagemDoProntuario>): ImagemDoProntuario {
  return {
    id: "e0000000-0000-4000-8000-000000000001",
    caminho: "p/1.jpg",
    nomeOriginal: "1.jpg",
    tipoMime: "image/jpeg",
    tamanhoBytes: 120_000,
    largura: 800,
    altura: 600,
    legenda: "",
    dataCaptura: new Date("2026-09-20T12:00:00Z"),
    dataCapturaCampo: "2026-09-20",
    ordem: 0,
    arquivada: false,
    criadoEm: new Date("2026-09-20T12:00:00Z"),
    criadoPor: null,
    exemplo: false,
    url: "https://exemplo.invalid/1.jpg",
    ...parcial,
  };
}

describe("FotoDaEvolucao — arquivada", () => {
  it("o cartão não esmaece o texto: borda tracejada e fundo recuado; só a foto fica translúcida", () => {
    render(
      <ul>
        <FotoDaEvolucao
          imagem={imagem({ arquivada: true })}
          prontuarioId="f0000000-0000-4000-8000-000000000001"
          hojeNaClinica="2026-09-23"
        />
      </ul>,
    );
    const cartao = screen.getByRole("listitem");
    expect(cartao.className).not.toMatch(/opacity-/);
    expect(cartao).toHaveClass("border-dashed", "bg-surface-container-low");
    expect(screen.getByText("Sem legenda").closest("[class*='opacity-']")).toBeNull();
    expect(screen.getByRole("img")).toHaveClass("opacity-70");
    // Cor nunca comunica sozinha (§7.4): o estado também vem escrito.
    expect(screen.getByText(/·\s*arquivada/)).toBeInTheDocument();
  });

  it("ativa segue com o cartão normal", () => {
    render(
      <ul>
        <FotoDaEvolucao
          imagem={imagem({})}
          prontuarioId="f0000000-0000-4000-8000-000000000001"
          hojeNaClinica="2026-09-23"
        />
      </ul>,
    );
    const cartao = screen.getByRole("listitem");
    const classes = Array.from(cartao.classList);
    // Cartão normal: borda do token de cartão e fundo de superfície, com ou sem
    // opacidade de vidro — o que importa é a família do token, não o alfa.
    expect(classes).toContainEqual(expect.stringMatching(/^border-card-border(\/\d+)?$/));
    expect(classes).toContainEqual(expect.stringMatching(/^bg-surface(\/\d+)?$/));
    // E nada do que distingue a arquivada.
    expect(cartao).not.toHaveClass("border-dashed");
    expect(cartao).not.toHaveClass("bg-surface-container-low");
    expect(cartao.className).not.toMatch(/(^|\s)opacity-/);
    expect(screen.queryByText(/·\s*arquivada/)).toBeNull();
    expect(screen.getByRole("img")).not.toHaveClass("opacity-70");
  });
});
