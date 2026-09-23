import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FormularioRecuperacao } from "./formulario-recuperacao";

const resetPasswordForEmail = vi.fn();
const clienteNavegador = vi.fn(() => ({ auth: { resetPasswordForEmail } }));

// O cliente é importado sob demanda (import dinâmico); o mock vale igual.
vi.mock("@/lib/supabase/client", () => ({ clienteNavegador: () => clienteNavegador() }));

beforeEach(() => {
  resetPasswordForEmail.mockReset();
  clienteNavegador.mockClear();
});

describe("FormularioRecuperacao", () => {
  it("só cria o cliente do Supabase no envio", async () => {
    render(<FormularioRecuperacao />);
    expect(clienteNavegador).not.toHaveBeenCalled();

    resetPasswordForEmail.mockResolvedValue({ error: null });
    await userEvent.type(screen.getByLabelText("E-mail"), "  alguem@exemplo.com ");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByRole("status")).toHaveTextContent("Se houver uma conta com esse e-mail");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("alguem@exemplo.com", {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
  });

  it("avisa quando o Auth limita os pedidos (429)", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { status: 429 } });
    render(<FormularioRecuperacao />);
    await userEvent.type(screen.getByLabelText("E-mail"), "alguem@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Aguarde alguns minutos");
    // O erro é do serviço, não do e-mail: o campo não fica marcado inválido.
    expect(screen.getByLabelText("E-mail")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-describedby", "erro-recuperacao");
  });

  it("trata falha de rede como falha de conexão", async () => {
    resetPasswordForEmail.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<FormularioRecuperacao />);
    await userEvent.type(screen.getByLabelText("E-mail"), "alguem@exemplo.com");
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível conectar");
    expect(screen.getByRole("button", { name: "Enviar link" })).toBeEnabled();
  });
});
