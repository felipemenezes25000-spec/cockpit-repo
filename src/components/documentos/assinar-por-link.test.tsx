import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DocumentoParaAssinar,
  EstadoAssinaturaLink,
} from "@/server/acoes/assinatura-link";

const abrirDocumentoParaAssinatura = vi.fn<(token: string, nascimento: string) => Promise<DocumentoParaAssinar>>();
const assinarPorLink = vi.fn<(entrada: unknown) => Promise<EstadoAssinaturaLink>>();

vi.mock("@/server/acoes/assinatura-link", () => ({
  abrirDocumentoParaAssinatura: (token: string, nascimento: string) =>
    abrirDocumentoParaAssinatura(token, nascimento),
  assinarPorLink: (entrada: unknown) => assinarPorLink(entrada),
  responderPorLink: vi.fn(),
}));
vi.mock("@/server/acoes/documentos", () => ({ responderAnamnese: vi.fn() }));

const { AssinarPorLink, formaDaAssinatura } = await import("./assinar-por-link");

const TOKEN = "a".repeat(43);

function documento(mudanca: Partial<DocumentoParaAssinar>): DocumentoParaAssinar {
  return {
    situacao: "ok",
    titulo: "Contrato de prestação de serviços",
    corpo: "Cláusula primeira. O texto do contrato.",
    paciente: "Maria Souza",
    tipo: "contrato",
    emitidoEm: "2026-09-20T12:00:00Z",
    hash: "f".repeat(64),
    assinadoEm: null,
    assinadoPor: null,
    assinadoCanal: null,
    campos: [],
    ...mudanca,
  };
}

/** Abre o documento pela data de nascimento e preenche a assinatura. */
async function abrirEAssinar() {
  const usuario = userEvent.setup();
  render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" />);

  await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
  await usuario.click(screen.getByRole("button", { name: "Abrir documento" }));
  await screen.findByRole("heading", { name: "Assinar" });

  await usuario.type(screen.getByLabelText(/Nome completo/), "Maria Souza");
  await usuario.click(screen.getByRole("checkbox", { name: /Li o documento/ }));
  await usuario.click(screen.getByRole("button", { name: /Assinar documento/ }));
}

describe("AssinarPorLink — ja_assinado ao assinar leva à via, não a um novo link", () => {
  beforeEach(() => {
    abrirDocumentoParaAssinatura.mockReset();
    assinarPorLink.mockReset();
  });

  it("outra aba (ou o balcão) assinou antes: mostra a via com o aviso certo", async () => {
    abrirDocumentoParaAssinatura
      .mockResolvedValueOnce(documento({}))
      .mockResolvedValueOnce(
        documento({
          situacao: "ja_assinado",
          assinadoEm: "2026-09-22T14:00:00Z",
          assinadoPor: "Maria Souza",
        }),
      );
    assinarPorLink.mockResolvedValue({ situacao: "ja_assinado", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText("Este documento já estava assinado")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent("Este documento já estava assinado"),
    );
    expect(screen.getByRole("button", { name: /Salvar em PDF ou imprimir/ })).toBeInTheDocument();
    expect(screen.queryByText(/Assinatura registrada/)).toBeNull();
    expect(screen.queryByText(/novo link/i)).toBeNull();

    // A via é relida do banco, com a mesma data já conferida.
    expect(abrirDocumentoParaAssinatura).toHaveBeenLastCalledWith(TOKEN, "1990-05-10");
  });

  it("a via não carregou: diz que já está assinado e manda recarregar, nunca pedir link", async () => {
    abrirDocumentoParaAssinatura
      .mockResolvedValueOnce(documento({}))
      .mockResolvedValueOnce(documento({ situacao: "falhou", corpo: null }));
    assinarPorLink.mockResolvedValue({ situacao: "ja_assinado", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText(/Este documento já está assinado/)).toBeInTheDocument();
    expect(screen.queryByText(/novo link/i)).toBeNull();
  });

  it("assinatura desta página: o aviso continua sendo o de registrada", async () => {
    abrirDocumentoParaAssinatura
      .mockResolvedValueOnce(documento({}))
      .mockResolvedValueOnce(
        documento({ situacao: "ja_assinado", assinadoEm: "2026-09-23T15:00:00Z", assinadoPor: "Maria Souza" }),
      );
    assinarPorLink.mockResolvedValue({ situacao: "ok", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText("Assinatura registrada")).toBeInTheDocument();
    expect(screen.queryByText("Este documento já estava assinado")).toBeNull();

    // O botão que tinha o foco sumiu: o foco vai para o aviso, não para o <body>.
    const aviso = screen.getByRole("status");
    expect(aviso).toHaveTextContent("Assinatura registrada");
    await waitFor(() => expect(document.activeElement).toBe(aviso));
  });

  it("recusa sem frase própria não manda pedir um novo link", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({}));
    assinarPorLink.mockResolvedValue({ situacao: "nome_invalido", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText(/Confira o nome e o CPF/)).toBeInTheDocument();
    expect(screen.queryByText(/novo link/i)).toBeNull();
  });
});

describe("formaDaAssinatura — a via diz por onde a assinatura entrou", () => {
  it("balcão é presencial; link é à distância", () => {
    expect(formaDaAssinatura("balcao")).toMatch(/presencial, na clínica/);
    expect(formaDaAssinatura("balcao")).not.toMatch(/distância/);
    expect(formaDaAssinatura("link")).toMatch(/à distância/);
  });

  it("sem o canal, a via não afirma a forma", () => {
    expect(formaDaAssinatura(null)).not.toMatch(/distância|presencial/);
  });
});

describe("AssinarPorLink — clínica fora do ar ao abrir o link", () => {
  it("não promete que o link continua valendo nem culpa a internet da paciente", () => {
    render(<AssinarPorLink token={TOKEN} tipo={null} situacaoInicial="falhou" />);

    expect(screen.getByRole("heading", { name: "Não foi possível abrir agora" })).toBeInTheDocument();
    expect(screen.getByText(/ligue para a clínica/)).toBeInTheDocument();
    expect(screen.queryByText(/continua valendo/)).toBeNull();
    expect(screen.queryByText(/sua internet/i)).toBeNull();
  });
});

describe("AssinarPorLink — a data de nascimento vale mesmo sem evento do navegador", () => {
  beforeEach(() => {
    abrirDocumentoParaAssinatura.mockReset();
    assinarPorLink.mockReset();
  });

  it("preenchimento automático (sem evento de digitação) ainda abre o documento", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValue(documento({}));
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" />);

    // Como o autofill do Safari: o valor aparece no campo sem o React ouvir.
    const campo = screen.getByLabelText(/Sua data de nascimento/) as HTMLInputElement;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(campo, "1990-05-10");

    const botao = screen.getByRole("button", { name: "Abrir documento" });
    expect(botao).toBeEnabled();
    await usuario.click(botao);

    await waitFor(() => expect(abrirDocumentoParaAssinatura).toHaveBeenCalledWith(TOKEN, "1990-05-10"));
  });

  it("sem data, não chama o servidor (o campo obrigatório barra o envio)", async () => {
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" />);

    await usuario.click(screen.getByRole("button", { name: "Abrir documento" }));

    expect(abrirDocumentoParaAssinatura).not.toHaveBeenCalled();
  });
});
