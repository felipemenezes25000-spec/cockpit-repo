import { act, render, screen } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumeroVivo } from "./numero-vivo";

function movimentoReduzido(reduzido: boolean) {
  vi.stubGlobal("matchMedia", (consulta: string) => ({ matches: reduzido && consulta.includes("reduce"), media: consulta }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("NumeroVivo", () => {
  it("vindo pronto do servidor, não volta a zero na hidratação (nada de piscar)", async () => {
    movimentoReduzido(false);
    const caixa = document.createElement("div");
    caixa.innerHTML = renderToString(<NumeroVivo valor={16940} formato="moeda" />);
    document.body.appendChild(caixa);
    expect(caixa.textContent).toMatch(/^R\$\s16\.940,00$/);

    await act(async () => {
      hydrateRoot(caixa, <NumeroVivo valor={16940} formato="moeda" />);
    });
    expect(caixa.textContent).toMatch(/^R\$\s16\.940,00$/);
  });

  it("montado pelo navegador, conta a partir do zero e assenta no valor", async () => {
    movimentoReduzido(false);
    let agora = 0;
    const quadros: FrameRequestCallback[] = [];
    vi.spyOn(performance, "now").mockImplementation(() => agora);
    vi.stubGlobal("requestAnimationFrame", (f: FrameRequestCallback) => quadros.push(f));
    vi.stubGlobal("cancelAnimationFrame", () => {});

    render(<NumeroVivo valor={9} />);
    expect(screen.getByText("0")).toBeInTheDocument();

    await act(async () => {
      agora = 2000;
      while (quadros.length) quadros.shift()!(agora);
    });
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("com movimento reduzido, aparece pronto", () => {
    movimentoReduzido(true);
    render(<NumeroVivo valor={1234} />);
    expect(screen.getByText("1.234")).toBeInTheDocument();
  });
});
