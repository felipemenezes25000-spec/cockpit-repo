import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  DocumentoParaAssinar,
  EstadoAssinaturaLink,
  ResultadoDoCodigo,
} from "@/server/acoes/assinatura-link";

const abrirDocumentoParaAssinatura =
  vi.fn<(token: string, nascimento: string, codigo?: string) => Promise<DocumentoParaAssinar>>();
const assinarPorLink = vi.fn<(entrada: Record<string, unknown>) => Promise<EstadoAssinaturaLink>>();
const enviarCodigoDeVerificacao = vi.fn<(token: string, nascimento: string) => Promise<ResultadoDoCodigo>>();
const carimboDaVia = vi.fn<(codigo: string) => Promise<{ carimboEm: string | null; carimboAutoridade: string | null }>>();

vi.mock("@/server/acoes/assinatura-link", () => ({
  abrirDocumentoParaAssinatura: (token: string, nascimento: string, codigo?: string) =>
    abrirDocumentoParaAssinatura(token, nascimento, codigo),
  assinarPorLink: (entrada: Record<string, unknown>) => assinarPorLink(entrada),
  enviarCodigoDeVerificacao: (token: string, nascimento: string) => enviarCodigoDeVerificacao(token, nascimento),
  carimboDaVia: (codigo: string) => carimboDaVia(codigo),
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
    verificacao: "nascimento",
    emailMascarado: null,
    codigoVerificacao: null,
    manifestoHash: null,
    fatores: [],
    rubrica: null,
    rubricaDispensada: false,
    carimboEm: null,
    carimboAutoridade: null,
    ip: null,
    localizacao: null,
    dispositivo: null,
    enderecoVerificacao: null,
    qrVerificacao: null,
    ...mudanca,
  };
}

function via(mudanca: Partial<DocumentoParaAssinar> = {}): DocumentoParaAssinar {
  return documento({
    situacao: "ja_assinado",
    assinadoEm: "2026-09-23T15:00:00Z",
    assinadoPor: "Maria Souza",
    assinadoCanal: "link",
    ...mudanca,
  });
}

/** Abre o documento pela data, lê e chega à etapa da assinatura. */
async function abrirAteAssinatura(usuario = userEvent.setup()) {
  render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" />);

  await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
  await usuario.click(screen.getByRole("button", { name: "Abrir documento" }));
  await usuario.click(await screen.findByRole("button", { name: /Continuar para assinar/ }));
  await screen.findByRole("heading", { name: "Assinar" });
  return usuario;
}

/** Preenche e envia a assinatura, pelo nome (sem desenhar a rubrica). */
async function abrirEAssinar() {
  const usuario = await abrirAteAssinatura();
  await usuario.type(screen.getByLabelText(/Nome completo/), "Maria Souza");
  await usuario.click(screen.getByRole("checkbox", { name: /assinar só com o nome/ }));
  await usuario.click(screen.getByRole("checkbox", { name: /Li o documento/ }));
  await usuario.click(screen.getByRole("button", { name: /Assinar documento/ }));
  return usuario;
}

beforeEach(() => {
  abrirDocumentoParaAssinatura.mockReset();
  assinarPorLink.mockReset();
  enviarCodigoDeVerificacao.mockReset();
  carimboDaVia.mockReset();
  carimboDaVia.mockResolvedValue({ carimboEm: null, carimboAutoridade: null });
});

describe("AssinarPorLink — etapas", () => {
  it("abre na leitura, com o progresso, e só então vai para a assinatura", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValue(documento({}));
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" />);

    expect(screen.getByRole("navigation", { name: "Etapas" })).toBeInTheDocument();
    await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
    await usuario.click(screen.getByRole("button", { name: "Abrir documento" }));

    expect(await screen.findByRole("heading", { name: "Contrato de prestação de serviços" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Leitura do documento" })).toBeInTheDocument();
    // Texto curto, sem rolagem: já conta como lido até o fim.
    expect(screen.getByText("Lido até o fim")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Assinar" })).toBeNull();
    expect(screen.getByText("Leitura").closest("li")).toHaveAttribute("aria-current", "step");

    await usuario.click(screen.getByRole("button", { name: /Continuar para assinar/ }));
    expect(await screen.findByRole("heading", { name: "Assinar" })).toBeInTheDocument();
    expect(screen.getByText("Você está assinando")).toBeInTheDocument();
  });

  it("assinar manda rubrica dispensada, leitura e código vazio — e nunca IP", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({})).mockResolvedValueOnce(via());
    assinarPorLink.mockResolvedValue({ situacao: "ok", erros: {} });

    await abrirEAssinar();
    await screen.findByText("Assinatura registrada");

    const entrada = assinarPorLink.mock.calls[0][0];
    expect(entrada).toMatchObject({
      token: TOKEN,
      nascimento: "1990-05-10",
      codigo: "",
      nome: "Maria Souza",
      confirmou: true,
      rubrica: null,
      rubricaDispensada: true,
      leituraCompleta: true,
    });
    expect(typeof entrada.leituraSegundos).toBe("number");
    expect(entrada).not.toHaveProperty("ip");
  });

  it("a recusa da rubrica aparece junto do quadro", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({}));
    assinarPorLink.mockResolvedValue({ situacao: null, erros: { rubrica: "Faça a sua rubrica no quadro, ou marque que prefere assinar só pelo nome." } });

    const usuario = await abrirAteAssinatura();
    await usuario.type(screen.getByLabelText(/Nome completo/), "Maria Souza");
    await usuario.click(screen.getByRole("checkbox", { name: /Li o documento/ }));
    await usuario.click(screen.getByRole("button", { name: /Assinar documento/ }));

    expect(await screen.findByText(/Faça a sua rubrica no quadro/)).toBeInTheDocument();
  });

  it("CPF que não confere com o cadastro: diz isso, sem mandar pedir outro link", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({}));
    assinarPorLink.mockResolvedValue({ situacao: "cpf_nao_confere", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText(/não confere com o cadastro da clínica/)).toBeInTheDocument();
    expect(screen.queryByText(/novo link/i)).toBeNull();
  });
});

describe("AssinarPorLink — código por e-mail", () => {
  it("data → código enviado → confere → abre o documento", async () => {
    enviarCodigoDeVerificacao.mockResolvedValue({
      situacao: "ok",
      emailMascarado: "m••••a@exemplo.com",
      reenviarEm: new Date(Date.now() + 45_000).toISOString(),
    });
    abrirDocumentoParaAssinatura.mockResolvedValue(documento({ verificacao: "nascimento_email" }));
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" verificacao="nascimento_email" />);

    await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
    await usuario.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(await screen.findByRole("heading", { name: "Digite o código do e-mail" })).toBeInTheDocument();
    expect(screen.getByText("m••••a@exemplo.com")).toBeInTheDocument();
    expect(enviarCodigoDeVerificacao).toHaveBeenCalledWith(TOKEN, "1990-05-10");
    expect(screen.getByRole("button", { name: /Reenviar em \d+s/ })).toBeDisabled();

    await usuario.type(screen.getByLabelText("Código de verificação"), "12 34 56");
    await usuario.click(screen.getByRole("button", { name: /Confirmar código/ }));

    await waitFor(() => expect(abrirDocumentoParaAssinatura).toHaveBeenCalledWith(TOKEN, "1990-05-10", "123456"));
    expect(await screen.findByRole("button", { name: /Continuar para assinar/ })).toBeInTheDocument();
  });

  it("código errado: avisa e continua na etapa do código", async () => {
    enviarCodigoDeVerificacao.mockResolvedValue({ situacao: "ok", emailMascarado: "m••••a@exemplo.com", reenviarEm: null });
    abrirDocumentoParaAssinatura.mockResolvedValue(documento({ situacao: "codigo_incorreto", corpo: null }));
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" verificacao="nascimento_email" />);

    await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
    await usuario.click(screen.getByRole("button", { name: /Continuar/ }));
    await usuario.type(await screen.findByLabelText("Código de verificação"), "000000");
    await usuario.click(screen.getByRole("button", { name: /Confirmar código/ }));

    expect(await screen.findByText(/Código incorreto/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Digite o código do e-mail" })).toBeInTheDocument();
  });

  it("data errada no envio do código: volta a pedir a data", async () => {
    enviarCodigoDeVerificacao.mockResolvedValue({ situacao: "data_incorreta", emailMascarado: null, reenviarEm: null });
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" verificacao="nascimento_email" />);

    await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-11");
    await usuario.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(await screen.findByText(/A data não confere com o cadastro/)).toBeInTheDocument();
    expect(abrirDocumentoParaAssinatura).not.toHaveBeenCalled();
  });

  it("link bloqueado no envio do código: encerra com a recusa", async () => {
    enviarCodigoDeVerificacao.mockResolvedValue({ situacao: "bloqueado", emailMascarado: null, reenviarEm: null });
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" verificacao="nascimento_email" />);

    await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
    await usuario.click(screen.getByRole("button", { name: /Continuar/ }));

    expect(await screen.findByRole("heading", { name: "Link bloqueado" })).toBeInTheDocument();
  });
});

describe("AssinarPorLink — ja_assinado ao assinar leva à via, não a um novo link", () => {
  it("outra aba (ou o balcão) assinou antes: mostra a via com o aviso certo", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({})).mockResolvedValueOnce(via());
    assinarPorLink.mockResolvedValue({ situacao: "ja_assinado", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText("Este documento já estava assinado")).toBeInTheDocument();
    await waitFor(() =>
      expect(document.activeElement).toHaveTextContent("Este documento já estava assinado"),
    );
    expect(screen.getByRole("button", { name: /Salvar em PDF ou imprimir/ })).toBeInTheDocument();
    expect(screen.queryByText(/Assinatura registrada/)).toBeNull();
    expect(screen.queryByText(/novo link/i)).toBeNull();

    // A via é relida do banco, com a mesma data (e código) já conferidos.
    expect(abrirDocumentoParaAssinatura).toHaveBeenLastCalledWith(TOKEN, "1990-05-10", "");
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
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({})).mockResolvedValueOnce(via());
    assinarPorLink.mockResolvedValue({ situacao: "ok", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText("Assinatura registrada")).toBeInTheDocument();
    expect(screen.queryByText("Este documento já estava assinado")).toBeNull();

    // O botão que tinha o foco sumiu: o foco vai para o aviso, não para o <body>.
    const aviso = screen.getByText("Assinatura registrada").closest("[role=status]") as HTMLElement;
    expect(aviso).not.toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(aviso));
  });

  it("a via sai timbrada com a marca, sem depender de fundo para aparecer no papel", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({})).mockResolvedValueOnce(via());
    assinarPorLink.mockResolvedValue({ situacao: "ok", erros: {} });

    await abrirEAssinar();
    await screen.findByText("Assinatura registrada");

    const folha = document.querySelector(".folha");
    expect(folha).toHaveTextContent("Dra. Érika Passos");
    expect(folha).toHaveTextContent("Consultório de estética");
    expect(folha?.querySelector("svg path")).not.toBeNull();
    // Fundo não sai na impressão por padrão: a logo branca no quadro azul
    // sumiria no papel. Na via, a logo é pintada direto, na cor da marca.
    expect(folha?.querySelector(".bg-primary-container")).toBeNull();
  });

  it("recusa sem frase própria não manda pedir um novo link", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValueOnce(documento({}));
    assinarPorLink.mockResolvedValue({ situacao: "situacao_desconhecida", erros: {} });

    await abrirEAssinar();

    expect(await screen.findByText(/Confira o nome e o CPF/)).toBeInTheDocument();
    expect(screen.queryByText(/novo link/i)).toBeNull();
  });
});

describe("AssinarPorLink — a via mostra a prova", () => {
  it("rubrica, fatores, código de verificação, QR e o carimbo que chega depois", async () => {
    abrirDocumentoParaAssinatura.mockResolvedValue(
      via({
        rubrica: "M100 200L300 220L500 180",
        fatores: ["posse_do_link", "data_de_nascimento", "codigo_por_email"],
        codigoVerificacao: "ABCD-EFGH-JKLM",
        manifestoHash: "e".repeat(64),
        enderecoVerificacao: "https://clinica.exemplo/verificar/ABCD-EFGH-JKLM",
        qrVerificacao: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h1v1H0z"/></svg>',
        localizacao: "São Paulo, SP, BR",
        dispositivo: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1",
        ip: "200.1.2.3",
      }),
    );
    carimboDaVia.mockResolvedValue({ carimboEm: "2026-09-23T15:00:02Z", carimboAutoridade: "DigiCert" });
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ja_assinado" />);

    await usuario.type(screen.getByLabelText(/Sua data de nascimento/), "1990-05-10");
    await usuario.click(screen.getByRole("button", { name: "Ver minha via" }));

    const folha = await waitFor(() => {
      const elemento = document.querySelector(".folha");
      if (!elemento) throw new Error("sem via");
      return elemento as HTMLElement;
    });
    expect(screen.getByRole("img", { name: "Rubrica de quem assinou" })).toBeInTheDocument();
    expect(folha).toHaveTextContent("ABCD-EFGH-JKLM");
    expect(folha).toHaveTextContent("Código por e-mail confirmado");
    expect(folha).toHaveTextContent("São Paulo, SP, BR (pela rede)");
    expect(folha).toHaveTextContent("iPhone · Safari");
    expect(folha).toHaveTextContent("Em emissão por autoridade independente");
    expect(screen.getByRole("link", { name: /Conferir autenticidade/ })).toHaveAttribute(
      "href",
      "https://clinica.exemplo/verificar/ABCD-EFGH-JKLM",
    );

    await waitFor(() => expect(folha).toHaveTextContent("DigiCert (RFC 3161)"), { timeout: 4000 });
    expect(carimboDaVia).toHaveBeenCalledWith("ABCD-EFGH-JKLM");
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

    await waitFor(() => expect(abrirDocumentoParaAssinatura).toHaveBeenCalledWith(TOKEN, "1990-05-10", ""));
  });

  it("sem data, não chama o servidor (o campo obrigatório barra o envio)", async () => {
    const usuario = userEvent.setup();
    render(<AssinarPorLink token={TOKEN} tipo="contrato" situacaoInicial="ok" />);

    await usuario.click(screen.getByRole("button", { name: "Abrir documento" }));

    expect(abrirDocumentoParaAssinatura).not.toHaveBeenCalled();
  });
});
