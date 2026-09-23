import { beforeEach, describe, expect, it, vi } from "vitest";

class NaoEncontrado extends Error {}

const documentoPorId = vi.fn();
const linksDoDocumento = vi.fn();
const modeloPorId = vi.fn();

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new NaoEncontrado("404");
  },
}));
// As telas em si não importam aqui, e puxariam o cliente do Supabase.
vi.mock("@/components/documentos/detalhe-documento", () => ({ DetalheDocumento: () => null }));
vi.mock("@/components/documentos/formulario-modelo", () => ({ FormularioModelo: () => null }));
vi.mock("@/lib/auth", () => ({ ehAdministradora: async () => true }));
vi.mock("@/server/consultas/documentos", () => ({
  EstruturaDocumentoPendenteError: class extends Error {},
  documentoPorId: (id: string) => documentoPorId(id),
  linksDoDocumento: (id: string) => linksDoDocumento(id),
  modeloPorId: (id: string) => modeloPorId(id),
}));

const { default: PaginaDocumento } = await import("./page");
const { default: PaginaEditarModelo } = await import("../modelos/[id]/editar/page");

describe("id sem forma de uuid vira 404, sem ir ao banco", () => {
  beforeEach(() => {
    documentoPorId.mockReset();
    modeloPorId.mockReset();
  });

  it("documento", async () => {
    await expect(
      PaginaDocumento({ params: Promise.resolve({ id: "nao-e-uuid" }) }),
    ).rejects.toBeInstanceOf(NaoEncontrado);
    expect(documentoPorId).not.toHaveBeenCalled();
  });

  it("modelo em edição", async () => {
    await expect(
      PaginaEditarModelo({ params: Promise.resolve({ id: "nao-e-uuid" }) }),
    ).rejects.toBeInstanceOf(NaoEncontrado);
    expect(modeloPorId).not.toHaveBeenCalled();
  });
});
