import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EstadoContato } from "@/server/acoes/captacao";
import type { LeadDaCarteira } from "@/server/consultas/captacao-leads";

const registrarContatoLead = vi.fn<(anterior: EstadoContato, dados: FormData) => Promise<EstadoContato>>(
  async () => ({ erros: {}, valores: {}, sucesso: "Contato registrado." }),
);

vi.mock("@/server/acoes/captacao", () => ({
  registrarContatoLead: (anterior: EstadoContato, dados: FormData) => registrarContatoLead(anterior, dados),
  criarLead: vi.fn(async () => ({ erros: {} })),
  mudarEtapaLead: vi.fn(async () => ({ ok: true, mensagem: null })),
  converterLeadEmPaciente: vi.fn(async () => ({ ok: true, mensagem: null })),
  vincularPacienteLead: vi.fn(async () => ({ ok: true, mensagem: null })),
}));
vi.mock("@/server/acoes/agenda", () => ({ buscarPacientesParaSelecao: async () => [] }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));

const { LeadsDoFunil } = await import("./leads-do-funil");

const HOJE = "2026-09-25";

function lead(parcial: Partial<LeadDaCarteira>): LeadDaCarteira {
  return {
    id: "d0000000-0000-4000-8000-000000000001",
    nome: "Joana Prado",
    telefone: null,
    email: null,
    origem: "Instagram",
    campanha: null,
    etapa: "qualificado",
    procedimento: null,
    pacienteId: null,
    criadoEm: new Date("2026-09-10T15:00:00Z"),
    atualizadoEm: new Date("2026-09-24T15:00:00Z"),
    diasSemMovimento: 1,
    motivoPerda: null,
    historico: [],
    ultimoContatoEm: null,
    proximoContato: null,
    diasParaRetorno: null,
    retornoHoje: false,
    retornoAtrasado: false,
    interacoes: [],
    totalInteracoes: 0,
    ...parcial,
  };
}

function desenhar(leads: LeadDaCarteira[], extras: Partial<Parameters<typeof LeadsDoFunil>[0]> = {}) {
  return render(
    <LeadsDoFunil
      leads={leads}
      procedimentos={[]}
      podeEditar
      total={leads.length}
      pagina={1}
      paginas={1}
      busca=""
      etapa="todos"
      atencao="todos"
      filtrosExtras={false}
      mesDoPeriodo="setembro de 2026"
      hoje={HOJE}
      parametrosPaginacao={{}}
      {...extras}
    />,
  );
}

function linhaDe(nome: string) {
  const item = screen.getByText(nome).closest("li");
  if (!item) throw new Error(`linha de ${nome} não encontrada`);
  return within(item);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  registrarContatoLead.mockClear();
});

describe("LeadsDoFunil — acompanhamento", () => {
  it("cada estado do retorno tem texto próprio, não só cor", () => {
    desenhar([
      lead({ id: "d0000000-0000-4000-8000-00000000000a", nome: "Atrasada", proximoContato: new Date("2026-09-23T03:00:00Z"), diasParaRetorno: -2, retornoAtrasado: true }),
      lead({ id: "d0000000-0000-4000-8000-00000000000b", nome: "Hoje", proximoContato: new Date("2026-09-25T03:00:00Z"), diasParaRetorno: 0, retornoHoje: true }),
      lead({ id: "d0000000-0000-4000-8000-00000000000c", nome: "Futura", proximoContato: new Date("2026-09-27T03:00:00Z"), diasParaRetorno: 2 }),
      lead({ id: "d0000000-0000-4000-8000-00000000000d", nome: "Sem data" }),
    ]);

    expect(linhaDe("Atrasada").getByText("Retorno atrasado há 2 dias")).toBeInTheDocument();
    expect(linhaDe("Hoje").getByText("Retorno hoje")).toBeInTheDocument();
    expect(linhaDe("Futura").getByText("Próximo contato em 27/09")).toBeInTheDocument();
    expect(linhaDe("Sem data").getByText("Sem retorno programado")).toBeInTheDocument();
  });

  it("mostra o último contato no relógio da clínica, ou que ainda não houve", () => {
    desenhar([
      lead({ id: "d0000000-0000-4000-8000-00000000000a", nome: "Com contato", ultimoContatoEm: new Date("2026-09-24T17:20:00Z") }),
      lead({ id: "d0000000-0000-4000-8000-00000000000b", nome: "Sem contato" }),
    ]);

    expect(linhaDe("Com contato").getByText("Último contato: 24/09 às 14:20")).toBeInTheDocument();
    expect(linhaDe("Sem contato").getByText("Sem contato registrado")).toBeInTheDocument();
  });

  it("lead encerrado não oferece contato nem mostra retorno; quem só acompanha não registra", () => {
    const { unmount } = desenhar([
      lead({ id: "d0000000-0000-4000-8000-00000000000a", nome: "Aberta" }),
      lead({ id: "d0000000-0000-4000-8000-00000000000b", nome: "Perdida", etapa: "perdido", motivoPerda: "Preço" }),
      lead({ id: "d0000000-0000-4000-8000-00000000000c", nome: "Ganha", etapa: "ganho", pacienteId: "e0000000-0000-4000-8000-000000000001" }),
    ]);

    expect(linhaDe("Aberta").getAllByText("Registrar contato").length).toBeGreaterThan(0);
    expect(linhaDe("Perdida").queryAllByText("Registrar contato")).toHaveLength(0);
    expect(linhaDe("Perdida").queryByText("Sem retorno programado")).toBeNull();
    expect(linhaDe("Ganha").queryAllByText("Registrar contato")).toHaveLength(0);
    unmount();

    desenhar([lead({ nome: "Aberta" })], { podeEditar: false });
    expect(screen.queryAllByText("Registrar contato")).toHaveLength(0);
  });

  it("histórico comercial é separado do histórico do funil", () => {
    desenhar([
      lead({
        historico: [{ de: "novo", para: "qualificado", motivo: null, em: new Date("2026-09-11T13:00:00Z") }],
        totalInteracoes: 12,
        interacoes: [
          {
            id: 9,
            canal: "whatsapp",
            observacao: "Pediu para chamar de novo na sexta.",
            proximoContato: new Date("2026-09-26T03:00:00Z"),
            em: new Date("2026-09-24T18:20:00Z"),
          },
        ],
      }),
    ]);

    const comercial = screen.getByText("Histórico comercial").closest("details") as HTMLElement;
    const funil = screen.getByText("Histórico do funil").closest("details") as HTMLElement;
    expect(comercial).not.toBe(funil);
    expect(within(comercial).getByText("· 12")).toBeInTheDocument();
    expect(within(comercial).getByText("WhatsApp")).toBeInTheDocument();
    expect(within(comercial).getByText("24/09 · 15:20")).toBeInTheDocument();
    expect(within(comercial).getByText("Pediu para chamar de novo na sexta.")).toBeInTheDocument();
    expect(within(comercial).getByText("Próximo contato combinado: 26/09")).toBeInTheDocument();
    expect(within(comercial).getByText("Mostrando os 1 contatos mais recentes de 12.")).toBeInTheDocument();
    expect(within(funil).queryByText("WhatsApp")).toBeNull();
  });
});

describe("LeadsDoFunil — registrar contato", () => {
  function formularioDeContato(container: HTMLElement): HTMLFormElement {
    const campo = container.querySelector('input[name="lead_id"]');
    const formulario = campo?.closest("form");
    if (!formulario) throw new Error("formulário de contato não encontrado");
    return formulario;
  }

  async function enviar(container: HTMLElement) {
    const formulario = formularioDeContato(container);
    await act(async () => {
      fireEvent.submit(formulario);
    });
  }

  it("envia o lead e os três campos, e anuncia o sucesso", async () => {
    const { container } = desenhar([lead({})]);

    fireEvent.change(screen.getByLabelText(/^Canal/), { target: { value: "telefone" } });
    fireEvent.change(screen.getByLabelText(/^Observação/), { target: { value: "Vai pensar." } });
    fireEvent.change(screen.getByLabelText(/^Próximo contato/), { target: { value: "2026-09-30" } });
    await enviar(container);

    expect(registrarContatoLead).toHaveBeenCalledTimes(1);
    const dados = registrarContatoLead.mock.calls[0][1];
    expect(Object.fromEntries(dados.entries())).toEqual({
      lead_id: "d0000000-0000-4000-8000-000000000001",
      canal: "telefone",
      observacao: "Vai pensar.",
      proximo_contato: "2026-09-30",
    });
    expect(within(formularioDeContato(container)).getByRole("status")).toHaveTextContent("Contato registrado.");
  });

  it("o campo de data não oferece dia antes de hoje", () => {
    desenhar([lead({})]);
    expect(screen.getByLabelText(/^Próximo contato/)).toHaveAttribute("min", HOJE);
  });

  it("recusado, o campo com erro fica inválido, descrito e com o foco", async () => {
    registrarContatoLead.mockResolvedValueOnce({
      erros: { proximo_contato: "O próximo contato não pode ficar no passado." },
      valores: { lead_id: "d0000000-0000-4000-8000-000000000001", canal: "instagram", observacao: "Oi", proximo_contato: "2026-09-20" },
    });
    const { container } = desenhar([lead({})]);
    await enviar(container);

    const data = screen.getByLabelText(/^Próximo contato/);
    expect(data).toHaveAttribute("aria-invalid", "true");
    expect(data).toHaveAccessibleDescription("O próximo contato não pode ficar no passado.");
    expect(document.activeElement).toBe(data);
    // O canal escolhido não volta para o padrão depois do erro.
    expect(screen.getByLabelText(/^Canal/)).toHaveValue("instagram");
  });

  it("recusa geral (lead encerrado por outra pessoa) é lida e recebe o foco", async () => {
    registrarContatoLead.mockResolvedValueOnce({
      erros: { geral: "Reabra o lead antes de registrar um novo contato." },
      valores: {},
    });
    const { container } = desenhar([lead({})]);
    await enviar(container);

    const alerta = within(formularioDeContato(container)).getByRole("alert");
    expect(alerta).toHaveTextContent("Reabra o lead antes de registrar um novo contato.");
    expect(document.activeElement).toBe(alerta);
  });
});

describe("LeadsDoFunil — estados vazios", () => {
  it.each([
    ["retorno_hoje", "Nenhum retorno combinado para hoje."],
    ["retorno_atrasado", "Nenhum retorno atrasado."],
    ["parados", "Nenhum lead de setembro de 2026 parado há 3+ dias."],
    ["todos", "O funil ainda está vazio neste período."],
  ] as const)("recorte %s diz o que está vazio", (atencao, frase) => {
    desenhar([], { atencao });
    expect(screen.getByText(frase)).toBeInTheDocument();
  });

  it("origem ou campanha no recorte contam como filtro", () => {
    desenhar([], { filtrosExtras: true });
    expect(screen.getByText("Nenhum lead corresponde a este filtro.")).toBeInTheDocument();
  });
});
