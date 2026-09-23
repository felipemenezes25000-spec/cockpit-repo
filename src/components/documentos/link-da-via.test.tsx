import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { LinkDeAssinatura } from "@/server/consultas/documentos";
import { LinkDaVia } from "./link-da-via";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/server/acoes/assinatura-link", () => ({ revogarLinkAssinatura: vi.fn() }));

const DOCUMENTO = "d0000000-0000-4000-8000-000000000001";

function link(mudanca: Partial<LinkDeAssinatura>): LinkDeAssinatura {
  return {
    id: "f0000000-0000-4000-8000-000000000001",
    criadoEm: new Date("2026-09-01T12:00:00Z"),
    criadoPor: null,
    expiraEm: new Date("2026-09-30T12:00:00Z"),
    revogadoEm: null,
    canalEnvio: "",
    abertoEm: null,
    aberturas: 0,
    tentativas: 0,
    ativo: true,
    bloqueado: false,
    ...mudanca,
  };
}

describe("LinkDaVia", () => {
  it("link vivo aparece como aberto para leitura", () => {
    render(<LinkDaVia documentoId={DOCUMENTO} links={[link({})]} />);
    expect(screen.getByText(/Aberto para leitura até/)).toBeTruthy();
  });

  it("link bloqueado por tentativas não é apresentado como aberto", () => {
    render(<LinkDaVia documentoId={DOCUMENTO} links={[link({ tentativas: 10, bloqueado: true })]} />);
    expect(screen.queryByText(/Aberto para leitura/)).toBeNull();
    expect(screen.getByText(/Bloqueado por dez tentativas erradas/)).toBeTruthy();
  });

  it("sem link vivo, nada aparece", () => {
    const { container } = render(
      <LinkDaVia documentoId={DOCUMENTO} links={[link({ ativo: false })]} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
