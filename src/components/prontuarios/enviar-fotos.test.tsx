import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A data de captura é conferida ANTES de o arquivo subir ao Storage, com a
 * mesma `motivoDataInvalida` que `registrarImagem` usa. Recusada só no
 * servidor, cada foto do lote já teria ido ao bucket.
 */

const upload = vi.fn(async () => ({ data: { path: "x" }, error: null }));
const registrarImagem = vi.fn(async () => ({ ok: true as const }));

vi.mock("@/lib/supabase/client", () => ({
  clienteNavegador: () => ({ storage: { from: () => ({ upload }) } }),
}));
vi.mock("@/server/acoes/prontuario-imagens", () => ({
  registrarImagem: (...argumentos: unknown[]) => registrarImagem(...(argumentos as [])),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => undefined }) }));

const { EnviarFotos } = await import("./enviar-fotos");

const PRONTUARIO = "c0000000-0000-4000-8000-000000000001";
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);

function montar() {
  const { container } = render(
    <EnviarFotos prontuarioId={PRONTUARIO} dataSugerida="2026-09-01" hojeNaClinica="2026-09-23" />,
  );
  const arquivo = new File([JPEG], "foto.jpg", { type: "image/jpeg" });
  fireEvent.change(container.querySelector("#foto-arquivos")!, { target: { files: [arquivo] } });
  return {
    data: container.querySelector<HTMLInputElement>("#foto-data-captura")!,
    formulario: container.querySelector("form")!,
  };
}

beforeEach(() => {
  upload.mockClear();
  registrarImagem.mockClear();
});

describe("EnviarFotos — data de captura", () => {
  it.each([
    ["ano digitado errado", "0025-05-10", "Data inválida."],
    ["data no futuro", "2199-12-31", "A foto não pode ter sido tirada no futuro."],
  ])("%s: nada sobe ao Storage e o erro aparece no campo", async (_nome, valor, frase) => {
    const { data, formulario } = montar();
    fireEvent.change(data, { target: { value: valor } });

    await act(async () => {
      fireEvent.submit(formulario);
    });

    expect(upload).not.toHaveBeenCalled();
    expect(registrarImagem).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(frase);
    expect(data).toHaveAttribute("aria-invalid", "true");
  });

  it("corrigida a data, o erro some e o envio segue: arquivo primeiro, linha depois", async () => {
    const { data, formulario } = montar();
    fireEvent.change(data, { target: { value: "0025-05-10" } });
    await act(async () => {
      fireEvent.submit(formulario);
    });
    expect(screen.queryByText("Data inválida.")).toBeInTheDocument();

    fireEvent.change(data, { target: { value: "2026-09-20" } });
    expect(screen.queryByText("Data inválida.")).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.submit(formulario);
    });

    expect(upload).toHaveBeenCalledTimes(1);
    expect(registrarImagem).toHaveBeenCalledTimes(1);
    expect(registrarImagem).toHaveBeenCalledWith(
      expect.objectContaining({ prontuarioId: PRONTUARIO, dataCaptura: "2026-09-20" }),
    );
  });
});
