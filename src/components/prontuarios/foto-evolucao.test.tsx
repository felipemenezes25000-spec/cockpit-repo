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
    expect(screen.getByRole("listitem")).toHaveClass("border-card-border", "bg-surface");
    expect(screen.getByRole("img")).not.toHaveClass("opacity-70");
  });
});
