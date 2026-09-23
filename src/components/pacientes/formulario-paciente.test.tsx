import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EstadoPaciente } from "@/server/acoes/pacientes";
import { FormularioPaciente } from "./formulario-paciente";

const acao = vi.fn<(anterior: EstadoPaciente, dados: FormData) => Promise<EstadoPaciente>>();

function origemEnviada(): FormDataEntryValue | null {
  const form = screen.getByRole("combobox", { name: /como conheceu a clínica/i }).closest("form");
  if (!form) throw new Error("campo fora de formulário");
  return new FormData(form).get("origem");
}

describe("FormularioPaciente — origem", () => {
  // A importação grava a origem como texto livre. Sem uma opção para ela, o
  // <select> caía em "—" e salvar a ficha por qualquer outro motivo apagava o
  // dado importado.
  it("mantém a origem importada fora da lista, marcada como importada", () => {
    render(<FormularioPaciente acao={acao} cancelarPara="/pacientes" inicial={{ nome: "Ana Souza", origem: "Facebook" }} />);

    expect(screen.getByRole("option", { name: "Facebook (importada)" })).toBeInTheDocument();
    expect(origemEnviada()).toBe("Facebook");
  });

  it("não inventa opção para origem da lista nem para origem vazia", () => {
    const { unmount } = render(
      <FormularioPaciente acao={acao} cancelarPara="/pacientes" inicial={{ nome: "Ana Souza", origem: "Instagram" }} />,
    );
    expect(screen.queryByRole("option", { name: /\(importada\)/ })).toBeNull();
    expect(origemEnviada()).toBe("Instagram");
    unmount();

    render(<FormularioPaciente acao={acao} cancelarPara="/pacientes" inicial={{ nome: "Ana Souza" }} />);
    expect(screen.queryByRole("option", { name: /\(importada\)/ })).toBeNull();
    expect(origemEnviada()).toBe("");
  });
});
