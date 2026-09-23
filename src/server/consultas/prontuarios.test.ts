import { beforeEach, describe, expect, it, vi } from "vitest";
import { linhaDeRegistro } from "../../../testes/supabase-falso";

/**
 * Leituras do prontuário: o que vira 404, o que vira "Migração pendente" e o
 * que vira tela de erro.
 *
 * `null` (e daí o `notFound()` da página) é só para a linha que não existe ou
 * que a RLS não mostra. Erro de banco falha alto por `falhaDeConsulta` —
 * registrado e levado ao `error.tsx` (AGENTS.md §6, regra 11).
 */

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

type Resposta = {
  data?: unknown;
  count?: number | null;
  error?: { code?: string; message?: string } | null;
};

/**
 * Cliente falso que também entrega `count`. O de `testes/supabase-falso.ts`
 * só devolve `data` e `error`, e a paginação depende da contagem.
 */
function clienteFalso(respostas: Record<string, Resposta[]>) {
  const chamadas: { alvo: string; passos: { metodo: string; argumentos: unknown[] }[] }[] = [];
  const filas = new Map(Object.entries(respostas).map(([alvo, r]) => [alvo, [...r]]));

  function construtor(alvo: string): unknown {
    const chamada = { alvo, passos: [] as { metodo: string; argumentos: unknown[] }[] };
    chamadas.push(chamada);
    const proxy: unknown = new Proxy(
      {},
      {
        get(_objeto, propriedade) {
          if (propriedade === "then") {
            return (resolver: (valor: unknown) => void) => {
              const fila = filas.get(alvo) ?? [];
              const r = fila.length > 1 ? fila.shift()! : fila[0];
              resolver({ data: r?.data ?? null, count: r?.count ?? null, error: r?.error ?? null });
            };
          }
          return (...argumentos: unknown[]) => {
            chamada.passos.push({ metodo: String(propriedade), argumentos });
            return proxy;
          };
        },
      },
    );
    return proxy;
  }

  return {
    cliente: { from: (tabela: string) => construtor(tabela) },
    chamadas,
    passosDe: (alvo: string, indice = 0) =>
      chamadas.filter((c) => c.alvo === alvo)[indice]?.passos ?? [],
  };
}

const ID = "c0000000-0000-4000-8000-000000000001";
const PACIENTE = "b0000000-0000-4000-8000-000000000001";

const TIMEOUT = { code: "57014", message: "canceling statement due to statement timeout" };
const COLUNA_SUMIU = { code: "42703", message: 'column prontuarios.exemplo does not exist' };
const SEM_TABELA = {
  code: "PGRST205",
  message: "Could not find the table 'public.prontuarios' in the schema cache",
};
const ALEM_DO_FIM = {
  code: "PGRST103",
  message: "Requested range not satisfiable",
};

const TEXTO_TECNICO = /statement|timeout|column|does not exist|schema cache|PGRST|57014|42703/i;

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("prontuarioPorId", () => {
  it.each([
    ["timeout", TIMEOUT],
    ["coluna renomeada", COLUNA_SUMIU],
  ])("%s no cabeçalho falha alto: não vira null (404) e vai para o log", async (_nome, erro) => {
    banco.cliente = clienteFalso({ prontuarios: [{ error: erro }] }).cliente;
    const { prontuarioPorId } = await import("./prontuarios");

    const falhou = await prontuarioPorId(ID).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(falhou).toBeInstanceOf(Error);
    expect(falhou?.message).not.toMatch(TEXTO_TECNICO);
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta prontuarios", erro.code));
  });

  it("tabela ausente continua virando o card \"Migração pendente\"", async () => {
    banco.cliente = clienteFalso({ prontuarios: [{ error: SEM_TABELA }] }).cliente;
    const { prontuarioPorId, EstruturaProntuarioPendenteError } = await import("./prontuarios");

    await expect(prontuarioPorId(ID)).rejects.toBeInstanceOf(EstruturaProntuarioPendenteError);
  });

  it("linha que não existe (ou que a RLS esconde) é null — e a página vira 404", async () => {
    const falso = clienteFalso({ prontuarios: [{ data: null }] });
    banco.cliente = falso.cliente;
    const { prontuarioPorId } = await import("./prontuarios");

    expect(await prontuarioPorId(ID)).toBeNull();
    expect(falso.chamadas.map((c) => c.alvo)).toEqual(["prontuarios"]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("id sem forma de uuid é null sem ir ao banco (o Postgres recusaria com 22P02)", async () => {
    const falso = clienteFalso({});
    banco.cliente = falso.cliente;
    const { prontuarioPorId } = await import("./prontuarios");

    expect(await prontuarioPorId("nao-e-uuid")).toBeNull();
    expect(falso.chamadas).toHaveLength(0);
  });
});

describe("pacienteParaProntuario e atendimentoParaProntuario", () => {
  it("erro de banco falha alto — o formulário não abre em silêncio sem a paciente", async () => {
    banco.cliente = clienteFalso({ pacientes: [{ error: TIMEOUT }] }).cliente;
    const { pacienteParaProntuario } = await import("./prontuarios");

    await expect(pacienteParaProntuario(PACIENTE)).rejects.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it("erro de banco no atendimento também falha alto", async () => {
    banco.cliente = clienteFalso({ atendimentos: [{ error: TIMEOUT }] }).cliente;
    const { atendimentoParaProntuario } = await import("./prontuarios");

    await expect(atendimentoParaProntuario(ID)).rejects.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it("não encontrado e id malformado continuam null", async () => {
    const falso = clienteFalso({ pacientes: [{ data: null }], atendimentos: [{ data: null }] });
    banco.cliente = falso.cliente;
    const { atendimentoParaProntuario, pacienteParaProntuario } = await import("./prontuarios");

    expect(await pacienteParaProntuario(PACIENTE)).toBeNull();
    expect(await atendimentoParaProntuario(ID)).toBeNull();
    expect(await pacienteParaProntuario("x")).toBeNull();
    expect(await atendimentoParaProntuario("x")).toBeNull();
    expect(falso.chamadas).toHaveLength(2);
  });
});

describe("listarProntuarios — página além do fim", () => {
  it("responde lista vazia com o total e as páginas de verdade, sem tela de erro", async () => {
    const falso = clienteFalso({
      prontuarios: [{ error: ALEM_DO_FIM }, { count: 45 }],
    });
    banco.cliente = falso.cliente;
    const { listarProntuarios } = await import("./prontuarios");

    expect(await listarProntuarios({ pagina: 99 })).toEqual({
      itens: [],
      total: 45,
      pagina: 99,
      paginas: 3,
    });

    // A contagem é à parte, só com o número (`head`), e sem pedir versões.
    expect(falso.passosDe("prontuarios", 1)).toContainEqual({
      metodo: "select",
      argumentos: ["id", { count: "exact", head: true }],
    });
    expect(falso.chamadas.map((c) => c.alvo)).toEqual(["prontuarios", "prontuarios"]);
    expect(console.error).not.toHaveBeenCalled();
  });

  it("com busca, a contagem usa o mesmo filtro da página", async () => {
    const falso = clienteFalso({
      pacientes: [{ data: [{ id: PACIENTE }] }],
      prontuarios: [{ error: ALEM_DO_FIM }, { count: 1 }],
    });
    banco.cliente = falso.cliente;
    const { listarProntuarios } = await import("./prontuarios");

    const r = await listarProntuarios({ busca: "ana", pagina: 5 });
    expect(r).toMatchObject({ itens: [], total: 1, paginas: 1 });

    const filtroDaPagina = falso.passosDe("prontuarios", 0).find((p) => p.metodo === "or");
    const filtroDaContagem = falso.passosDe("prontuarios", 1).find((p) => p.metodo === "or");
    expect(filtroDaPagina).toBeDefined();
    expect(filtroDaContagem).toEqual(filtroDaPagina);
    expect(String(filtroDaContagem?.argumentos[0])).toContain(`paciente_id.in.(${PACIENTE})`);
  });

  it("se a contagem também falha, aí sim é tela de erro", async () => {
    banco.cliente = clienteFalso({
      prontuarios: [{ error: ALEM_DO_FIM }, { error: TIMEOUT }],
    }).cliente;
    const { listarProntuarios } = await import("./prontuarios");

    await expect(listarProntuarios({ pagina: 99 })).rejects.toThrow();
    expect(console.error).toHaveBeenCalled();
  });

  it("outro erro da página continua falhando alto; tabela ausente continua sendo migração pendente", async () => {
    banco.cliente = clienteFalso({ prontuarios: [{ error: TIMEOUT }] }).cliente;
    const primeiro = await import("./prontuarios");
    await expect(primeiro.listarProntuarios({ pagina: 1 })).rejects.not.toBeInstanceOf(
      primeiro.EstruturaProntuarioPendenteError,
    );

    banco.cliente = clienteFalso({ prontuarios: [{ error: SEM_TABELA }] }).cliente;
    await expect(primeiro.listarProntuarios({ pagina: 2 })).rejects.toBeInstanceOf(
      primeiro.EstruturaProntuarioPendenteError,
    );
  });
});
