import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { SituacaoDocumento } from "@/lib/documento";
import type { DocumentoCompleto } from "@/server/consultas/documentos";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/acoes/documentos", () => ({
  assinarDocumento: vi.fn(),
  cancelarDocumento: vi.fn(),
  responderAnamnese: vi.fn(),
}));
vi.mock("@/server/acoes/assinatura-link", () => ({
  criarLinkAssinatura: vi.fn(),
  registrarCanalDoLink: vi.fn(),
  revogarLinkAssinatura: vi.fn(),
  responderPorLink: vi.fn(),
}));

const { DetalheDocumento } = await import("./detalhe-documento");

function anamnese(situacao: SituacaoDocumento): DocumentoCompleto {
  return {
    id: "d0000000-0000-4000-8000-000000000001",
    tipo: "anamnese",
    titulo: "Anamnese facial",
    situacao,
    pacienteId: "p0000000-0000-4000-8000-000000000001",
    paciente: "Maria Souza",
    pacienteTelefone: null,
    corpo: "Responda com atenção.",
    hash: "f".repeat(64),
    modeloId: null,
    modeloNome: null,
    modeloVersao: null,
    documentoAnteriorId: null,
    motivoCancelamento: situacao === "cancelado" ? "Emitida para a paciente errada." : "",
    emitidoEm: new Date("2026-09-20T12:00:00Z"),
    emitidoPor: null,
    exemplo: false,
    assinatura: null,
    campos: [
      {
        chave: "alergia",
        rotulo: "Tem alergia?",
        tipo: "sim_nao",
        obrigatorio: true,
        ajuda: "",
        opcoes: [],
        resposta: "nao",
        respostas: null,
      },
      {
        chave: "observacoes",
        rotulo: "Observações",
        tipo: "texto_longo",
        obrigatorio: false,
        ajuda: "",
        opcoes: [],
        resposta: "Nenhuma.",
        respostas: null,
      },
    ],
  };
}

describe("DetalheDocumento — só a anamnese em vigor aceita resposta", () => {
  it("emitida: formulário editável, com Salvar", () => {
    render(<DetalheDocumento documento={anamnese("emitido")} links={[]} />);

    expect(screen.getByRole("heading", { name: "Preencher na consulta" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Salvar respostas/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Não" })).toBeEnabled();
  });

  it.each([
    ["cancelado", /cancelada, não aceita mais respostas/],
    ["substituido", /substituída por uma correção, não aceita mais respostas/],
  ] as const)("%s: respostas à vista, só para leitura, sem Salvar", (situacao, frase) => {
    render(<DetalheDocumento documento={anamnese(situacao)} links={[]} />);

    expect(screen.getByRole("heading", { name: "Respostas registradas" })).toBeInTheDocument();
    expect(screen.getByText(frase)).toBeInTheDocument();
    expect(screen.queryByText(/podem ser corrigidas/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Salvar respostas/ })).toBeNull();

    // As respostas continuam legíveis, mas nada se altera.
    expect(screen.getByRole("radio", { name: "Não" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Não" })).toBeDisabled();
    expect(screen.getByLabelText(/Observações/)).toBeDisabled();
  });
});
