import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

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
  ehAdministradora: async () => sessao.usuario?.papel === "administradora",
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
const PROCEDIMENTO = "e0000000-0000-4000-8000-000000000001";
const ESTADO_INICIAL = { erros: {} };

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

const VALIDO = {
  nome: "Limpeza de pele",
  duracao_min: "60",
  valor_padrao: "150,00",
  retorno_sugerido_dias: "30",
};

/** Nenhuma frase que chega à tela pode trazer texto do Postgres. */
const TEXTO_TECNICO = /violates|constraint|relation|policy|duplicate key|syntax|PGRST|42501|23505/i;

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "administradora" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------

describe("criarProcedimento", () => {
  it("sem sessão não toca o banco", async () => {
    sessao.usuario = null;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarProcedimento } = await import("./procedimentos");

    const r = await criarProcedimento(ESTADO_INICIAL, formulario(VALIDO));
    expect(r.erros.geral).toBe("Sessão expirada. Entre novamente.");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("perfil que não é administradora é barrado antes do banco", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarProcedimento } = await import("./procedimentos");

    const r = await criarProcedimento(ESTADO_INICIAL, formulario(VALIDO));
    expect(r.erros.geral).toMatch(/Só a administradora/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("campo inválido devolve o erro no campo e o que foi digitado", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarProcedimento } = await import("./procedimentos");

    const r = await criarProcedimento(
      ESTADO_INICIAL,
      formulario({ ...VALIDO, duracao_min: "2", valor_padrao: "abc" }),
    );
    expect(r.erros.duracao_min).toBeTruthy();
    expect(r.erros.valor_padrao).toBeTruthy();
    expect(r.valores?.nome).toBe("Limpeza de pele");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("erro do banco vira frase segura, mantém o digitado e não revalida", async () => {
    banco.cliente = supabaseFalso({
      procedimentos: {
        error: { code: "XX000", message: 'relation "procedimentos" violates something' },
      },
    }).cliente;
    const { criarProcedimento } = await import("./procedimentos");

    const r = await criarProcedimento(ESTADO_INICIAL, formulario(VALIDO));
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(r.valores?.nome).toBe("Limpeza de pele");
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("sucesso grava os campos convertidos, revalida o catálogo e redireciona", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarProcedimento } = await import("./procedimentos");

    await expect(criarProcedimento(ESTADO_INICIAL, formulario(VALIDO))).rejects.toEqual(
      new Redirecionou("/configuracoes/procedimentos"),
    );
    const insercao = falso.passosDe("procedimentos").find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toEqual({
      nome: "Limpeza de pele",
      duracao_min: 60,
      valor_padrao: 150,
      retorno_sugerido_dias: 30,
    });
    expect(navegacao.revalidados).toEqual(
      expect.arrayContaining([
        "/configuracoes",
        "/configuracoes/procedimentos",
        "/agenda/novo",
        "/financeiro/vendas/nova",
      ]),
    );
  });
});

describe("atualizarProcedimento", () => {
  it("id inválido é recusado antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { atualizarProcedimento } = await import("./procedimentos");

    const r = await atualizarProcedimento(ESTADO_INICIAL, formulario({ ...VALIDO, id: "abc" }));
    expect(r.erros.geral).toBe("Procedimento não identificado.");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("nenhuma linha alcançada (RLS ou id inexistente) não finge sucesso", async () => {
    banco.cliente = supabaseFalso({ procedimentos: { data: null } }).cliente;
    const { atualizarProcedimento } = await import("./procedimentos");

    const r = await atualizarProcedimento(
      ESTADO_INICIAL,
      formulario({ ...VALIDO, id: PROCEDIMENTO }),
    );
    expect(r.erros.geral).toBe("Procedimento não encontrado.");
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("erro do banco vira frase segura", async () => {
    banco.cliente = supabaseFalso({
      procedimentos: { error: { code: "42501", message: "new row violates row-level security policy" } },
    }).cliente;
    const { atualizarProcedimento } = await import("./procedimentos");

    const r = await atualizarProcedimento(
      ESTADO_INICIAL,
      formulario({ ...VALIDO, id: PROCEDIMENTO }),
    );
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("sucesso confere a linha, revalida a edição e redireciona", async () => {
    const falso = supabaseFalso({ procedimentos: { data: { id: PROCEDIMENTO } } });
    banco.cliente = falso.cliente;
    const { atualizarProcedimento } = await import("./procedimentos");

    await expect(
      atualizarProcedimento(ESTADO_INICIAL, formulario({ ...VALIDO, id: PROCEDIMENTO })),
    ).rejects.toEqual(new Redirecionou("/configuracoes/procedimentos"));
    const metodos = falso.passosDe("procedimentos").map((p) => p.metodo);
    expect(metodos).toEqual(["update", "eq", "select", "maybeSingle"]);
    expect(navegacao.revalidados).toContain(`/configuracoes/procedimentos/${PROCEDIMENTO}/editar`);
  });
});

describe("alternarAtivoProcedimento", () => {
  it("perfil que não é administradora recebe falha, sem banco", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { alternarAtivoProcedimento } = await import("./procedimentos");

    const r = await alternarAtivoProcedimento(
      ACAO_INICIAL,
      formulario({ id: PROCEDIMENTO, ativar: "nao" }),
    );
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("id inválido é recusado", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { alternarAtivoProcedimento } = await import("./procedimentos");

    const r = await alternarAtivoProcedimento(ACAO_INICIAL, formulario({ id: "", ativar: "sim" }));
    expect(r).toEqual({ ok: false, mensagem: "Procedimento não identificado." });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("linha não alcançada vira falha, sem revalidar", async () => {
    banco.cliente = supabaseFalso({ procedimentos: { data: null } }).cliente;
    const { alternarAtivoProcedimento } = await import("./procedimentos");

    const r = await alternarAtivoProcedimento(
      ACAO_INICIAL,
      formulario({ id: PROCEDIMENTO, ativar: "sim" }),
    );
    expect(r).toEqual({ ok: false, mensagem: "Procedimento não encontrado." });
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("erro do banco vira frase segura", async () => {
    banco.cliente = supabaseFalso({
      procedimentos: { error: { code: "XX000", message: 'relation "procedimentos" is broken' } },
    }).cliente;
    const { alternarAtivoProcedimento } = await import("./procedimentos");

    const r = await alternarAtivoProcedimento(
      ACAO_INICIAL,
      formulario({ id: PROCEDIMENTO, ativar: "sim" }),
    );
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
  });

  it("desativar grava ativo=false e avisa que saiu da agenda", async () => {
    const falso = supabaseFalso({ procedimentos: { data: { id: PROCEDIMENTO } } });
    banco.cliente = falso.cliente;
    const { alternarAtivoProcedimento } = await import("./procedimentos");

    const r = await alternarAtivoProcedimento(
      ACAO_INICIAL,
      formulario({ id: PROCEDIMENTO, ativar: "nao" }),
    );
    expect(r).toEqual({ ok: true, mensagem: "Procedimento fora da agenda." });
    const atualizacao = falso.passosDe("procedimentos").find((p) => p.metodo === "update");
    expect(atualizacao?.argumentos[0]).toEqual({ ativo: false });
    expect(navegacao.revalidados).toContain("/agenda/novo");
  });

  it("reativar grava ativo=true", async () => {
    const falso = supabaseFalso({ procedimentos: { data: { id: PROCEDIMENTO } } });
    banco.cliente = falso.cliente;
    const { alternarAtivoProcedimento } = await import("./procedimentos");

    const r = await alternarAtivoProcedimento(
      ACAO_INICIAL,
      formulario({ id: PROCEDIMENTO, ativar: "sim" }),
    );
    expect(r).toEqual({ ok: true, mensagem: "Procedimento de volta à agenda." });
    const atualizacao = falso.passosDe("procedimentos").find((p) => p.metodo === "update");
    expect(atualizacao?.argumentos[0]).toEqual({ ativo: true });
  });
});
