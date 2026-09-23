import { describe, expect, it } from "vitest";
import { FOLGA_DE_ENVIO_MS, lerSobrasDasFotos } from "./prontuario-imagens";

const PRONTUARIO = "0b6f3c1e-8a4d-4c1b-9a2e-7d5f1e2a3b4c";
const IMAGEM = "5c2d9e8f-1a3b-4c5d-8e6f-7a8b9c0d1e2f";
const AGORA = new Date("2026-09-23T15:00:00Z");

describe("lerSobrasDasFotos", () => {
  it("lê as duas situações e trata nulo em imagem_id e prontuario_id", () => {
    const sobras = lerSobrasDasFotos(
      [
        {
          situacao: "metadado_sem_arquivo",
          caminho: `${PRONTUARIO}/a.jpg`,
          imagem_id: IMAGEM,
          prontuario_id: PRONTUARIO,
          desde: "2026-09-20T10:00:00+00:00",
        },
        {
          situacao: "arquivo_sem_metadado",
          caminho: "solto/b.png",
          imagem_id: null,
          prontuario_id: null,
          desde: "2026-09-21T10:00:00+00:00",
        },
      ],
      AGORA,
    );

    expect(sobras).toEqual([
      {
        situacao: "metadado_sem_arquivo",
        caminho: `${PRONTUARIO}/a.jpg`,
        imagemId: IMAGEM,
        prontuarioId: PRONTUARIO,
        desde: new Date("2026-09-20T10:00:00Z"),
        recente: false,
      },
      {
        situacao: "arquivo_sem_metadado",
        caminho: "solto/b.png",
        imagemId: null,
        prontuarioId: null,
        desde: new Date("2026-09-21T10:00:00Z"),
        recente: false,
      },
    ]);
  });

  it("marca como recente o que tem menos de uma hora", () => {
    const menosDeUmaHora = new Date(AGORA.getTime() - FOLGA_DE_ENVIO_MS + 1000).toISOString();
    const umaHoraExata = new Date(AGORA.getTime() - FOLGA_DE_ENVIO_MS).toISOString();
    const [recente, antiga] = lerSobrasDasFotos(
      [
        { situacao: "arquivo_sem_metadado", caminho: `${PRONTUARIO}/c.webp`, imagem_id: null, prontuario_id: PRONTUARIO, desde: menosDeUmaHora },
        { situacao: "arquivo_sem_metadado", caminho: `${PRONTUARIO}/d.webp`, imagem_id: null, prontuario_id: PRONTUARIO, desde: umaHoraExata },
      ],
      AGORA,
    );

    expect(recente?.recente).toBe(true);
    expect(antiga?.recente).toBe(false);
  });

  it("descarta situação desconhecida e data ilegível, e ignora id que não é uuid", () => {
    const sobras = lerSobrasDasFotos(
      [
        { situacao: "outra", caminho: "x", imagem_id: null, prontuario_id: null, desde: "2026-09-20T10:00:00Z" },
        { situacao: "arquivo_sem_metadado", caminho: "y", imagem_id: null, prontuario_id: null, desde: "ontem" },
        { situacao: "arquivo_sem_metadado", caminho: "z", imagem_id: IMAGEM, prontuario_id: "pasta", desde: "2026-09-20T10:00:00Z" },
      ],
      AGORA,
    );

    expect(sobras).toHaveLength(1);
    expect(sobras[0]).toMatchObject({ caminho: "z", imagemId: null, prontuarioId: null });
  });
});
