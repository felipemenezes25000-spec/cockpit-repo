import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PulsoComercial } from "./pulso-comercial";

const BASE = {
  faturamentoAtual: 2000,
  receitaAtribuida: 1500,
  receitaSemAtribuicao: 500,
  percentualReceitaAtribuida: 75,
  leadsAbertos: 4,
  leadsParados: 1,
  retornosHoje: 0,
  retornosAtrasados: 0,
  mes: null,
};

describe("PulsoComercial — retornos", () => {
  it("retornos pendentes abrem o recorte da carteira", () => {
    render(<PulsoComercial {...BASE} retornosHoje={2} retornosAtrasados={1} />);

    expect(screen.getByRole("link", { name: /Retornos para hoje/ })).toHaveAttribute(
      "href",
      "/captacao?atencao=retorno_hoje",
    );
    expect(screen.getByRole("link", { name: /Retornos atrasados/ })).toHaveAttribute(
      "href",
      "/captacao?atencao=retorno_atrasado",
    );
    expect(screen.getByRole("link", { name: /Retornos para hoje/ })).toHaveTextContent(/qualquer mês de entrada/);
  });

  it("fora do mês atual, o recorte leva o mês junto", () => {
    render(<PulsoComercial {...BASE} retornosAtrasados={3} mes="2026-08" />);

    expect(screen.getByRole("link", { name: /Retornos atrasados/ })).toHaveAttribute(
      "href",
      "/captacao?mes=2026-08&atencao=retorno_atrasado",
    );
  });

  it("sem retorno pendente não há o que abrir, e o cartão diz isso", () => {
    render(<PulsoComercial {...BASE} />);

    expect(screen.queryByRole("link", { name: /Retornos/ })).toBeNull();
    expect(screen.getByText("Nenhum retorno combinado para hoje.")).toBeInTheDocument();
    expect(screen.getByText("Nenhum retorno vencido na carteira aberta.")).toBeInTheDocument();
  });
});
