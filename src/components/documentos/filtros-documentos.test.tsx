import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams("pagina=2&tipo=anamnese"),
}));

const { FiltrosDocumentos } = await import("./filtros-documentos");

beforeEach(() => replace.mockClear());

function montar() {
  return render(<FiltrosDocumentos busca="" situacao="" tipo="anamnese" total={4} />);
}

describe("FiltrosDocumentos", () => {
  it("Enter na busca navega na hora, mantendo o filtro e voltando à primeira página", () => {
    montar();
    const campo = screen.getByRole("searchbox", { name: "Buscar documento por paciente ou título" });
    fireEvent.change(campo, { target: { value: "  ana " } });
    fireEvent.submit(campo.closest("form") as HTMLFormElement);
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/formularios?tipo=anamnese&busca=ana");
  });

  it("sem JavaScript, o formulário monta a mesma URL (GET em /formularios com os nomes dos parâmetros)", () => {
    const { container } = montar();
    const formulario = container.querySelector("form");
    expect(formulario).toHaveAttribute("method", "get");
    expect(formulario).toHaveAttribute("action", "/formularios");
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "busca");
    expect(screen.getByRole("combobox", { name: "Filtrar por situação" })).toHaveAttribute("name", "situacao");
    expect(screen.getByRole("combobox", { name: "Filtrar por tipo" })).toHaveAttribute("name", "tipo");
  });

  it("os selects têm o anel de foco dos controles, não só a troca de cor da borda", () => {
    montar();
    for (const nome of ["Filtrar por situação", "Filtrar por tipo"]) {
      const seletor = screen.getByRole("combobox", { name: nome });
      expect(seletor).toHaveClass("focus-visible:outline-2", "focus-visible:outline-primary");
      expect(seletor).not.toHaveClass("outline-none");
    }
  });
});
