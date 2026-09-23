import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Despesa } from "@/server/consultas/despesas";

const acao = vi.fn(async () => ({ ok: true, mensagem: "Despesa reaberta." }));

vi.mock("@/server/acoes/despesas", () => ({
  mudarSituacaoDespesa: (...argumentos: unknown[]) => acao(...(argumentos as [])),
}));

const { ListaDespesas } = await import("./lista-despesas");

function despesa(parcial: Partial<Despesa>): Despesa {
  return {
    id: "00000000-0000-4000-8000-000000000003",
    descricao: "Aluguel",
    categoria: "estrutura",
    valor: 3500,
    // Meio-dia UTC: o mesmo dia em São Paulo.
    vencimento: new Date("2026-08-10T12:00:00Z"),
    venceEmDias: -10,
    pagoEm: null,
    forma: null,
    situacao: "pendente",
    observacoes: null,
    exemplo: false,
    ...parcial,
  };
}

function clicarReabrir() {
  fireEvent.click(screen.getByRole("button", { name: /reabrir a despesa aluguel/i }));
}

afterEach(() => {
  acao.mockClear();
});

describe("ListaDespesas — Reabrir", () => {
  // Reabrir uma paga apaga `pago_em` e a forma e muda o resultado de caixa de
  // um mês que pode já estar fechado. Era um clique só, sem pergunta.
  it("despesa paga: pergunta antes, dizendo a data, a forma e o mês que mudam", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(
      <ListaDespesas
        despesas={[despesa({ situacao: "paga", pagoEm: new Date("2026-08-12T12:00:00Z"), forma: "pix" })]}
        dataPadrao="2026-09-23"
      />,
    );

    clicarReabrir();

    expect(confirmar).toHaveBeenCalledTimes(1);
    const pergunta = String(confirmar.mock.calls[0][0]);
    expect(pergunta).toContain('Reabrir a despesa "Aluguel"?');
    expect(pergunta).toContain("12/08/2026");
    expect(pergunta).toContain("PIX");
    expect(pergunta).toContain("agosto de 2026");
    expect(pergunta).toMatch(/apagado/);
    // Recusou: nada foi enviado.
    expect(acao).not.toHaveBeenCalled();
  });

  it("despesa cancelada também pergunta, sem falar de pagamento que não houve", () => {
    const confirmar = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ListaDespesas despesas={[despesa({ situacao: "cancelada" })]} dataPadrao="2026-09-23" />);

    clicarReabrir();

    expect(confirmar).toHaveBeenCalledTimes(1);
    const pergunta = String(confirmar.mock.calls[0][0]);
    expect(pergunta).toContain("volta para o que falta pagar");
    expect(pergunta).not.toContain("pagamento de");
    expect(acao).not.toHaveBeenCalled();
  });
});

describe("ListaDespesas — vazia", () => {
  it("vazia por causa dos filtros diz isso, sem convidar a registrar", () => {
    render(<ListaDespesas despesas={[]} dataPadrao="2026-08-20" filtrada />);
    expect(screen.getByText("Nada com estes filtros")).toBeInTheDocument();
    expect(screen.queryByText(/nenhuma despesa neste mês/i)).toBeNull();
    expect(screen.queryByRole("link", { name: /registrar despesa/i })).toBeNull();
  });

  it("mês sem despesa convida a registrar", () => {
    render(<ListaDespesas despesas={[]} dataPadrao="2026-08-20" />);
    expect(screen.getByText("Nenhuma despesa neste mês")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /registrar despesa/i })).toHaveAttribute(
      "href",
      "/financeiro/despesas/nova",
    );
  });
});
