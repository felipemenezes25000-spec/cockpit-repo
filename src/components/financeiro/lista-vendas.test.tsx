import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListaVendas } from "./lista-vendas";
import type { VendaDaLista } from "@/server/consultas/vendas";

function venda(parcial: Partial<VendaDaLista>): VendaDaLista {
  return {
    id: "00000000-0000-4000-8000-000000000010",
    paciente: "Paciente Teste",
    procedimento: "Limpeza de pele",
    dataVenda: new Date("2026-08-10T12:00:00Z"),
    forma: "pix",
    parcelas: 1,
    valorFinal: 300,
    taxaValor: 0,
    valorLiquido: 300,
    taxaManual: false,
    situacaoRecebimento: "previsto",
    exemplo: false,
    ...parcial,
  };
}

describe("ListaVendas — situação", () => {
  // Sem recebimento vivo, o filtro "Canceladas" já trata a venda como
  // cancelada; a linha não dizia nada e parecia uma venda comum.
  it("marca como cancelada a venda sem recebimento vivo", () => {
    render(<ListaVendas vendas={[venda({ situacaoRecebimento: null })]} />);
    expect(screen.getByText("Cancelado")).toBeTruthy();
  });

  it("mostra a situação do recebimento vivo", () => {
    render(<ListaVendas vendas={[venda({ situacaoRecebimento: "recebido" })]} />);
    expect(screen.getByText("Recebido")).toBeTruthy();
    expect(screen.queryByText("Cancelado")).toBeNull();
  });
});

describe("ListaVendas — foco", () => {
  // O link é a linha inteira (after:inset-0) e fica sem contorno próprio; o
  // foco de teclado precisa de um anel na linha, não só da troca de cor da
  // borda de 1 px.
  it("a linha mostra o anel de foco quando o link recebe foco de teclado", () => {
    render(<ListaVendas vendas={[venda({})]} />);
    const linha = screen.getByRole("link", { name: "Paciente Teste" }).closest("li");
    expect(linha).toHaveClass(
      "has-[:focus-visible]:outline-2",
      "has-[:focus-visible]:outline-offset-2",
      "has-[:focus-visible]:outline-primary",
    );
  });
});
