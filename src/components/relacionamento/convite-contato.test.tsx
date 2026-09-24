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
    const motivo = screen.getByText("Abra o WhatsApp ou copie a mensagem antes de registrar o contato.");
    // Visível: não é texto só de leitor de tela.
    expect(motivo).not.toHaveClass("sr-only");
    expect(motivo).toBeVisible();
    // Ligado ao botão: quem chega nele pelo leitor de tela ouve o motivo.
    expect(botao).toHaveAttribute("aria-describedby", motivo.id);
    expect(botao).toHaveAccessibleDescription("Abra o WhatsApp ou copie a mensagem antes de registrar o contato.");
  });

  it("depois de abrir o WhatsApp, o botão libera e o motivo some", () => {
    render(<ConviteContato pacienteId={PACIENTE} nome="Ana" telefone="11987654321" tipo="avaliacao" />);

    const link = screen.getByRole("link", { name: /Abrir WhatsApp/ });
    link.addEventListener("click", (evento) => evento.preventDefault());
    fireEvent.click(link);

    const botao = screen.getByRole("button", { name: "Marcar como enviada" });
    expect(botao).toBeEnabled();
    expect(screen.queryByText(/antes de registrar/)).toBeNull();
    // Sem dica, sem referência pendurada a um id que não existe mais.
    expect(botao).not.toHaveAttribute("aria-describedby");
  });
});
