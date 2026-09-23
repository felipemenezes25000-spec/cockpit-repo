import { render, screen } from "@testing-library/react";
import { FileText } from "lucide-react";
import { describe, expect, it } from "vitest";
import { estaAlemDoFim, PaginaAlemDoFim } from "./pagina-alem-do-fim";

describe("PaginaAlemDoFim", () => {
  it("só vale quando a página veio vazia e a lista não está", () => {
    expect(estaAlemDoFim({ itens: [], total: 41 })).toBe(true);
    expect(estaAlemDoFim({ itens: [], total: 0 })).toBe(false);
    expect(estaAlemDoFim({ itens: [{}], total: 41 })).toBe(false);
  });

  it("leva à última página, com os filtros da lista", () => {
    render(
      <PaginaAlemDoFim
        icone={FileText}
        total={41}
        paginas={3}
        singular="prontuário"
        plural="prontuários"
        caminho="/prontuarios"
        parametros={{ busca: "ana souza" }}
      />,
    );

    expect(screen.getByText("Esta página não existe mais")).toBeInTheDocument();
    expect(screen.getByText(/41 prontuários em 3 páginas/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir para a página 3" })).toHaveAttribute(
      "href",
      "/prontuarios?busca=ana+souza&pagina=3",
    );
  });

  it("com uma página só, volta à lista sem número de página", () => {
    render(
      <PaginaAlemDoFim
        icone={FileText}
        total={1}
        paginas={1}
        singular="paciente"
        plural="pacientes"
        caminho="/pacientes"
        parametros={{}}
      />,
    );

    expect(screen.getByText(/1 paciente em 1 página\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar à lista" })).toHaveAttribute("href", "/pacientes");
  });
});
