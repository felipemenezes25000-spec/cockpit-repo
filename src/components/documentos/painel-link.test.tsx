import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultadoDaCriacao } from "@/server/acoes/assinatura-link";
import type { LinkDeAssinatura } from "@/server/consultas/documentos";

type EntradaDoLink = { documentoId: string; dias: number; verificacao?: string };
const criarLinkAssinatura = vi.fn<(entrada: EntradaDoLink) => Promise<ResultadoDaCriacao>>();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/acoes/assinatura-link", () => ({
  criarLinkAssinatura: (entrada: EntradaDoLink) => criarLinkAssinatura(entrada),
  registrarCanalDoLink: vi.fn(async () => undefined),
  revogarLinkAssinatura: vi.fn(),
}));

const { PainelLink } = await import("./painel-link");

const DOCUMENTO = "d0000000-0000-4000-8000-000000000001";
const LINK = "f0000000-0000-4000-8000-000000000001";

/** O texto da mensagem que o link do WhatsApp leva pronto. */
function mensagemDoWhatsapp(): string {
  const endereco = screen.getByRole("link", { name: /Enviar pelo WhatsApp/ }).getAttribute("href") ?? "";
  return new URL(endereco).searchParams.get("text") ?? "";
}

/**
 * A validade que o painel mostra na tela ("Vale até…", "Válido até…"): o
 * elemento mais interno cujo texto, somando os nós, diz "vál… até <data>".
 * Assim o teste protege a data prometida, não a redação nem a quebra em nós.
 */
function validadeNaTela(data: string): HTMLElement {
  const padrao = new RegExp(`v[aá]l\\S*\\s+até\\s+${data.replaceAll("/", "\\/")}`, "i");
  return screen.getByText(
    (_, elemento) =>
      padrao.test(elemento?.textContent ?? "") &&
      !Array.from(elemento?.children ?? []).some((filho) => padrao.test(filho.textContent ?? "")),
  );
}

function renderizar(links: LinkDeAssinatura[] = []) {
  return render(
    <PainelLink
      documentoId={DOCUMENTO}
      links={links}
      tipo="contrato"
      pacienteNome="Maria Souza"
      pacienteTelefone="11912345678"
    />,
  );
}

describe("PainelLink — a validade da mensagem é a do link criado", () => {
  beforeEach(() => {
    // Só o relógio: as promessas e os temporizadores seguem de verdade, para
    // o user-event funcionar. 12h em São Paulo, longe da virada do dia.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-23T15:00:00Z"));
    criarLinkAssinatura.mockReset();
    criarLinkAssinatura.mockResolvedValue({
      ok: true,
      endereco: "https://clinica.exemplo/assinar/abc",
      linkId: LINK,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("gerar com 7 dias e depois trocar o select para 30 não muda a data prometida", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.selectOptions(screen.getByLabelText(/Validade do link/), "7");
    await usuario.click(screen.getByRole("button", { name: /Gerar link/ }));

    expect(criarLinkAssinatura).toHaveBeenCalledWith({ documentoId: DOCUMENTO, dias: 7, verificacao: "nascimento" });
    expect(mensagemDoWhatsapp()).toContain("O link vale até 30/09/2026.");

    // O select serve ao PRÓXIMO link; o que já foi gerado continua com 7 dias.
    await usuario.selectOptions(screen.getByLabelText(/Validade do link/), "30");
    expect(mensagemDoWhatsapp()).toContain("O link vale até 30/09/2026.");
    expect(mensagemDoWhatsapp()).not.toContain("23/10/2026");
    expect(validadeNaTela("30/09/2026")).toBeInTheDocument();
    // Nada na tela promete o prazo do select (23/09 + 30 dias).
    expect(document.body.textContent).not.toContain("23/10/2026");
  });

  it("quando a página revalida, vale o expira_em gravado no banco", async () => {
    const usuario = userEvent.setup();
    const { rerender } = renderizar();

    await usuario.click(screen.getByRole("button", { name: /Gerar link/ }));
    expect(mensagemDoWhatsapp()).toContain("O link vale até 08/10/2026.");

    // A ação revalida a ficha e a lista de links volta com o link novo. Se o
    // banco gravou outra data, é ela que vai na mensagem. (Data diferente da
    // conta local de propósito, para o teste distinguir as duas fontes.)
    const doBanco: LinkDeAssinatura = {
      id: LINK,
      criadoEm: new Date("2026-09-23T15:00:00Z"),
      criadoPor: null,
      expiraEm: new Date("2026-10-10T15:00:00Z"),
      revogadoEm: null,
      canalEnvio: "",
      abertoEm: null,
      aberturas: 0,
      tentativas: 0,
      ativo: true,
      bloqueado: false,
      verificacao: "nascimento",
      emailDestino: null,
      codigosEnviados: 0,
    };
    rerender(
      <PainelLink
        documentoId={DOCUMENTO}
        links={[doBanco]}
        tipo="contrato"
        pacienteNome="Maria Souza"
        pacienteTelefone="11912345678"
      />,
    );

    expect(mensagemDoWhatsapp()).toContain("O link vale até 10/10/2026.");
    await usuario.selectOptions(screen.getByLabelText(/Validade do link/), "30");
    expect(mensagemDoWhatsapp()).toContain("O link vale até 10/10/2026.");
  });
});

describe("PainelLink — como a paciente se identifica", () => {
  beforeEach(() => {
    criarLinkAssinatura.mockReset();
    criarLinkAssinatura.mockResolvedValue({ ok: true, endereco: "https://clinica.exemplo/assinar/abc", linkId: LINK });
  });

  it("sem e-mail no cadastro, o código por e-mail aparece indisponível e explica por quê", async () => {
    const usuario = userEvent.setup();
    render(
      <PainelLink documentoId={DOCUMENTO} links={[]} tipo="contrato" pacienteNome="Maria Souza" pacienteTelefone="11912345678" pacienteEmail={null} emailDisponivel />,
    );

    expect(screen.getByRole("radio", { name: /Data \+ código por e-mail/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /^Data de nascimento/ })).toBeChecked();
    expect(screen.getByText(/não tem e-mail no cadastro/)).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Gerar link/ }));
    expect(criarLinkAssinatura).toHaveBeenCalledWith(expect.objectContaining({ verificacao: "nascimento" }));
  });

  it("com e-mail e envio configurado, a opção mais segura vem marcada e vai para o banco", async () => {
    const usuario = userEvent.setup();
    render(
      <PainelLink documentoId={DOCUMENTO} links={[]} tipo="contrato" pacienteNome="Maria Souza" pacienteTelefone="11912345678" pacienteEmail="m••••a@exemplo.com" emailDisponivel />,
    );

    expect(screen.getByRole("radio", { name: /Data \+ código por e-mail/ })).toBeChecked();
    expect(screen.getByText("Mais segura")).toBeInTheDocument();

    await usuario.click(screen.getByRole("button", { name: /Gerar link/ }));
    expect(criarLinkAssinatura).toHaveBeenCalledWith(expect.objectContaining({ verificacao: "nascimento_email" }));
    expect(await screen.findByText(/pede um código enviado para m••••a@exemplo.com/)).toBeInTheDocument();
  });

  it("sem envio de e-mail configurado no servidor, não oferece o código", () => {
    render(
      <PainelLink documentoId={DOCUMENTO} links={[]} tipo="contrato" pacienteNome="Maria Souza" pacienteTelefone={null} pacienteEmail="m••••a@exemplo.com" emailDisponivel={false} />,
    );

    expect(screen.getByRole("radio", { name: /Data \+ código por e-mail/ })).toBeDisabled();
    expect(screen.getByText(/envio de e-mail do sistema não está configurado/)).toBeInTheDocument();
  });

  it("o link ativo diz como pede identificação e quantos códigos já foram", () => {
    const ativo: LinkDeAssinatura = {
      id: LINK,
      criadoEm: new Date("2026-09-23T15:00:00Z"),
      criadoPor: "Recepção",
      expiraEm: new Date("2026-10-08T15:00:00Z"),
      revogadoEm: null,
      canalEnvio: "",
      abertoEm: null,
      aberturas: 0,
      tentativas: 0,
      ativo: true,
      bloqueado: false,
      verificacao: "nascimento_email",
      emailDestino: "m••••a@exemplo.com",
      codigosEnviados: 2,
    };
    render(
      <PainelLink documentoId={DOCUMENTO} links={[ativo]} tipo="contrato" pacienteNome="Maria Souza" pacienteTelefone={null} pacienteEmail="m••••a@exemplo.com" emailDisponivel />,
    );

    expect(screen.getByText(/Pede data de nascimento e código por e-mail \(m••••a@exemplo.com\) · 2 códigos enviados/)).toBeInTheDocument();
  });
});
