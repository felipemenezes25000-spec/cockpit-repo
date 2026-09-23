import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/acoes/relacionamento", () => ({ registrarContato: vi.fn() }));

const { ConviteContato } = await import("./convite-contato");

const PACIENTE = "c0000000-0000-4000-8000-000000000001";

describe("ConviteContato — Marcar como enviada", () => {
  it("indisponível antes de abrir o WhatsApp, com o motivo à vista e ligado ao botão", () => {
    render(<ConviteContato pacienteId={PACIENTE} nome="Ana" telefone="11987654321" tipo="avaliacao" />);

    const botao = screen.getByRole("button", { name: "Marcar como enviada" });
    expect(botao).toBeDisabled();
    const motivo = screen.getByText("Abra o WhatsApp ou copie a mensagem antes de registrar.");
    // Visível: não é texto só de leitor de tela.
    expect(motivo).not.toHaveClass("sr-only");
    expect(botao).toHaveAttribute("aria-describedby", motivo.id);
  });

  it("depois de abrir o WhatsApp, o botão libera e o motivo some", () => {
    render(<ConviteContato pacienteId={PACIENTE} nome="Ana" telefone="11987654321" tipo="avaliacao" />);

    const link = screen.getByRole("link", { name: /Abrir WhatsApp/ });
    link.addEventListener("click", (evento) => evento.preventDefault());
    fireEvent.click(link);

    expect(screen.getByRole("button", { name: "Marcar como enviada" })).toBeEnabled();
    expect(screen.queryByText(/antes de registrar/)).toBeNull();
  });
});
