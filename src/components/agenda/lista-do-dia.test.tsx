import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AtendimentoDoDia } from "@/server/consultas/agenda";

vi.mock("@/server/acoes/agenda", () => ({ mudarSituacao: vi.fn() }));

const { ListaDoDia } = await import("./lista-do-dia");

const ATENDIMENTO: AtendimentoDoDia = {
  id: "a0000000-0000-4000-8000-000000000001",
  inicio: new Date("2026-09-23T13:00:00.000Z"),
  duracaoMin: 45,
  situacao: "agendado",
  paciente: "Aline Bastos",
  pacienteId: "c0000000-0000-4000-8000-000000000003",
  profissional: "Dra. Marina",
  procedimento: "Toxina",
  valor: 900,
  observacoes: null,
};

describe("ListaDoDia", () => {
  it("cada ação diz de quem é: numa lista, “Confirmar” sozinho não basta", () => {
    render(<ListaDoDia atendimentos={[ATENDIMENTO]} dia="2026-09-23" />);

    expect(screen.getByRole("button", { name: "Confirmar: Aline Bastos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancelar atendimento: Aline Bastos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Remarcar ou editar: Aline Bastos" })).toHaveAttribute(
      "href",
      `/agenda/${ATENDIMENTO.id}/editar`,
    );
  });

  it("com filtro de profissional, o link de edição leva o filtro (o salvar volta para ele)", () => {
    const filtro = "d0000000-0000-4000-8000-000000000009";
    render(
      <ListaDoDia
        atendimentos={[ATENDIMENTO]}
        dia="2026-09-23"
        profissional="Dra. Marina"
        profissionalId={filtro}
      />,
    );
    expect(screen.getByRole("link", { name: "Remarcar ou editar: Aline Bastos" })).toHaveAttribute(
      "href",
      `/agenda/${ATENDIMENTO.id}/editar?profissional=${filtro}`,
    );
  });

  it("a situação aparece com ícone e texto — cor nunca sozinha", () => {
    render(<ListaDoDia atendimentos={[{ ...ATENDIMENTO, situacao: "ausente" }]} dia="2026-09-23" />);
    const chip = screen.getByText("Não compareceu");
    expect(chip.querySelector("svg")).not.toBeNull();
  });

  it("dia vazio sem filtro convida a marcar", () => {
    render(<ListaDoDia atendimentos={[]} dia="2026-09-23" />);
    expect(screen.getByText("Nenhum horário neste dia")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Marcar atendimento" })).toHaveAttribute(
      "href",
      "/agenda/novo?dia=2026-09-23",
    );
  });

  it("dia vazio com filtro diz de quem e oferece a agenda de todas", () => {
    render(
      <ListaDoDia
        atendimentos={[]}
        dia="2026-09-23"
        profissional="Dra. Marina"
        enderecoSemFiltro="/agenda?dia=2026-09-23"
      />,
    );
    expect(screen.getByText("Nenhum horário de Dra. Marina neste dia")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver a agenda de todas" })).toHaveAttribute(
      "href",
      "/agenda?dia=2026-09-23",
    );
  });
});
