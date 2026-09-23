import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CampoRespondido } from "@/lib/documento";

// As duas portas de escrita são ações de servidor: aqui só interessa a tela.
vi.mock("@/server/acoes/documentos", () => ({ responderAnamnese: vi.fn() }));
vi.mock("@/server/acoes/assinatura-link", () => ({ responderPorLink: vi.fn() }));

const { FormularioAnamnese } = await import("./formulario-anamnese");

function campo(mudanca: Partial<CampoRespondido>): CampoRespondido {
  return {
    chave: "alergia",
    rotulo: "Tem alergia a algum medicamento?",
    tipo: "sim_nao",
    obrigatorio: true,
    ajuda: "",
    opcoes: [],
    resposta: null,
    respostas: null,
    ...mudanca,
  };
}

const CAMPOS: CampoRespondido[] = [
  campo({ ajuda: "Inclui anestésico local." }),
  campo({
    chave: "pele",
    rotulo: "Tipo de pele",
    tipo: "escolha_unica",
    obrigatorio: false,
    opcoes: ["Seca", "Oleosa", "Mista"],
  }),
  campo({
    chave: "sintomas",
    rotulo: "Sintomas nos últimos dias",
    tipo: "escolha_multipla",
    obrigatorio: true,
    opcoes: ["Febre", "Tosse"],
  }),
];

function renderizar(somenteLeitura = false) {
  return render(
    <FormularioAnamnese
      campos={CAMPOS}
      destino={{ tipo: "consulta", documentoId: "d0000000-0000-4000-8000-000000000001" }}
      somenteLeitura={somenteLeitura}
    />,
  );
}

describe("FormularioAnamnese — perguntas de marcar são grupos acessíveis", () => {
  it("sim/não é um grupo de rádios com o nome da pergunta, a dica e o obrigatório", () => {
    renderizar();

    const grupo = screen.getByRole("radiogroup", { name: /Tem alergia a algum medicamento\?/ });
    expect(grupo).toHaveAccessibleDescription("Inclui anestésico local.");
    expect(grupo).toHaveAttribute("aria-required", "true");

    // Rádio de verdade, com nome — e não "Sim, botão" sem pergunta.
    expect(within(grupo).getByRole("radio", { name: "Sim" })).not.toBeChecked();
    expect(within(grupo).getByRole("radio", { name: "Não" })).not.toBeChecked();
  });

  it("o estado marcado é exposto, e clicar de novo limpa a resposta", async () => {
    const usuario = userEvent.setup();
    renderizar();

    const grupo = screen.getByRole("radiogroup", { name: /Tem alergia/ });
    const sim = within(grupo).getByRole("radio", { name: "Sim" });
    const nao = within(grupo).getByRole("radio", { name: "Não" });

    await usuario.click(sim);
    expect(sim).toBeChecked();
    expect(nao).not.toBeChecked();

    await usuario.click(nao);
    expect(nao).toBeChecked();
    expect(sim).not.toBeChecked();

    await usuario.click(nao);
    expect(nao).not.toBeChecked();
    expect(sim).not.toBeChecked();
  });

  it("escolha única: radiogroup nomeado, sem aria-required quando opcional", async () => {
    const usuario = userEvent.setup();
    renderizar();

    const grupo = screen.getByRole("radiogroup", { name: /Tipo de pele/ });
    expect(grupo).not.toHaveAttribute("aria-required");

    const oleosa = within(grupo).getByRole("radio", { name: "Oleosa" });
    await usuario.click(oleosa);
    expect(oleosa).toBeChecked();
  });

  it("escolha múltipla: grupo nomeado, com o obrigatório dito por extenso", async () => {
    const usuario = userEvent.setup();
    renderizar();

    const grupo = screen.getByRole("group", { name: /Sintomas nos últimos dias.*obrigatória/ });
    const febre = within(grupo).getByRole("checkbox", { name: "Febre" });
    const tosse = within(grupo).getByRole("checkbox", { name: "Tosse" });

    await usuario.click(febre);
    await usuario.click(tosse);
    expect(febre).toBeChecked();
    expect(tosse).toBeChecked();
  });

  it("nenhum rótulo aponta para um controle que não existe", () => {
    const { container } = renderizar();

    for (const rotulo of container.querySelectorAll("label[for]")) {
      const alvo = rotulo.getAttribute("for") ?? "";
      expect(document.getElementById(alvo), `label for="${alvo}"`).not.toBeNull();
    }
  });

  it("somente leitura: toda opção fica desativada e não há Salvar", () => {
    renderizar(true);

    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    for (const caixa of screen.getAllByRole("checkbox")) expect(caixa).toBeDisabled();
    expect(screen.queryByRole("button", { name: /Salvar respostas/ })).toBeNull();
  });
});
