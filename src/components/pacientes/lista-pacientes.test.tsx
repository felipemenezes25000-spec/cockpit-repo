import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ListaPacientes } from "./lista-pacientes";

describe("ListaPacientes — foco", () => {
  // O link cobre a linha (after:inset-0) sem contorno próprio: o foco de
  // teclado ganha um anel na linha, como a busca do cabeçalho.
  it("a linha mostra o anel de foco quando o link recebe foco de teclado", () => {
    render(
      <ListaPacientes
        busca=""
        pacientes={[
          {
            id: "c0000000-0000-4000-8000-000000000001",
            nome: "Ana Maria",
            nomeSocial: null,
            exibicao: "Ana Maria",
            telefone: null,
            email: null,
            dataNascimento: null,
            ativo: true,
            exemplo: false,
          },
        ]}
      />,
    );
    const linha = screen.getByRole("link", { name: "Ana Maria" }).closest("li");
    expect(linha).toHaveClass("has-[:focus-visible]:outline-2", "has-[:focus-visible]:outline-primary");
  });
});
