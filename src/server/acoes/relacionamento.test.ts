import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { REGISTRO_CONTATO } from "@/lib/relacionamento";
import { Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

// ---------------------------------------------------------------------
// Dublês: sessão, cliente do banco e as funções de navegação do Next
// ---------------------------------------------------------------------

const sessao = vi.hoisted(() => ({ usuario: null as null | { id: string } }));
const banco = vi.hoisted(() => ({ cliente: null as unknown }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, papel: "recepcao", email: "x@clinica.local", nome: "Pessoa de Teste" },
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

const USUARIA = "a0000000-0000-4000-8000-000000000001";
const ID = "c0000000-0000-4000-8000-000000000001";
const PACIENTE = "b0000000-0000-4000-8000-000000000001";

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

/** Nenhuma frase que chega à tela pode trazer texto do Postgres. */
const TEXTO_TECNICO = /violates|constraint|relation|policy|duplicate key|syntax|PGRST|42501|23505/i;
const ERRO_CRU = { code: "XX000", message: 'relation "pendencias" is broken' };

function metodos(passos: { metodo: string; argumentos: unknown[] }[]) {
  return passos.map((p) => p.metodo);
}

function argumentosDe(passos: { metodo: string; argumentos: unknown[] }[], metodo: string) {
  return passos.filter((p) => p.metodo === metodo).map((p) => p.argumentos);
}

beforeEach(() => {
  sessao.usuario = { id: USUARIA };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------

describe("mudarSituacaoTarefa", () => {
  it("sem sessão não toca o banco", async () => {
    sessao.usuario = null;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacaoTarefa } = await import("./relacionamento");

    const r = await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: ID, para: "resolvida" }));
    expect(r).toEqual({ ok: false, mensagem: "Sessão expirada. Entre novamente." });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("id ou situação inválidos são recusados antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacaoTarefa } = await import("./relacionamento");

    expect((await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: "x", para: "resolvida" }))).ok).toBe(false);
    expect((await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: ID, para: "apagada" }))).ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("erro do banco vira frase segura, é registrado e nada é revalidado", async () => {
    banco.cliente = supabaseFalso({ pendencias: { error: ERRO_CRU } }).cliente;
    const { mudarSituacaoTarefa } = await import("./relacionamento");

    const r = await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: ID, para: "resolvida" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(console.error).toHaveBeenCalled();
    expect(navegacao.revalidados).toEqual([]);
  });

  it("nenhuma linha alcançada não finge sucesso", async () => {
    banco.cliente = supabaseFalso({ pendencias: { data: null } }).cliente;
    const { mudarSituacaoTarefa } = await import("./relacionamento");

    const r = await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: ID, para: "cancelada" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/já tinha mudado/) });
    expect(navegacao.revalidados).toEqual([]);
  });

  it("concluir só alcança tarefa aberta e grava a hora; revalida no sucesso", async () => {
    const falso = supabaseFalso({ pendencias: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    const { mudarSituacaoTarefa } = await import("./relacionamento");

    const r = await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: ID, para: "resolvida" }));
    expect(r).toEqual({ ok: true, mensagem: "Tarefa atualizada." });

    const passos = falso.passosDe("pendencias");
    const [alteracao] = argumentosDe(passos, "update")[0] as [{ situacao: string; resolvida_em: string | null }];
    expect(alteracao.situacao).toBe("resolvida");
    expect(alteracao.resolvida_em).not.toBeNull();
    expect(argumentosDe(passos, "in")).toContainEqual(["situacao", ["aberta"]]);
    // Registro de contato não é tarefa: a ação não o alcança (0025).
    expect(argumentosDe(passos, "eq")).toContainEqual(["origem", "tarefa"]);
    expect(metodos(passos)).toEqual(expect.arrayContaining(["select", "maybeSingle"]));
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/relacionamento", "/"]));
  });

  it("reabrir limpa a hora e só alcança tarefa concluída ou cancelada", async () => {
    const falso = supabaseFalso({ pendencias: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    const { mudarSituacaoTarefa } = await import("./relacionamento");

    await mudarSituacaoTarefa(ACAO_INICIAL, formulario({ id: ID, para: "aberta" }));
    const passos = falso.passosDe("pendencias");
    const [alteracao] = argumentosDe(passos, "update")[0] as [{ resolvida_em: string | null }];
    expect(alteracao.resolvida_em).toBeNull();
    expect(argumentosDe(passos, "in")).toContainEqual(["situacao", ["resolvida", "cancelada"]]);
  });
});

describe("mudarSituacaoRetorno", () => {
  it("situação fora do enum é recusada antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacaoRetorno } = await import("./relacionamento");

    const r = await mudarSituacaoRetorno(ACAO_INICIAL, formulario({ id: ID, para: "concluido" }));
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("erro do banco vira frase segura", async () => {
    banco.cliente = supabaseFalso({ retornos: { error: { code: "42501", message: "permission denied for table retornos" } } }).cliente;
    const { mudarSituacaoRetorno } = await import("./relacionamento");

    const r = await mudarSituacaoRetorno(ACAO_INICIAL, formulario({ id: ID, para: "agendado" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("não regrava a mesma situação e não finge sucesso sem linha", async () => {
    const falso = supabaseFalso({ retornos: { data: null } });
    banco.cliente = falso.cliente;
    const { mudarSituacaoRetorno } = await import("./relacionamento");

    const r = await mudarSituacaoRetorno(ACAO_INICIAL, formulario({ id: ID, para: "em_contato" }));
    expect(r.ok).toBe(false);
    expect(argumentosDe(falso.passosDe("retornos"), "neq")).toContainEqual(["situacao", "em_contato"]);
  });

  it("sucesso devolve frase e revalida", async () => {
    banco.cliente = supabaseFalso({ retornos: { data: { id: ID } } }).cliente;
    const { mudarSituacaoRetorno } = await import("./relacionamento");

    const r = await mudarSituacaoRetorno(ACAO_INICIAL, formulario({ id: ID, para: "recusado" }));
    expect(r).toEqual({ ok: true, mensagem: "Retorno atualizado." });
    expect(navegacao.revalidados).toContain("/");
  });
});

describe("confirmarPelaLista", () => {
  it("só aceita confirmar ou aguardar resposta", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { confirmarPelaLista } = await import("./relacionamento");

    const r = await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "cancelado" }));
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("aguardar resposta só sai de agendado; confirmar sai dos dois", async () => {
    const falso = supabaseFalso({ atendimentos: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    const { confirmarPelaLista } = await import("./relacionamento");

    await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "aguardando_confirmacao" }));
    await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(argumentosDe(falso.passosDe("atendimentos", 0), "in")).toContainEqual(["situacao", ["agendado"]]);
    expect(argumentosDe(falso.passosDe("atendimentos", 1), "in")).toContainEqual([
      "situacao",
      ["agendado", "aguardando_confirmacao"],
    ]);
  });

  it("atendimento que já mudou não finge confirmação", async () => {
    banco.cliente = supabaseFalso({ atendimentos: { data: null } }).cliente;
    const { confirmarPelaLista } = await import("./relacionamento");

    const r = await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/agenda/) });
    expect(navegacao.revalidados).toEqual([]);
  });

  it("clique repetido em \"Aguardando resposta\" não diz que o atendimento deixou de esperar", async () => {
    // O UPDATE não acha linha (já está aguardando); a releitura mostra que a
    // situação já é a pedida, e a resposta é a mesma do primeiro clique.
    const falso = supabaseFalso({
      atendimentos: [{ data: null }, { data: { situacao: "aguardando_confirmacao" } }],
    });
    banco.cliente = falso.cliente;
    const { confirmarPelaLista } = await import("./relacionamento");

    const r = await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "aguardando_confirmacao" }));
    expect(r).toEqual({ ok: true, mensagem: "Aguardando resposta da paciente." });
    expect(falso.passosDe("atendimentos", 1).map((p) => p.metodo)).not.toContain("update");
  });

  it("releitura que falha vira frase segura, não sucesso", async () => {
    banco.cliente = supabaseFalso({ atendimentos: [{ data: null }, { error: ERRO_CRU }] }).cliente;
    const { confirmarPelaLista } = await import("./relacionamento");

    const r = await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("erro do banco vira frase segura e sucesso confirma", async () => {
    banco.cliente = supabaseFalso({ atendimentos: { error: ERRO_CRU } }).cliente;
    const { confirmarPelaLista } = await import("./relacionamento");
    const r = await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);

    banco.cliente = supabaseFalso({ atendimentos: { data: { id: ID } } }).cliente;
    const ok = await confirmarPelaLista(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(ok).toEqual({ ok: true, mensagem: "Atendimento confirmado." });
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/relacionamento", "/agenda", "/"]));
  });
});

describe("registrarContato", () => {
  it("tipo desconhecido é recusado antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "sms" }));
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("paciente arquivada ou inexistente não recebe registro", async () => {
    const falso = supabaseFalso({ pacientes: { data: null } });
    banco.cliente = falso.cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "avaliacao" }));
    expect(r).toEqual({ ok: false, mensagem: "Paciente não encontrada ou arquivada." });
    expect(falso.chamadas.map((c) => c.alvo)).toEqual(["pacientes"]);
  });

  it("erro ao conferir a paciente não vira 'paciente não encontrada'", async () => {
    banco.cliente = supabaseFalso({ pacientes: { error: ERRO_CRU } }).cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "avaliacao" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(/não encontrada/);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
  });

  it("contato já registrado hoje não grava de novo", async () => {
    const falso = supabaseFalso({ pacientes: { data: { id: PACIENTE } }, pendencias: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "aniversario" }));
    expect(r).toEqual({ ok: true, mensagem: "Este contato já foi registrado hoje." });
    const consultas = falso.chamadas.filter((c) => c.alvo === "pendencias");
    expect(consultas).toHaveLength(1);
    expect(argumentosDe(consultas[0].passos, "eq")).toEqual(
      expect.arrayContaining([
        ["paciente_id", PACIENTE],
        ["origem", REGISTRO_CONTATO.aniversario.origem],
      ]),
    );
    // A deduplicação é pela origem, não pelo texto.
    expect(argumentosDe(consultas[0].passos, "eq").map(([coluna]) => coluna)).not.toContain("descricao");
    expect(navegacao.revalidados).toEqual([]);
  });

  it("grava a pendência concluída com o texto e o tipo de sempre", async () => {
    const falso = supabaseFalso({
      pacientes: { data: { id: PACIENTE } },
      pendencias: [{ data: null }, { data: { id: ID } }],
    });
    banco.cliente = falso.cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "avaliacao" }));
    expect(r).toEqual({ ok: true, mensagem: "Contato registrado." });
    const [linha] = argumentosDe(falso.passosDe("pendencias", 1), "insert")[0] as [Record<string, unknown>];
    expect(linha).toMatchObject({
      paciente_id: PACIENTE,
      origem: "contato_avaliacao",
      tipo: "pesquisa",
      descricao: "Convite para avaliação no Google enviado pela equipe",
      situacao: "resolvida",
      responsavel_id: USUARIA,
    });
    expect(navegacao.revalidados).toContain("/relacionamento");
  });

  it("o mesmo contato gravado por outra aba (índice único, 23505) não vira erro", async () => {
    banco.cliente = supabaseFalso({
      pacientes: { data: { id: PACIENTE } },
      pendencias: [{ data: null }, { error: { code: "23505", message: "duplicate key value violates unique constraint \"pendencias_contato_um_por_dia\"" } }],
    }).cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "avaliacao" }));
    expect(r).toEqual({ ok: true, mensagem: "Este contato já foi registrado hoje." });
    expect(console.error).not.toHaveBeenCalled();
    expect(navegacao.revalidados).toEqual([]);
  });

  it("erro na gravação vira frase segura", async () => {
    banco.cliente = supabaseFalso({
      pacientes: { data: { id: PACIENTE } },
      pendencias: [{ data: null }, { error: ERRO_CRU }],
    }).cliente;
    const { registrarContato } = await import("./relacionamento");

    const r = await registrarContato(ACAO_INICIAL, formulario({ paciente_id: PACIENTE, tipo: "avaliacao" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toEqual([]);
  });
});

describe("criarTarefa e criarRetorno", () => {
  it("dados inválidos voltam com erros por campo e os valores digitados", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarTarefa } = await import("./relacionamento");

    const r = await criarTarefa({ erros: {} }, formulario({ tipo: "x", prioridade: "alta", descricao: "ok" }));
    expect(r.erros.tipo).toBeTruthy();
    expect(r.erros.descricao).toBeTruthy();
    expect(r.valores?.descricao).toBe("ok");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("erro do banco ao criar tarefa vira frase segura e registrada", async () => {
    banco.cliente = supabaseFalso({ pendencias: { error: ERRO_CRU } }).cliente;
    const { criarTarefa } = await import("./relacionamento");

    const r = await criarTarefa(
      { erros: {} },
      formulario({ tipo: "outro", prioridade: "media", descricao: "Ligar para a paciente" }),
    );
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(console.error).toHaveBeenCalled();
  });

  it("tarefa válida grava com a responsável da sessão e redireciona", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarTarefa } = await import("./relacionamento");

    await expect(
      criarTarefa({ erros: {} }, formulario({ tipo: "outro", prioridade: "media", descricao: "Ligar para a paciente" })),
    ).rejects.toThrow(Redirecionou);
    const [linha] = argumentosDe(falso.passosDe("pendencias"), "insert")[0] as [Record<string, unknown>];
    expect(linha).toMatchObject({ responsavel_id: USUARIA, paciente_id: null });
    expect(navegacao.revalidados).toContain("/relacionamento");
  });

  it("retorno para paciente arquivada é recusado no campo da paciente", async () => {
    banco.cliente = supabaseFalso({ pacientes: { data: null } }).cliente;
    const { criarRetorno } = await import("./relacionamento");

    const r = await criarRetorno({ erros: {} }, formulario({ paciente_id: PACIENTE, sugerido_para: "2026-10-01" }));
    expect(r.erros.paciente_id).toBe("Paciente não encontrada ou arquivada.");
  });
});
