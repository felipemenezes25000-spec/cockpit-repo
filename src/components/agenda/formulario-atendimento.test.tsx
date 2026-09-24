import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EstadoAtendimento } from "@/server/acoes/agenda";

vi.mock("@/server/acoes/agenda", () => ({ buscarPacientesParaSelecao: async () => [] }));

const { FormularioAtendimento } = await import("./formulario-atendimento");

const CATALOGO = {
  profissionais: [{ id: "c0000000-0000-4000-8000-000000000001", nome: "Dra. Marina" }],
  procedimentos: [
    { id: "c0000000-0000-4000-8000-000000000002", nome: "Toxina", duracaoMin: 45, valorPadrao: 900 },
  ],
};

const INICIAL = {
  data: "2026-09-23",
  hora: "",
  profissional_id: "",
  procedimento_id: "",
  duracao_min: "60",
  valor: "",
  observacoes: "",
};

const PACIENTE = { id: "c0000000-0000-4000-8000-000000000003", nome: "Aline", detalhe: "" };

function desenhar(
  acao: (e: EstadoAtendimento, d: FormData) => Promise<EstadoAtendimento>,
  catalogo = CATALOGO,
) {
  return render(
    <FormularioAtendimento
      acao={acao}
      catalogo={catalogo}
      inicial={INICIAL}
      pacienteInicial={PACIENTE}
      rotuloSalvar="Marcar atendimento"
      cancelarPara="/agenda?dia=2026-09-23"
    />,
  );
}

async function enviar(container: HTMLElement) {
  const formulario = container.querySelector("form");
  if (!formulario) throw new Error("formulário não encontrado");
  await act(async () => {
    fireEvent.submit(formulario);
  });
}

describe("FormularioAtendimento", () => {
  it("recusado pelo servidor, o foco vai para o primeiro campo com erro", async () => {
    const acao = vi.fn(async () => ({
      erros: { hora: "Choca com o atendimento de Beatriz às 07:00." },
      valores: { ...INICIAL, hora: "07:15" },
    }));
    const { container } = desenhar(acao);
    await enviar(container);

    const hora = screen.getByLabelText(/^Hora/);
    expect(document.activeElement).toBe(hora);
    expect(hora).toHaveAccessibleDescription("Choca com o atendimento de Beatriz às 07:00.");
  });

  it("erro sem campo (geral) recebe o foco, para ser lido", async () => {
    const acao = vi.fn(async () => ({ erros: { geral: "Sessão expirada. Entre novamente." } }));
    const { container } = desenhar(acao);
    await enviar(container);

    expect(document.activeElement).toBe(screen.getByRole("alert"));
    expect(screen.getByRole("alert")).toHaveTextContent("Sessão expirada. Entre novamente.");
  });

  it("sem procedimento nem profissional ativos, diz o que falta e não deixa enviar", () => {
    desenhar(vi.fn(), { profissionais: [], procedimentos: [] });

    expect(screen.getByText("Ainda não dá para marcar atendimento.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Configurações → Procedimentos/ })).toHaveAttribute(
      "href",
      "/configuracoes/procedimentos",
    );
    expect(screen.getByRole("button", { name: "Marcar atendimento" })).toBeDisabled();
  });

  it("a saída sem salvar não se chama “Cancelar” — na edição, esse é o botão que cancela o atendimento", () => {
    desenhar(vi.fn());
    expect(screen.getByRole("link", { name: "Voltar sem salvar" })).toHaveAttribute(
      "href",
      "/agenda?dia=2026-09-23",
    );
    expect(screen.queryByRole("link", { name: "Cancelar" })).toBeNull();
  });

  it("escolher o procedimento preenche duração e valor da tabela", () => {
    desenhar(vi.fn());
    fireEvent.change(screen.getByLabelText(/^Procedimento/), {
      target: { value: CATALOGO.procedimentos[0].id },
    });
    expect(screen.getByLabelText(/^Duração/)).toHaveValue(45);
    expect(screen.getByLabelText(/^Valor/)).toHaveValue("900,00");
  });
});

describe("FormularioAtendimento — erro da ação não apaga as escolhas", () => {
  // O React 19 reinicia o formulário quando a ação termina. O <input> volta ao
  // defaultValue atual (que já traz o que foi digitado), mas o <select> só lê o
  // defaultValue ao montar: sem remontar, procedimento e profissional voltavam a
  // "Escolher…" depois de um choque de horário, e a recepção tinha de escolher
  // tudo de novo.
  const CATALOGO_CHOQUE = {
    profissionais: [
      { id: "prof-marina", nome: "Dra. Marina Rocha" },
      { id: "prof-erika", nome: "Dra. Érika Passos" },
    ],
    procedimentos: [
      { id: "proc-toxina", nome: "Toxina botulínica", duracaoMin: 45, valorPadrao: 1450 },
      { id: "proc-peeling", nome: "Peeling químico", duracaoMin: 40, valorPadrao: 540 },
    ],
  };

  it("depois de um choque de horário, procedimento e profissional continuam escolhidos", async () => {
    const acao = vi.fn(async (_anterior: EstadoAtendimento, dados: FormData): Promise<EstadoAtendimento> => ({
      erros: { hora: "Choca com o atendimento de Aline Bastos às 20:00." },
      valores: Object.fromEntries([...dados.entries()].map(([k, v]) => [k, String(v)])),
    }));
    const { container } = desenhar(acao, CATALOGO_CHOQUE);

    fireEvent.change(screen.getByLabelText(/^Procedimento/), { target: { value: "proc-toxina" } });
    fireEvent.change(screen.getByLabelText(/^Quem atende/), { target: { value: "prof-marina" } });
    fireEvent.change(screen.getByLabelText(/^Hora/), { target: { value: "20:15" } });
    await enviar(container);

    expect(acao).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Choca com o atendimento/)).toBeInTheDocument();
    expect(screen.getByLabelText<HTMLSelectElement>(/^Procedimento/).value).toBe("proc-toxina");
    expect(screen.getByLabelText<HTMLSelectElement>(/^Quem atende/).value).toBe("prof-marina");
    expect(screen.getByLabelText<HTMLInputElement>(/^Hora/).value).toBe("20:15");
  });
});
