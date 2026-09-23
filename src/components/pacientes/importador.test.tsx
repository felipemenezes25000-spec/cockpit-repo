import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoImportacao } from "@/server/acoes/importar-pacientes";

const importarPacientes = vi.fn<(anterior: EstadoImportacao, dados: FormData) => Promise<EstadoImportacao>>();

vi.mock("@/server/acoes/importar-pacientes", () => ({
  importarPacientes: (anterior: EstadoImportacao, dados: FormData) => importarPacientes(anterior, dados),
}));

const { Importador } = await import("./importador");

const ANALISADO: EstadoImportacao = {
  etapa: "analisado",
  falha: null,
  arquivo: "pacientes.csv",
  codificacao: "utf-8",
  separador: ";",
  colunas: [{ campo: "nome", rotulo: "Nome" }],
  colunasIgnoradas: [],
  linhas: [],
  resumo: { total: 1, prontas: 1, comErro: 0, jaCadastradas: 0 },
  gravadas: 0,
  recusadas: [],
};

/**
 * Envia o formulário como o navegador envia: um `SubmitEvent` com o botão
 * clicado em `submitter`.
 *
 * O clique do user-event não serve aqui: o jsdom confere o `required` do
 * campo de arquivo pela lista interna dele, que o `upload` do user-event não
 * alcança — o envio seria barrado antes de chegar ao React. O que se quer
 * provar é o que acontece DEPOIS do envio; o arquivo de verdade entre as
 * duas etapas é coberto pelo E2E (`e2e/modulos.spec.ts`, importação).
 */
async function enviarCom(nomeDoBotao: RegExp) {
  const botao = screen.getByRole("button", { name: nomeDoBotao });
  const form = botao.closest("form");
  if (!form) throw new Error("botão fora de formulário");
  await act(async () => {
    form.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true, submitter: botao }));
  });
}

describe("Importador — o formulário não é reiniciado entre analisar e importar", () => {
  beforeEach(() => {
    importarPacientes.mockReset();
  });

  it("analisar manda confirmar=nao, e o formulário (com o arquivo) não é reiniciado depois", async () => {
    const reiniciar = vi.spyOn(HTMLFormElement.prototype, "reset");
    importarPacientes
      .mockResolvedValueOnce(ANALISADO)
      .mockResolvedValueOnce({ ...ANALISADO, etapa: "concluido", gravadas: 1 });

    render(<Importador modeloCsv="data:text/csv," />);

    await enviarCom(/Analisar arquivo/);
    await screen.findByText("Confira antes de importar");

    const primeiro = importarPacientes.mock.calls[0]?.[1];
    expect(primeiro?.get("confirmar")).toBe("nao");
    expect(primeiro?.get("arquivo")).toBeInstanceOf(File);

    // O defeito: com `<form action={...}>` o React 19 chamava `reset()` ao
    // fim da ação, e o campo de arquivo (obrigatório) voltava vazio.
    expect(reiniciar).not.toHaveBeenCalled();

    await enviarCom(/Importar 1 paciente/);
    await screen.findByText("Importação concluída");

    expect(importarPacientes.mock.calls[1]?.[1].get("confirmar")).toBe("sim");
    expect(reiniciar).not.toHaveBeenCalled();
  });

  it("trocar o arquivo depois da análise tira o botão Importar e pede nova análise", async () => {
    importarPacientes.mockResolvedValueOnce(ANALISADO).mockResolvedValueOnce({ ...ANALISADO });

    render(<Importador modeloCsv="data:text/csv," />);
    await enviarCom(/Analisar arquivo/);
    await screen.findByRole("button", { name: /Importar 1 paciente/ });

    await act(async () => {
      screen.getByLabelText("Arquivo").dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(screen.queryByRole("button", { name: /Importar 1 paciente/ })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("Analise de novo antes de importar");

    // Uma análise nova devolve o botão.
    await enviarCom(/Analisar arquivo/);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Importar 1 paciente/ })).toBeInTheDocument(),
    );
  });
});
