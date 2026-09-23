import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListaMovimentacoes } from "./lista-movimentacoes";

describe("ListaMovimentacoes — vazia", () => {
  it("vazia por causa do filtro de tipo não diz que o mês está vazio", () => {
    render(<ListaMovimentacoes itens={[]} filtrada />);
    expect(screen.getByText("Nada com estes filtros")).toBeInTheDocument();
    expect(screen.queryByText(/nenhuma movimentação neste mês/i)).toBeNull();
  });

  it("mês sem movimento diz que o mês está vazio", () => {
    render(<ListaMovimentacoes itens={[]} />);
    expect(screen.getByText("Nenhuma movimentação neste mês")).toBeInTheDocument();
  });
});
