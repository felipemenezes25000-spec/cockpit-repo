import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const buscar = vi.fn(async (termo: string) => [{ id: "p1", nome: `Achada ${termo}`, detalhe: "" }]);

vi.mock("@/server/acoes/agenda", () => ({
  buscarPacientesParaSelecao: (termo: string) => buscar(termo),
}));

const { SeletorPaciente } = await import("./seletor-paciente");

describe("SeletorPaciente — digitação antes da hidratação", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    buscar.mockClear();
  });

  it("o que foi digitado no HTML do servidor, antes de o React assumir, não se perde", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(<SeletorPaciente inicial={null} />);
    document.body.appendChild(container);

    // Aparelho lento: a pessoa digita no campo ainda sem React.
    const campo = container.querySelector<HTMLInputElement>("#busca-paciente");
    if (!campo) throw new Error("campo não encontrado");
    campo.value = "Carol";

    const erros = vi.spyOn(console, "error");
    vi.useFakeTimers();
    await act(async () => {
      hydrateRoot(container, <SeletorPaciente inicial={null} />);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    vi.useRealTimers();

    expect(campo.value).toBe("Carol");
    expect(buscar).toHaveBeenCalledWith("Carol");
    // Sem aviso de hidratação divergente: o HTML do servidor é o mesmo.
    expect(erros).not.toHaveBeenCalled();
  });
});

describe("SeletorPaciente — reset do formulário", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    buscar.mockClear();
  });

  it("o reset (fim de ação do React 19) esvazia o campo e fecha a lista junto", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    vi.useFakeTimers();
    await act(async () => {
      createRoot(container).render(
        <form>
          <SeletorPaciente inicial={null} />
        </form>,
      );
    });

    const campo = container.querySelector<HTMLInputElement>("#busca-paciente");
    if (!campo) throw new Error("campo não encontrado");
    await act(async () => {
      fireEvent.change(campo, { target: { value: "Carol" } });
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(container.querySelector('[role="option"]')).not.toBeNull();

    await act(async () => {
      container.querySelector("form")?.reset();
      await vi.advanceTimersByTimeAsync(400);
    });
    vi.useRealTimers();

    expect(campo.value).toBe("");
    expect(container.querySelector('[role="option"]')).toBeNull();
    expect(buscar).toHaveBeenCalledTimes(1);
  });
});

describe("SeletorPaciente — teclado e leitor de tela", () => {
  afterEach(() => {
    vi.useRealTimers();
    buscar.mockClear();
  });

  async function digitar(termo: string) {
    vi.useFakeTimers();
    render(
      <form>
        <SeletorPaciente inicial={null} />
      </form>,
    );
    const campo = screen.getByRole("combobox", { name: /Paciente/ });
    await act(async () => {
      fireEvent.change(campo, { target: { value: termo } });
      await vi.advanceTimersByTimeAsync(400);
    });
    return { campo };
  }

  it("quantas foram encontradas é anunciado", async () => {
    await digitar("Carol");
    expect(screen.getByRole("status")).toHaveTextContent("1 paciente encontrada");
  });

  it("escolher com Enter leva o foco para “Trocar a paciente”, não para o body", async () => {
    const { campo } = await digitar("Carol");
    campo.focus();
    await act(async () => {
      fireEvent.keyDown(campo, { key: "ArrowDown" });
    });
    await act(async () => {
      fireEvent.keyDown(campo, { key: "Enter" });
      await vi.advanceTimersByTimeAsync(50);
    });

    const trocar = screen.getByRole("button", { name: "Trocar a paciente (Achada Carol)" });
    expect(document.activeElement).toBe(trocar);
    expect(screen.getByDisplayValue("p1")).toHaveAttribute("name", "paciente_id");
  });

  it("sair do campo com Tab fecha a lista; voltar a ele reabre", async () => {
    const { campo } = await digitar("Carol");
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await act(async () => {
      fireEvent.blur(campo);
    });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(campo).toHaveAttribute("aria-expanded", "false");

    await act(async () => {
      fireEvent.focus(campo);
    });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("o erro do servidor fica ligado ao campo de busca", async () => {
    render(<SeletorPaciente inicial={null} erro="Escolha a paciente." />);
    const campo = screen.getByRole("combobox", { name: /Paciente/ });
    expect(campo).toHaveAttribute("aria-invalid", "true");
    expect(campo).toHaveAccessibleDescription("Escolha a paciente.");
  });
});
