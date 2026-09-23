import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Cliente falso próprio, e não o de `testes/supabase-falso.ts`: aqui o que se
 * confere é justamente o `count` (que aquele não entrega) e a forma de cada
 * consulta — `head`, filtros, `neq` —, com a resposta decidida por quem pergunta.
 */
type Passo = { metodo: string; argumentos: unknown[] };
type Chamada = { tabela: string; passos: Passo[] };
type Resposta = { data?: unknown; count?: number | null; error?: { code?: string; message?: string } | null };

function clienteFalso(responder: (chamada: Chamada) => Resposta) {
  const chamadas: Chamada[] = [];
  const cliente = {
    from(tabela: string) {
      const chamada: Chamada = { tabela, passos: [] };
      chamadas.push(chamada);
      const construtor: object = new Proxy(
        {},
        {
          get(_alvo, propriedade) {
            if (propriedade === "then") {
              return (resolver: (valor: unknown) => void) => {
                const resposta = responder(chamada);
                resolver({
                  data: resposta.data ?? null,
                  count: resposta.count ?? null,
                  error: resposta.error ?? null,
                });
              };
            }
            return (...argumentos: unknown[]) => {
              chamada.passos.push({ metodo: String(propriedade), argumentos });
              return construtor;
            };
          },
        },
      );
      return construtor;
    },
  };
  return { cliente, chamadas };
}

function passo(chamada: Chamada, metodo: string) {
  return chamada.passos.find((p) => p.metodo === metodo);
}

function soContagem(chamada: Chamada): boolean {
  const opcoes = passo(chamada, "select")?.argumentos[1] as { head?: boolean } | undefined;
  return opcoes?.head === true;
}

const estado = vi.hoisted(() => ({ cliente: null as unknown, administradora: false }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => estado.cliente }));
vi.mock("@/lib/auth", () => ({ ehAdministradora: async () => estado.administradora }));

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

const CONTRATO = { id: "m-contrato", tipo: "contrato", nome: "Contrato", descricao: "", ativo: true, atualizado_em: "2026-09-01T12:00:00Z", exemplo: false };
const ANAMNESE = { id: "m-anamnese", tipo: "anamnese", nome: "Anamnese", descricao: "", ativo: true, atualizado_em: "2026-09-01T12:00:00Z", exemplo: false };

function catalogo(contagens: Record<string, number>) {
  return clienteFalso((chamada) => {
    if (chamada.tabela === "modelos_documento") return { data: [CONTRATO, ANAMNESE] };
    if (chamada.tabela === "modelo_documento_versoes") return { data: [] };
    // documentos: só se aceita contagem sem linhas.
    if (!soContagem(chamada)) return { data: [{ modelo_id: "m-contrato" }] };
    const modelo = String(passo(chamada, "eq")?.argumentos[1]);
    return { count: contagens[modelo] ?? 0 };
  });
}

describe("listarModelos — contagem de emitidos", () => {
  it("recepção: anamnese vira null (não visível), e o banco nem é perguntado", async () => {
    estado.administradora = false;
    const falso = catalogo({ "m-contrato": 1500, "m-anamnese": 7 });
    estado.cliente = falso.cliente;
    const { listarModelos } = await import("./documentos");

    const modelos = await listarModelos();

    expect(modelos.find((m) => m.id === "m-contrato")?.emitidos).toBe(1500);
    expect(modelos.find((m) => m.id === "m-anamnese")?.emitidos).toBeNull();

    const contagens = falso.chamadas.filter((c) => c.tabela === "documentos");
    expect(contagens).toHaveLength(1);
    expect(passo(contagens[0], "eq")?.argumentos).toEqual(["modelo_id", "m-contrato"]);
  });

  it("administradora: conta todo modelo, no banco, sem baixar linhas (acima de 1000)", async () => {
    estado.administradora = true;
    const falso = catalogo({ "m-contrato": 1500, "m-anamnese": 7 });
    estado.cliente = falso.cliente;
    const { listarModelos } = await import("./documentos");

    const modelos = await listarModelos();

    expect(modelos.find((m) => m.id === "m-contrato")?.emitidos).toBe(1500);
    expect(modelos.find((m) => m.id === "m-anamnese")?.emitidos).toBe(7);
    for (const chamada of falso.chamadas.filter((c) => c.tabela === "documentos")) {
      expect(passo(chamada, "select")?.argumentos[1]).toEqual({ count: "exact", head: true });
    }
  });
});

describe("modelosParaEmissao — anamnese só para a administradora", () => {
  function emissao() {
    return clienteFalso((chamada) =>
      chamada.tabela === "modelos_documento"
        ? { data: [CONTRATO] }
        : { data: [{ modelo_id: "m-contrato", versao: 1, corpo: "Texto", campos: [] }] },
    );
  }

  it("recepção: a consulta exclui o tipo anamnese", async () => {
    estado.administradora = false;
    const falso = emissao();
    estado.cliente = falso.cliente;
    const { modelosParaEmissao } = await import("./documentos");

    await modelosParaEmissao();

    const modelos = falso.chamadas.find((c) => c.tabela === "modelos_documento")!;
    expect(passo(modelos, "neq")?.argumentos).toEqual(["tipo", "anamnese"]);
  });

  it("administradora: nada é excluído", async () => {
    estado.administradora = true;
    const falso = emissao();
    estado.cliente = falso.cliente;
    const { modelosParaEmissao } = await import("./documentos");

    await modelosParaEmissao();

    const modelos = falso.chamadas.find((c) => c.tabela === "modelos_documento")!;
    expect(passo(modelos, "neq")).toBeUndefined();
  });
});

describe("listarDocumentos — página além do fim", () => {
  it("PGRST103 vira lista vazia com o total recontado pelos mesmos filtros", async () => {
    const falso = clienteFalso((chamada) =>
      soContagem(chamada)
        ? { count: 25 }
        : { error: { code: "PGRST103", message: "Requested range not satisfiable" } },
    );
    estado.cliente = falso.cliente;
    const { listarDocumentos } = await import("./documentos");

    const pagina = await listarDocumentos({ situacao: "emitido", tipo: "contrato", pagina: 9 });

    expect(pagina).toEqual({ itens: [], total: 25, pagina: 9, paginas: 2 });

    const [lista, contagem] = falso.chamadas.filter((c) => c.tabela === "documentos");
    expect(soContagem(contagem)).toBe(true);
    const filtros = (c: Chamada) => c.passos.filter((p) => p.metodo === "eq").map((p) => p.argumentos);
    expect(filtros(contagem)).toEqual(filtros(lista));
    expect(filtros(contagem)).toEqual([
      ["situacao", "emitido"],
      ["tipo", "contrato"],
    ]);
  });

  it("outro erro continua falhando alto", async () => {
    estado.cliente = clienteFalso(() => ({ error: { code: "XX000", message: "falha simulada" } })).cliente;
    const { listarDocumentos } = await import("./documentos");

    await expect(listarDocumentos({ pagina: 1 })).rejects.toThrow();
  });
});

describe("consultas por id — id malformado não chega ao banco", () => {
  it("modeloPorId, documentoPorId e linksDoDocumento respondem vazio sem consultar", async () => {
    // Com id que não é uuid o Postgres recusaria o cast (22P02) e a tela
    // cairia no erro em vez do 404.
    const falso = clienteFalso(() => ({ error: { code: "22P02", message: "invalid input syntax for type uuid" } }));
    estado.cliente = falso.cliente;
    const { modeloPorId, documentoPorId, linksDoDocumento } = await import("./documentos");

    expect(await modeloPorId("nao-e-uuid")).toBeNull();
    expect(await documentoPorId("nao-e-uuid")).toBeNull();
    expect(await linksDoDocumento("nao-e-uuid")).toEqual([]);
    expect(falso.chamadas).toHaveLength(0);
  });
});
