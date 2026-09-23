import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { linhaDeRegistro, Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

// ---------------------------------------------------------------------
// Dublês: sessão, cliente do banco e as funções de navegação do Next
// ---------------------------------------------------------------------

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
vi.mock("next/navigation", async () => {
  const { Redirecionou: R } = await import("../../../testes/supabase-falso");
  return {
    redirect: (destino: string) => {
      throw new R(destino);
    },
  };
});

const ID = "c0000000-0000-4000-8000-000000000001";
const ATENDIMENTO = "a0000000-0000-4000-8000-000000000001";
const OUTRO = "a0000000-0000-4000-8000-000000000002";

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

const CAMPOS = {
  paciente_id: ID,
  profissional_id: ID,
  procedimento_id: ID,
  data: "2026-09-22",
  hora: "14:30",
  duracao_min: "60",
  valor: "150,00",
};

/** 22/09/2026 14:30 em São Paulo (UTC−3, sem horário de verão desde 2019). */
const INICIO_ISO = "2026-09-22T17:30:00.000Z";

const TEXTO_TECNICO = /violates|constraint|relation|exclusion|atendimentos_|PGRST|23P01/i;

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "recepcao" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** Chama a ação e devolve o destino do redirect, ou o estado devolvido. */
async function executar<T>(acao: () => Promise<T>): Promise<{ destino: string } | { estado: T }> {
  try {
    return { estado: await acao() };
  } catch (erro) {
    if (erro instanceof Redirecionou) return { destino: erro.destino };
    throw erro;
  }
}

describe("marcarAtendimento — validação antes do banco", () => {
  it("sem sessão não toca o banco", async () => {
    sessao.usuario = null;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario(CAMPOS));
    expect(r.erros.geral).toMatch(/Sessão expirada/);
    expect(falso.chamadas).toEqual([]);
  });

  it.each([
    ["hora 24:00", { hora: "24:00" }, "hora"],
    ["hora sem dois dígitos", { hora: "9:5" }, "hora"],
    ["29/02 fora de ano bissexto", { data: "2027-02-29" }, "data"],
    ["duração abaixo de 5", { duracao_min: "4" }, "duracao_min"],
    ["duração acima de 480", { duracao_min: "481" }, "duracao_min"],
    ["duração quebrada", { duracao_min: "45.5" }, "duracao_min"],
    ["profissional ausente", { profissional_id: "" }, "profissional_id"],
    ["procedimento que não é uuid", { procedimento_id: "1 or 1=1" }, "procedimento_id"],
    ["valor negativo", { valor: "-10" }, "valor"],
  ])("%s é recusado sem consultar a agenda", async (_nome, mudanca, campo) => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario({ ...CAMPOS, ...mudanca }));
    expect(r.erros).toHaveProperty(campo);
    expect(falso.chamadas).toEqual([]);
  });

  it("limites aceitos: 5 e 480 minutos, 29/02 em ano bissexto, 00:00 e 23:59", async () => {
    const { marcarAtendimento } = await import("./agenda");
    for (const mudanca of [
      { duracao_min: "5" },
      { duracao_min: "480" },
      { data: "2028-02-29" },
      { hora: "00:00" },
      { hora: "23:59" },
    ]) {
      banco.cliente = supabaseFalso({ atendimentos: { data: [] } }).cliente;
      const r = await executar(() => marcarAtendimento({ erros: {} }, formulario({ ...CAMPOS, ...mudanca })));
      expect(r).toHaveProperty("destino");
    }
  });
});

describe("marcarAtendimento — fuso e choque", () => {
  it("hora digitada é hora de São Paulo; o redirect volta ao dia da clínica", async () => {
    const falso = supabaseFalso({ atendimentos: { data: [] } });
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await executar(() => marcarAtendimento({ erros: {} }, formulario(CAMPOS)));
    expect(r).toEqual({ destino: "/agenda?dia=2026-09-22" });

    const insercao = falso.passosDe("atendimentos", 1).find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toMatchObject({
      inicio: INICIO_ISO,
      duracao_min: 60,
      valor: 150,
      criado_por: ID,
    });
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/agenda", "/"]));
  });

  it("o redirect mantém o filtro de profissional da agenda de origem; filtro torto cai fora", async () => {
    banco.cliente = supabaseFalso({ atendimentos: { data: [] } }).cliente;
    const { marcarAtendimento } = await import("./agenda");

    const comFiltro = await executar(() =>
      marcarAtendimento({ erros: {} }, formulario({ ...CAMPOS, filtro_profissional: OUTRO })),
    );
    expect(comFiltro).toEqual({ destino: `/agenda?dia=2026-09-22&profissional=${OUTRO}` });

    const torto = await executar(() =>
      marcarAtendimento({ erros: {} }, formulario({ ...CAMPOS, filtro_profissional: "x&dia=1" })),
    );
    expect(torto).toEqual({ destino: "/agenda?dia=2026-09-22" });
  });

  it("23:30 em São Paulo já é o dia seguinte em UTC, mas a agenda volta para o dia certo", async () => {
    const falso = supabaseFalso({ atendimentos: { data: [] } });
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await executar(() => marcarAtendimento({ erros: {} }, formulario({ ...CAMPOS, hora: "23:30" })));
    expect(r).toEqual({ destino: "/agenda?dia=2026-09-22" });
    const insercao = falso.passosDe("atendimentos", 1).find((p) => p.metodo === "insert");
    expect((insercao?.argumentos[0] as { inicio: string }).inicio).toBe("2026-09-23T02:30:00.000Z");
  });

  it("pré-checagem pergunta só pelo mesmo profissional e ignora cancelado e ausente", async () => {
    const falso = supabaseFalso({ atendimentos: { data: [] } });
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    await executar(() => marcarAtendimento({ erros: {} }, formulario(CAMPOS)));

    const passos = falso.passosDe("atendimentos", 0);
    expect(passos).toContainEqual({ metodo: "eq", argumentos: ["profissional_id", ID] });
    expect(passos).toContainEqual({ metodo: "not", argumentos: ["situacao", "in", "(cancelado,ausente)"] });
  });

  it("intervalo sobreposto é recusado com o nome de quem ocupa", async () => {
    const falso = supabaseFalso({
      atendimentos: {
        data: [
          {
            id: OUTRO,
            inicio: "2026-09-22T17:00:00.000Z", // 14:00 em São Paulo
            duracao_min: 60,
            pacientes: { nome: "Carla Dias", nome_social: "Cacá" },
          },
        ],
      },
    });
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario(CAMPOS));
    expect(r.erros.hora).toBe("Choca com o atendimento de Cacá às 14:00.");
    expect(r.valores?.hora).toBe("14:30");
    expect(falso.chamadas).toHaveLength(1); // não tentou inserir
  });

  it("limite exato não choca: um termina 14:30, o outro começa 14:30", async () => {
    const falso = supabaseFalso({
      atendimentos: {
        data: [
          {
            id: OUTRO,
            inicio: "2026-09-22T16:30:00.000Z", // 13:30–14:30
            duracao_min: 60,
            pacientes: { nome: "Carla Dias", nome_social: null },
          },
        ],
      },
    });
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await executar(() => marcarAtendimento({ erros: {} }, formulario(CAMPOS)));
    expect(r).toHaveProperty("destino");
  });

  it("corrida perdida: a pré-checagem passou, mas o gatilho da 0021 recusou (23P01)", async () => {
    const falso = supabaseFalso({
      atendimentos: [
        { data: [] },
        {
          error: {
            code: "23P01",
            message: 'conflicting key value violates exclusion constraint "atendimentos_sem_choque"',
          },
        },
      ],
    });
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario(CAMPOS));
    expect(r.erros.hora).toMatch(/acabou de ser ocupado/);
    expect(r.erros.hora).not.toMatch(TEXTO_TECNICO);
    expect(r.valores?.data).toBe("2026-09-22");
    expect(navegacao.revalidados).toEqual([]);
  });

  it("paciente removida no meio do caminho (23503) vira frase segura em geral", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: [
        { data: [] },
        { error: { code: "23503", message: 'insert or update on table "atendimentos" violates foreign key' } },
      ],
    }).cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario(CAMPOS));
    expect(r.erros.geral).toMatch(/não existe mais/);
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
  });
});

describe("atualizarAtendimento (edição e remarcação)", () => {
  const EDICAO = { ...CAMPOS, id: ATENDIMENTO };

  // A ação lê a situação atual antes de conferir o choque: é a primeira
  // resposta de `atendimentos` em cada teste abaixo.
  const AGENDADO = { data: { situacao: "agendado" } };

  it("id inválido não toca o banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario({ ...EDICAO, id: "x" }));
    expect(r.erros.geral).toMatch(/não identificado/);
    expect(falso.chamadas).toEqual([]);
  });

  it("o próprio atendimento não conta como choque ao remarcar", async () => {
    const falso = supabaseFalso({
      atendimentos: [
        AGENDADO,
        {
          data: [
            {
              id: ATENDIMENTO,
              inicio: "2026-09-22T17:00:00.000Z",
              duracao_min: 60,
              pacientes: { nome: "Ana Maria", nome_social: null },
            },
          ],
        },
        { data: { id: ATENDIMENTO } },
      ],
    });
    banco.cliente = falso.cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await executar(() =>
      atualizarAtendimento({ erros: {} }, formulario({ ...EDICAO, filtro_profissional: ID })),
    );
    expect(r).toEqual({ destino: `/agenda?dia=2026-09-22&profissional=${ID}` });

    const passos = falso.passosDe("atendimentos", 2);
    expect(passos.find((p) => p.metodo === "update")?.argumentos[0]).toMatchObject({ inicio: INICIO_ISO });
    expect(passos).toContainEqual({ metodo: "eq", argumentos: ["id", ATENDIMENTO] });
    expect(navegacao.revalidados).toContain(`/agenda/${ATENDIMENTO}/editar`);
  });

  it("remarcar para cima de outro atendimento é recusado", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: [
        AGENDADO,
        {
          data: [
            {
              id: OUTRO,
              inicio: "2026-09-22T17:45:00.000Z",
              duracao_min: 30,
              pacientes: { nome: "Bia Lima", nome_social: null },
            },
          ],
        },
      ],
    }).cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.hora).toBe("Choca com o atendimento de Bia Lima às 14:45.");
  });

  it("atendimento que não existe (ou que a RLS esconde) não é gravado nem revalida", async () => {
    const falso = supabaseFalso({ atendimentos: { data: null } });
    banco.cliente = falso.cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.geral).toBe("Atendimento não encontrado.");
    expect(r.valores?.hora).toBe("14:30");
    expect(falso.chamadas).toHaveLength(1); // só a leitura da situação
    expect(navegacao.revalidados).toEqual([]);
  });

  it("UPDATE que não alcança linha (sumiu entre a leitura e a escrita) não revalida", async () => {
    banco.cliente = supabaseFalso({ atendimentos: [AGENDADO, { data: [] }, { data: null }] }).cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.geral).toBe("Atendimento não encontrado.");
    expect(navegacao.revalidados).toEqual([]);
  });

  it("falha ao ler a situação: frase segura, log e nada gravado", async () => {
    const falso = supabaseFalso({
      atendimentos: { error: { code: "57014", message: "canceling statement due to statement timeout" } },
    });
    banco.cliente = falso.cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(/statement|timeout/i);
    expect(falso.chamadas).toHaveLength(1);
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("agenda: ler atendimento", "57014"));
  });

  it("23P01 na remarcação vira erro da hora, sem texto do Postgres", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: [
        AGENDADO,
        { data: [] },
        { error: { code: "23P01", message: "exclusion violation on atendimentos" } },
      ],
    }).cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.hora).toMatch(/acabou de ser ocupado/);
    expect(r.erros.hora).not.toMatch(TEXTO_TECNICO);
  });
});

describe("cancelado e ausente não ocupam a vaga (0021)", () => {
  const EDICAO = { ...CAMPOS, id: ATENDIMENTO, observacoes: "Cancelou por viagem." };

  /** O horário do atendimento cancelado já foi dado a outra paciente. */
  const OCUPANTE = {
    data: [
      {
        id: OUTRO,
        inicio: INICIO_ISO,
        duracao_min: 60,
        pacientes: { nome: "Bia Lima", nome_social: null },
      },
    ],
  };

  it.each(["cancelado", "ausente"])(
    "editar um %s cujo horário foi reocupado salva, como o gatilho aceitaria",
    async (situacao) => {
      const falso = supabaseFalso({
        atendimentos: [{ data: { situacao } }, { data: { id: ATENDIMENTO } }],
      });
      banco.cliente = falso.cliente;
      const { atualizarAtendimento } = await import("./agenda");

      const r = await executar(() => atualizarAtendimento({ erros: {} }, formulario(EDICAO)));
      expect(r).toEqual({ destino: "/agenda?dia=2026-09-22" });

      // Duas idas ao banco: a situação e o UPDATE. A conferência de choque,
      // que devolveria o OCUPANTE, nem é feita.
      expect(falso.chamadas).toHaveLength(2);
      const atualizacao = falso.passosDe("atendimentos", 1).find((p) => p.metodo === "update");
      expect(atualizacao?.argumentos[0]).toMatchObject({ observacoes: "Cancelou por viagem." });
      // O formulário não muda a situação: continua cancelado (ou ausente).
      expect(atualizacao?.argumentos[0]).not.toHaveProperty("situacao");
      expect(navegacao.revalidados).toContain(`/agenda/${ATENDIMENTO}/editar`);
    },
  );

  it("remarcar um atendimento ativo para um horário ocupado continua recusado", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: [
        // Estava às 10:00; a edição o leva para as 14:30, que é da Bia.
        { data: { situacao: "confirmado", inicio: "2026-09-22T13:00:00.000Z", duracao_min: 60, profissional_id: ID } },
        OCUPANTE,
      ],
    }).cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.hora).toBe("Choca com o atendimento de Bia Lima às 14:30.");
    expect(navegacao.revalidados).toEqual([]);
  });

  it("ativo com choque antigo (de antes da 0021) edita a observação sem mudar o horário", async () => {
    // Mesmo início, duração e profissional: o gatilho da 0021 não compara
    // intervalo, e a ação também não pode — senão recusaria o que o banco aceita.
    const falso = supabaseFalso({
      atendimentos: [
        { data: { situacao: "confirmado", inicio: INICIO_ISO, duracao_min: 60, profissional_id: ID } },
        { data: { id: ATENDIMENTO } },
      ],
    });
    banco.cliente = falso.cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await executar(() => atualizarAtendimento({ erros: {} }, formulario(EDICAO)));
    expect(r).toEqual({ destino: "/agenda?dia=2026-09-22" });
    // A leitura e o UPDATE; a conferência de choque nem é feita.
    expect(falso.chamadas).toHaveLength(2);
  });

  it("reabrir o cancelado com o horário reocupado continua recusado", async () => {
    const falso = supabaseFalso({
      atendimentos: {
        error: {
          code: "23P01",
          message: 'conflicting key value violates exclusion constraint "atendimentos_sem_choque"',
        },
      },
    });
    banco.cliente = falso.cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ATENDIMENTO, para: "agendado" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/remarque para um horário livre/);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(falso.passosDe("atendimentos")).toContainEqual({
      metodo: "update",
      argumentos: [{ situacao: "agendado" }],
    });
    expect(navegacao.revalidados).toEqual([]);
  });

  it("corrida: reaberto entre a leitura e o UPDATE, o gatilho recusa e a hora explica", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: [
        { data: { situacao: "cancelado" } },
        { error: { code: "23P01", message: "exclusion violation on atendimentos" } },
      ],
    }).cliente;
    const { atualizarAtendimento } = await import("./agenda");

    const r = await atualizarAtendimento({ erros: {} }, formulario(EDICAO));
    expect(r.erros.hora).toMatch(/acabou de ser ocupado/);
    expect(r.valores?.observacoes).toBe("Cancelou por viagem.");
  });
});

describe("mudarSituacao — reabrir cancelado", () => {
  it("reabrir um cancelado cujo horário foi ocupado explica o que fazer", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: { error: { code: "23P01", message: "exclusion violation" } },
    }).cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ATENDIMENTO, para: "agendado" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/remarque para um horário livre/);
  });
});
