import { beforeEach, describe, expect, it, vi } from "vitest";
import { linhaDeRegistro, supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

const PACIENTE = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("historicoDoPaciente — resumo financeiro da ficha", () => {
  it("soma em centavos: R$ 10,10 + R$ 20,20 é R$ 30,30, e não 30,299999…", async () => {
    // Em reais de ponto flutuante: 10.1 + 20.2 = 30.299999999999997 e
    // 0.1 + 0.2 = 0.30000000000000004.
    banco.cliente = supabaseFalso({
      recebimentos: {
        data: [
          { valor: 10.1, situacao: "recebido" },
          { valor: 20.2, situacao: "recebido_divergencia" },
          { valor: 0.1, situacao: "previsto" },
          { valor: 0.2, situacao: "pendente" },
          // Cancelado não é recebido nem devido.
          { valor: 500, situacao: "cancelado" },
        ],
      },
    }).cliente;
    const { historicoDoPaciente } = await import("./pacientes");

    const { financeiro } = await historicoDoPaciente(PACIENTE);

    expect(financeiro.recebido).toBe(30.3);
    expect(financeiro.emAberto).toBe(0.3);
  });

  it("sem recebimento: zero de verdade, não falha", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { historicoDoPaciente } = await import("./pacientes");

    expect((await historicoDoPaciente(PACIENTE)).financeiro).toEqual({ recebido: 0, emAberto: 0 });
  });

  it("os recebimentos somados são lidos em blocos, com ordem única", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { historicoDoPaciente } = await import("./pacientes");

    await historicoDoPaciente(PACIENTE);

    const passos = falso.passosDe("recebimentos");
    expect(passos).toContainEqual({ metodo: "eq", argumentos: ["paciente_id", PACIENTE] });
    expect(passos).toContainEqual({ metodo: "order", argumentos: ["id"] });
    expect(passos).toContainEqual({ metodo: "range", argumentos: [0, 499] });
  });

  // Antes só o erro dos atendimentos era lido: recebimento que falhava virava
  // "Total recebido R$ 0,00", e pendência que falhava, "Nada em aberto".
  it.each(["atendimentos", "retornos", "pendencias", "recebimentos"])(
    "falha em %s vira tela de erro, não número zerado",
    async (tabela) => {
      banco.cliente = supabaseFalso({
        [tabela]: { error: { code: "XX000", message: "falha simulada" } },
      }).cliente;
      const { historicoDoPaciente } = await import("./pacientes");

      await expect(historicoDoPaciente(PACIENTE)).rejects.toThrow("Não foi possível carregar o histórico.");
      // O formato da linha de log é de `lib/registro.ts`; aqui importa que
      // o contexto e o código cheguem a ela.
      expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta pacientes", "XX000"));
    },
  );
});

// ---------------------------------------------------------------------
// Listagem paginada
// ---------------------------------------------------------------------

type Passo = { metodo: string; argumentos: unknown[] };
type Resposta = { data: unknown; count: number | null; error: { code: string; message: string } | null };

/**
 * Cliente falso que responde conforme a consulta: com `range` é a página, sem
 * `range` é a contagem. O `supabaseFalso` não entrega `count`.
 */
function clienteDaListagem(pagina: Resposta, contagem: Resposta) {
  const consultas: Passo[][] = [];
  const cliente = {
    from: () => {
      const passos: Passo[] = [];
      consultas.push(passos);
      const construtor: object = new Proxy(
        {},
        {
          get(_alvo, propriedade) {
            if (propriedade === "then") {
              return (resolver: (valor: Resposta) => void) =>
                resolver(passos.some((p) => p.metodo === "range") ? pagina : contagem);
            }
            return (...argumentos: unknown[]) => {
              passos.push({ metodo: String(propriedade), argumentos });
              return construtor;
            };
          },
        },
      );
      return construtor;
    },
  };
  return { cliente, consultas };
}

const ALEM_DO_FIM: Resposta = {
  data: null,
  count: null,
  error: { code: "PGRST103", message: "Requested range not satisfiable" },
};

describe("listarPacientes — página além da última", () => {
  it("responde lista vazia com o total certo, em vez da tela de erro", async () => {
    const { cliente, consultas } = clienteDaListagem(ALEM_DO_FIM, { data: null, count: 37, error: null });
    banco.cliente = cliente;
    const { listarPacientes } = await import("./pacientes");

    const resultado = await listarPacientes({ busca: "ana", situacao: "arquivadas", pagina: 99 });

    expect(resultado).toEqual({ itens: [], total: 37, pagina: 99, paginas: 2 });
    expect(console.error).not.toHaveBeenCalled();

    // A contagem é só contagem (sem linhas) e conta o mesmo conjunto da lista.
    const [daPagina, daContagem] = consultas;
    const semOrdemNemPagina = (passos: Passo[]) =>
      passos.filter((p) => p.metodo !== "order" && p.metodo !== "range" && p.metodo !== "select");
    expect(daContagem.find((p) => p.metodo === "select")?.argumentos[1]).toEqual({ count: "exact", head: true });
    expect(daContagem.some((p) => p.metodo === "range")).toBe(false);
    expect(semOrdemNemPagina(daContagem)).toEqual(semOrdemNemPagina(daPagina));
    expect(semOrdemNemPagina(daContagem)).toContainEqual({ metodo: "eq", argumentos: ["ativo", false] });
  });

  it("outro erro na página continua falhando alto", async () => {
    const { cliente, consultas } = clienteDaListagem(
      { data: null, count: null, error: { code: "XX000", message: "falha simulada" } },
      { data: null, count: 37, error: null },
    );
    banco.cliente = cliente;
    const { listarPacientes } = await import("./pacientes");

    await expect(listarPacientes({ pagina: 2 })).rejects.toThrow("Não foi possível carregar os pacientes.");
    expect(consultas).toHaveLength(1);
  });

  it("se a contagem de socorro falhar, falha alto também", async () => {
    const { cliente } = clienteDaListagem(ALEM_DO_FIM, {
      data: null,
      count: null,
      error: { code: "XX000", message: "falha simulada" },
    });
    banco.cliente = cliente;
    const { listarPacientes } = await import("./pacientes");

    await expect(listarPacientes({ pagina: 99 })).rejects.toThrow("Não foi possível carregar os pacientes.");
  });
});

describe("pacientePorId — erro de banco não é ficha inexistente", () => {
  it("id torto é 404 sem ir ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { pacientePorId } = await import("./pacientes");

    expect(await pacientePorId("nao-e-uuid")).toBeNull();
    expect(falso.chamadas).toHaveLength(0);
  });

  it("sem linha (inexistente ou escondida pela RLS) é 404", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { pacientePorId } = await import("./pacientes");

    expect(await pacientePorId(PACIENTE)).toBeNull();
  });

  it("falha do banco sobe para a tela de erro, sem texto técnico", async () => {
    banco.cliente = supabaseFalso({
      pacientes: { error: { code: "57014", message: "canceling statement due to statement timeout" } },
    }).cliente;
    const { pacientePorId } = await import("./pacientes");

    await expect(pacientePorId(PACIENTE)).rejects.toThrow(/^(?!.*statement timeout)/);
  });
});
