import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseFalso } from "../../../testes/supabase-falso";

/**
 * `registrarImagem` roda com o arquivo JÁ no bucket: o navegador sobe antes
 * de chamar a ação (AGENTS.md §8.5). Toda recusa depois de o caminho ser
 * conferido precisa tirar o arquivo de lá — senão sobra dado de saúde sem
 * linha, fora da galeria e fora do alcance da eliminação.
 *
 * O resto do envio (tipo pelo conteúdo, 23505, falha parcial) está em
 * `clinico.test.ts`; aqui ficam as saídas que deixavam o arquivo para trás.
 */

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string; papel: "administradora" | "financeiro" | "recepcao" },
}));
const banco = vi.hoisted(() => ({ cliente: null as unknown }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, email: "x@clinica.local", nome: "Pessoa de Teste" },
}));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));
vi.mock("next/cache", () => ({
  revalidatePath: (caminho: string) => navegacao.revalidados.push(caminho),
}));

const ADMIN = "a0000000-0000-4000-8000-000000000001";
const PRONTUARIO = "c0000000-0000-4000-8000-000000000001";
const ARQUIVO = "0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6c";
const BALDE = "storage:prontuario-imagens";
const CAMINHO = `${PRONTUARIO}/${ARQUIVO}.jpg`;

const ENTRADA = {
  prontuarioId: PRONTUARIO,
  caminho: CAMINHO,
  nomeOriginal: "maria-silva-antes.jpg",
  dataCaptura: "2026-09-01",
  legenda: "antes",
  largura: 800,
  altura: 600,
};

const TEXTO_TECNICO = /violates|constraint|relation|policy|syntax|PGRST|Internal|timeout/i;

function removidos(falso: ReturnType<typeof supabaseFalso>): unknown[] {
  return falso.chamadasStorage
    .filter((c) => c.alvo === `${BALDE}:remove`)
    .map((c) => c.argumentos[0]);
}

function inseriuFoto(falso: ReturnType<typeof supabaseFalso>): boolean {
  return falso.chamadas.some(
    (c) => c.alvo === "prontuario_imagens" && c.passos.some((p) => p.metodo === "insert"),
  );
}

function logado(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

beforeEach(() => {
  sessao.usuario = { id: ADMIN, papel: "administradora" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("registrarImagem — recusa depois do upload remove o arquivo", () => {
  it.each([
    ["ano digitado errado", "0025-05-10", "Data inválida."],
    ["dia que não existe", "2026-02-30", "Data inválida."],
    ["data no futuro", "2199-12-31", "A foto não pode ter sido tirada no futuro."],
    ["data vazia", "", "Informe quando a foto foi tirada."],
  ])("%s: recusa, tira o arquivo do bucket e não grava linha", async (_nome, dataCaptura, erro) => {
    const falso = supabaseFalso({ prontuario_imagens: { data: null } });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    expect(await registrarImagem({ ...ENTRADA, dataCaptura })).toEqual({ ok: false, erro });
    expect(removidos(falso)).toEqual([[CAMINHO]]);
    // Nem chega a conferir o objeto: a recusa é da data.
    expect(falso.chamadasStorage.map((c) => c.alvo)).not.toContain(`${BALDE}:list`);
    expect(inseriuFoto(falso)).toBe(false);
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("data inválida num caminho que já tem linha não remove o arquivo da foto registrada", async () => {
    const falso = supabaseFalso({ prontuario_imagens: { data: { prontuario_id: PRONTUARIO } } });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    // Replay de um envio que já deu certo: nada muda, nada sai do bucket.
    expect(await registrarImagem({ ...ENTRADA, dataCaptura: "0025-05-10" })).toEqual({ ok: true });
    expect(falso.chamadasStorage).toHaveLength(0);
  });

  it("remoção recusada pelo Storage na data inválida: o órfão vai para o log com o caminho", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { data: null },
      [`${BALDE}:remove`]: { error: { message: "Internal error" } },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem({ ...ENTRADA, dataCaptura: "0025-05-10" });
    expect(r).toEqual({ ok: false, erro: "Data inválida." });
    expect(logado()).toMatch(/arquivo órfão no bucket \(data inválida\)/);
    expect(logado()).toContain(CAMINHO);
    expect(logado()).not.toMatch(/maria|antes/i);
  });

  it("falha ao conferir o objeto (storage.list): o arquivo sai, a frase é segura e há log", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { data: null },
      [`${BALDE}:list`]: { error: { message: "Internal Server Error: timeout" } },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(ENTRADA);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.erro).toBe("Não foi possível confirmar o arquivo no armazenamento. Envie de novo.");
      expect(r.erro).not.toMatch(TEXTO_TECNICO);
    }
    expect(removidos(falso)).toEqual([[CAMINHO]]);
    expect(inseriuFoto(falso)).toBe(false);
    expect(logado()).toMatch(/conferir o arquivo enviado/);
  });

  it("objeto não encontrado: a tentativa de remoção cobre o que tenha chegado sem metadados", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { data: null },
      [`${BALDE}:list`]: { data: [{ name: `${ARQUIVO}.jpg`, metadata: null }] },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(ENTRADA);
    expect(r).toEqual({ ok: false, erro: "O arquivo não chegou ao armazenamento. Envie de novo." });
    expect(removidos(falso)).toEqual([[CAMINHO]]);
    expect(inseriuFoto(falso)).toBe(false);
  });

  it("sem conseguir ler se o caminho já tem linha, o arquivo fica — e o log leva o caminho", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { error: { code: "57014", message: "canceling statement due to statement timeout" } },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(ENTRADA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).not.toMatch(TEXTO_TECNICO);
    // Remover aqui poderia apagar o arquivo de uma foto já registrada.
    expect(falso.chamadasStorage).toHaveLength(0);
    expect(logado()).toMatch(/arquivo órfão no bucket \(registro não conferido\)/);
    expect(logado()).toContain(CAMINHO);
  });

  it("caminho de outro prontuário continua recusado sem tocar no Storage", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const outro = `c0000000-0000-4000-8000-000000000002/${ARQUIVO}.jpg`;
    const r = await registrarImagem({ ...ENTRADA, caminho: outro, dataCaptura: "0025-05-10" });
    expect(r).toEqual({ ok: false, erro: "Caminho do arquivo inválido." });
    expect(falso.chamadas).toHaveLength(0);
    expect(falso.chamadasStorage).toHaveLength(0);
  });
});
