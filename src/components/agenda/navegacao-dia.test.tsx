import { act, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const roteador = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => roteador }));

const { ESPERA_NAVEGACAO_MS, NavegacaoDia } = await import("./navegacao-dia");

const MARINA = { id: "c0000000-0000-4000-8000-000000000001", nome: "Dra. Marina" };
const JULIA = { id: "c0000000-0000-4000-8000-000000000002", nome: "Dra. Júlia" };

function desenhar(extra: Partial<Parameters<typeof NavegacaoDia>[0]> = {}) {
  return render(
    <NavegacaoDia
      dia="2026-09-23"
      anterior="2026-09-22"
      proximo="2026-09-24"
      ehHoje={false}
      {...extra}
    />,
  );
}

describe("NavegacaoDia — dia e filtro na URL", () => {
  beforeEach(() => {
    roteador.push.mockClear();
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("digitar a data não navega a cada tecla: espera parar e vai uma vez só, para a data final", async () => {
    desenhar();
    const campo = screen.getByLabelText("Escolher o dia");

    // O que o navegador entrega enquanto a pessoa digita o ano.
    for (const valor of ["0002-09-23", "0020-09-23", "0202-09-23", "2027-09-23"]) {
      fireEvent.change(campo, { target: { value: valor } });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100);
      });
    }
    expect(roteador.push).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_NAVEGACAO_MS);
    });
    expect(roteador.push).toHaveBeenCalledTimes(1);
    expect(roteador.push).toHaveBeenCalledWith("/agenda?dia=2027-09-23");
  });

  it("data que não existe (ano pela metade, campo limpo) não navega", async () => {
    desenhar();
    const campo = screen.getByLabelText("Escolher o dia");
    fireEvent.change(campo, { target: { value: "0202-09-23" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_NAVEGACAO_MS * 2);
    });
    fireEvent.blur(campo);
    expect(roteador.push).not.toHaveBeenCalled();
  });

  it("Enter (envio do formulário) navega na hora, sem esperar", () => {
    const { container } = desenhar();
    const campo = screen.getByLabelText("Escolher o dia");
    fireEvent.change(campo, { target: { value: "2026-10-01" } });
    const formulario = container.querySelector("form");
    if (!formulario) throw new Error("formulário não encontrado");
    fireEvent.submit(formulario);
    expect(roteador.push).toHaveBeenCalledWith("/agenda?dia=2026-10-01");
  });

  it("sair do campo navega na hora para a data digitada", () => {
    desenhar();
    const campo = screen.getByLabelText("Escolher o dia");
    fireEvent.change(campo, { target: { value: "2026-10-05" } });
    fireEvent.blur(campo);
    expect(roteador.push).toHaveBeenCalledTimes(1);
    expect(roteador.push).toHaveBeenCalledWith("/agenda?dia=2026-10-05");
  });

  it("digitar e clicar numa seta: só a seta navega (o blur e a espera não disputam com ela)", async () => {
    desenhar();
    const campo = screen.getByLabelText("Escolher o dia");
    fireEvent.change(campo, { target: { value: "2026-10-05" } });

    // A ordem do navegador: pointerdown na seta, blur do campo, clique.
    fireEvent.pointerDown(screen.getByRole("link", { name: "Dia seguinte" }));
    fireEvent.blur(campo);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ESPERA_NAVEGACAO_MS * 2);
    });
    expect(roteador.push).not.toHaveBeenCalled();

    // A marca vale para um blur só: o próximo volta a navegar.
    fireEvent.change(campo, { target: { value: "2026-10-06" } });
    fireEvent.blur(campo);
    expect(roteador.push).toHaveBeenCalledWith("/agenda?dia=2026-10-06");
  });

  it("clique antigo numa seta (com o campo fora de foco) não engole a próxima edição", () => {
    desenhar();
    const campo = screen.getByLabelText("Escolher o dia");
    fireEvent.pointerDown(screen.getByRole("link", { name: "Dia anterior" }));

    fireEvent.focus(campo);
    fireEvent.change(campo, { target: { value: "2026-10-07" } });
    fireEvent.blur(campo);
    expect(roteador.push).toHaveBeenCalledWith("/agenda?dia=2026-10-07");
  });

  it("com uma profissional só, não há filtro", () => {
    desenhar({ profissionais: [MARINA] });
    expect(screen.queryByLabelText("Filtrar por quem atende")).toBeNull();
  });

  it("o filtro vai para a URL e as setas o mantêm", () => {
    desenhar({ profissionais: [MARINA, JULIA], profissional: MARINA.id });

    expect(screen.getByRole("link", { name: "Dia anterior" })).toHaveAttribute(
      "href",
      `/agenda?dia=2026-09-22&profissional=${MARINA.id}`,
    );
    expect(screen.getByRole("link", { name: "Dia seguinte" })).toHaveAttribute(
      "href",
      `/agenda?dia=2026-09-24&profissional=${MARINA.id}`,
    );
    expect(screen.getByRole("link", { name: "Voltar para hoje" })).toHaveAttribute(
      "href",
      `/agenda?profissional=${MARINA.id}`,
    );

    fireEvent.change(screen.getByLabelText("Filtrar por quem atende"), {
      target: { value: JULIA.id },
    });
    expect(roteador.push).toHaveBeenCalledWith(`/agenda?dia=2026-09-23&profissional=${JULIA.id}`);

    fireEvent.change(screen.getByLabelText("Filtrar por quem atende"), {
      target: { value: "" },
    });
    expect(roteador.push).toHaveBeenLastCalledWith("/agenda?dia=2026-09-23");
  });

  it("é um formulário GET de verdade para /agenda, com os campos nomeados", () => {
    const { container } = desenhar({ profissionais: [MARINA, JULIA] });
    const formulario = container.querySelector("form");
    expect(formulario).toHaveAttribute("method", "get");
    expect(formulario).toHaveAttribute("action", "/agenda");
    expect(screen.getByLabelText("Escolher o dia")).toHaveAttribute("name", "dia");
    expect(screen.getByLabelText("Filtrar por quem atende")).toHaveAttribute("name", "profissional");
  });

  it("sem JavaScript aparece o botão Ver; com JavaScript ele sai (a troca já navega)", () => {
    const html = renderToString(
      <NavegacaoDia dia="2026-09-23" anterior="2026-09-22" proximo="2026-09-24" ehHoje />,
    );
    expect(html).toContain(">Ver</button>");

    desenhar();
    expect(screen.queryByRole("button", { name: "Ver" })).toBeNull();
  });
});
