import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResultadoDaCriacao } from "@/server/acoes/assinatura-link";
import type { LinkDeAssinatura } from "@/server/consultas/documentos";

const criarLinkAssinatura = vi.fn<(entrada: { documentoId: string; dias: number }) => Promise<ResultadoDaCriacao>>();

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/acoes/assinatura-link", () => ({
  criarLinkAssinatura: (entrada: { documentoId: string; dias: number }) => criarLinkAssinatura(entrada),
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

    expect(criarLinkAssinatura).toHaveBeenCalledWith({ documentoId: DOCUMENTO, dias: 7 });
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
