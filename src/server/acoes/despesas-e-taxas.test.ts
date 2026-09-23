import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { MENSAGEM_PERMISSAO } from "@/lib/erros-banco";
import { Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

/**
 * Invariantes das ações de despesas e da tabela de taxas que ainda não
 * tinham teste — `atualizarDespesa` e `atualizarTaxa` — e os caminhos de
 * `criarDespesa`, `mudarSituacaoDespesa` e `alternarAtivaTaxa` que
 * `acoes.test.ts` e `acoes-financeiro.test.ts` não cobrem: quem pode, o que
 * é recusado antes do banco, qual linha é alcançada, o que acontece quando
 * a RLS esconde a linha e a frase que chega à tela.
 */

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string; papel: "administradora" | "financeiro" | "recepcao" },
}));
const banco = vi.hoisted(() => ({ cliente: null as unknown }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, email: "x@clinica.local", nome: "Pessoa de Teste" },
  ehFinanceira: async () => sessao.usuario?.papel === "administradora" || sessao.usuario?.papel === "financeiro",
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
const DESPESA = "f0000000-0000-4000-8000-000000000001";
const TAXA = "e0000000-0000-4000-8000-000000000001";

/** Nenhuma frase que chega à tela pode trazer texto do Postgres. */
const TEXTO_TECNICO = /violates|constraint|relation|policy|duplicate key|permission denied|syntax|PGRST|42501|23505/i;

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

/** A ação terminou em `redirect()`: devolve o destino. */
async function destinoDe(promessa: Promise<unknown>): Promise<string> {
  try {
    await promessa;
  } catch (e) {
    if (e instanceof Redirecionou) return e.destino;
    throw e;
  }
  throw new Error("a ação devia ter redirecionado");
}

/** O que foi pedido ao banco numa chamada a uma tabela, por método. */
function argumentos(falso: ReturnType<typeof supabaseFalso>, alvo: string, metodo: string, indice = 0) {
  return falso.passosDe(alvo, indice).filter((p) => p.metodo === metodo).map((p) => p.argumentos);
}

const DESPESA_VALIDA = {
  descricao: "Aluguel da sala",
  categoria: "estrutura",
  valor: "2.345,67",
  vencimento: "2026-10-05",
  observacoes: "",
};

const TAXA_VALIDA = { operadora: "Stone", tipo: "credito", parcelas: "3", percentual: "6,5" };

let registrosDeErro: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "financeiro" };
  navegacao.revalidados = [];
  registrosDeErro = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------
// Despesas
// ---------------------------------------------------------------------

describe("criarDespesa", () => {
  it("sem sessão e recepção não tocam o banco", async () => {
    const { criarDespesa } = await import("./despesas");

    for (const usuario of [null, { id: ID, papel: "recepcao" as const }]) {
      sessao.usuario = usuario;
      const falso = supabaseFalso();
      banco.cliente = falso.cliente;
      const r = await criarDespesa({ erros: {} }, formulario(DESPESA_VALIDA));
      expect(r.erros.geral).toMatch(usuario ? /financeiro e da administradora/ : /Sessão expirada/);
      expect(falso.chamadas).toHaveLength(0);
    }
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("campo inválido volta com o erro no campo e o que foi digitado, sem ir ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarDespesa } = await import("./despesas");

    const r = await criarDespesa(
      { erros: {} },
      formulario({ ...DESPESA_VALIDA, categoria: "inventada", vencimento: "2026-02-30" }),
    );
    expect(r.erros.categoria).toBeTruthy();
    expect(r.erros.vencimento).toBeTruthy();
    expect(r.valores).toMatchObject({ descricao: "Aluguel da sala", categoria: "inventada" });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("recusa da RLS vira a frase de permissão, sem texto do Postgres e sem revalidar", async () => {
    banco.cliente = supabaseFalso({
      despesas: { error: { code: "42501", message: 'permission denied for table "despesas"' } },
    }).cliente;
    const { criarDespesa } = await import("./despesas");

    const r = await criarDespesa({ erros: {} }, formulario(DESPESA_VALIDA));
    expect(r.erros.geral).toBe(MENSAGEM_PERMISSAO);
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(r.valores).toMatchObject({ descricao: "Aluguel da sala" });
    expect(registrosDeErro).toHaveBeenCalled();
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("no sucesso revalida o financeiro e o painel, e redireciona por último", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { criarDespesa } = await import("./despesas");

    expect(await destinoDe(criarDespesa({ erros: {} }, formulario(DESPESA_VALIDA)))).toBe("/financeiro/despesas");
    expect(navegacao.revalidados).toEqual(
      expect.arrayContaining(["/financeiro", "/financeiro/despesas", "/financeiro/fluxo", "/"]),
    );
  });
});

describe("atualizarDespesa", () => {
  it("sem sessão e recepção não tocam o banco", async () => {
    const { atualizarDespesa } = await import("./despesas");

    for (const usuario of [null, { id: ID, papel: "recepcao" as const }]) {
      sessao.usuario = usuario;
      const falso = supabaseFalso();
      banco.cliente = falso.cliente;
      const r = await atualizarDespesa({ erros: {} }, formulario({ id: DESPESA, ...DESPESA_VALIDA }));
      expect(r.erros.geral).toBeTruthy();
      expect(falso.chamadas).toHaveLength(0);
    }
  });

  it("id que não é uuid é recusado antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { atualizarDespesa } = await import("./despesas");

    const r = await atualizarDespesa({ erros: {} }, formulario({ id: "1 or 1=1", ...DESPESA_VALIDA }));
    expect(r.erros.geral).toBe("Despesa não identificada.");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("valor inválido volta no campo, com o formulário preenchido, sem ir ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { atualizarDespesa } = await import("./despesas");

    const r = await atualizarDespesa({ erros: {} }, formulario({ id: DESPESA, ...DESPESA_VALIDA, valor: "abc" }));
    expect(r.erros.valor).toBeTruthy();
    expect(r.valores).toMatchObject({ id: DESPESA, valor: "abc" });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("alcança só a linha do id, recalcula a competência e não troca quem criou", async () => {
    const falso = supabaseFalso({ despesas: { data: { id: DESPESA } } });
    banco.cliente = falso.cliente;
    const { atualizarDespesa } = await import("./despesas");

    expect(
      await destinoDe(atualizarDespesa({ erros: {} }, formulario({ id: DESPESA, ...DESPESA_VALIDA }))),
    ).toBe("/financeiro/despesas");

    const mudanca = argumentos(falso, "despesas", "update")[0][0] as Record<string, unknown>;
    expect(mudanca).toMatchObject({
      descricao: "Aluguel da sala",
      valor: 2345.67,
      vencimento: "2026-10-05",
      competencia: "2026-10-01",
    });
    expect(mudanca).not.toHaveProperty("criado_por");
    expect(mudanca).not.toHaveProperty("situacao");
    expect(argumentos(falso, "despesas", "eq")).toEqual([["id", DESPESA]]);
    expect(navegacao.revalidados).toContain("/financeiro/despesas");
  });

  it("linha escondida pela RLS ou inexistente avisa e não revalida", async () => {
    banco.cliente = supabaseFalso({ despesas: { data: null } }).cliente;
    const { atualizarDespesa } = await import("./despesas");

    const r = await atualizarDespesa({ erros: {} }, formulario({ id: DESPESA, ...DESPESA_VALIDA }));
    expect(r.erros.geral).toBe("Despesa não encontrada.");
    expect(r.valores).toMatchObject({ descricao: "Aluguel da sala" });
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("erro do banco vira frase segura, fica registrado e nada é revalidado", async () => {
    banco.cliente = supabaseFalso({
      despesas: { error: { code: "23514", message: 'new row violates check constraint "despesa_coerente"' } },
    }).cliente;
    const { atualizarDespesa } = await import("./despesas");

    const r = await atualizarDespesa({ erros: {} }, formulario({ id: DESPESA, ...DESPESA_VALIDA }));
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(registrosDeErro).toHaveBeenCalled();
    expect(navegacao.revalidados).toHaveLength(0);
  });
});

describe("mudarSituacaoDespesa", () => {
  it("ação desconhecida e id inválido são recusados antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacaoDespesa } = await import("./despesas");

    expect(await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: DESPESA, acao: "apagar" }))).toEqual({
      ok: false,
      mensagem: "Ação desconhecida.",
    });
    expect((await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: "x", acao: "cancelar" }))).ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("forma de pagamento fora da lista vira nula em vez de ir crua ao banco", async () => {
    const falso = supabaseFalso({ despesas: { data: { id: DESPESA } } });
    banco.cliente = falso.cliente;
    const { mudarSituacaoDespesa } = await import("./despesas");

    const r = await mudarSituacaoDespesa(
      ACAO_INICIAL,
      formulario({ id: DESPESA, acao: "pagar", pago_em: "2026-09-01", forma: "cheque-voador" }),
    );
    expect(r).toEqual({ ok: true, mensagem: "Despesa paga." });
    expect(argumentos(falso, "despesas", "update")[0][0]).toEqual({
      situacao: "paga",
      pago_em: "2026-09-01",
      forma: null,
    });
    expect(argumentos(falso, "despesas", "eq")).toContainEqual(["id", DESPESA]);
  });

  it("quando outra pessoa mudou antes, avisa e não revalida", async () => {
    banco.cliente = supabaseFalso({ despesas: { data: null } }).cliente;
    const { mudarSituacaoDespesa } = await import("./despesas");

    const r = await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: DESPESA, acao: "cancelar" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/já tinha mudado/) });
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("erro do banco vira frase segura e nada é revalidado", async () => {
    banco.cliente = supabaseFalso({
      despesas: { error: { code: "XX000", message: 'relation "despesas" is broken' } },
    }).cliente;
    const { mudarSituacaoDespesa } = await import("./despesas");

    const r = await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: DESPESA, acao: "reabrir" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// Tabela de taxas
// ---------------------------------------------------------------------

describe("criarTaxa", () => {
  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "administradora" };
  });

  it("tipo fora do enum e parcelas fora de 1 a 24 são recusados antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarTaxa } = await import("./taxas-cartao");

    const r = await criarTaxa({ erros: {} }, formulario({ ...TAXA_VALIDA, tipo: "voucher", parcelas: "25" }));
    expect(r.erros.tipo).toBeTruthy();
    expect(r.erros.parcelas).toBeTruthy();
    expect(r.valores).toMatchObject({ operadora: "Stone" });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("combinação repetida vira a frase da casa e não polui o registro de falhas", async () => {
    banco.cliente = supabaseFalso({
      taxas_cartao: { error: { code: "23505", message: "duplicate key value violates unique constraint" } },
    }).cliente;
    const { criarTaxa } = await import("./taxas-cartao");

    const r = await criarTaxa({ erros: {} }, formulario(TAXA_VALIDA));
    expect(r.erros.geral).toMatch(/Já existe uma taxa ativa/);
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(registrosDeErro).not.toHaveBeenCalled();
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("no sucesso revalida a tabela e a venda nova, e redireciona", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { criarTaxa } = await import("./taxas-cartao");

    expect(await destinoDe(criarTaxa({ erros: {} }, formulario(TAXA_VALIDA)))).toBe("/financeiro/taxas");
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/financeiro/taxas", "/financeiro/vendas/nova"]));
  });
});

describe("atualizarTaxa", () => {
  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "administradora" };
  });

  it("financeiro, recepção e sessão expirada não tocam o banco", async () => {
    const { atualizarTaxa } = await import("./taxas-cartao");

    for (const usuario of [null, { id: ID, papel: "financeiro" as const }, { id: ID, papel: "recepcao" as const }]) {
      sessao.usuario = usuario;
      const falso = supabaseFalso();
      banco.cliente = falso.cliente;
      const r = await atualizarTaxa({ erros: {} }, formulario({ id: TAXA, ...TAXA_VALIDA }));
      expect(r.erros.geral).toMatch(usuario ? /administradora/ : /Sessão expirada/);
      expect(falso.chamadas).toHaveLength(0);
    }
  });

  it("id inválido e percentual vazio são recusados antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { atualizarTaxa } = await import("./taxas-cartao");

    expect((await atualizarTaxa({ erros: {} }, formulario({ id: "abc", ...TAXA_VALIDA }))).erros.geral).toBe(
      "Taxa não identificada.",
    );
    const r = await atualizarTaxa({ erros: {} }, formulario({ id: TAXA, ...TAXA_VALIDA, percentual: "" }));
    expect(r.erros.percentual).toMatch(/Informe o percentual/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("alcança só a linha do id, com débito sempre em 1 parcela e o percentual exato", async () => {
    const falso = supabaseFalso({ taxas_cartao: { data: { id: TAXA } } });
    banco.cliente = falso.cliente;
    const { atualizarTaxa } = await import("./taxas-cartao");

    expect(
      await destinoDe(
        atualizarTaxa(
          { erros: {} },
          formulario({ id: TAXA, operadora: "Cielo", tipo: "debito", parcelas: "12", percentual: "1,49" }),
        ),
      ),
    ).toBe("/financeiro/taxas");
    expect(argumentos(falso, "taxas_cartao", "update")[0][0]).toEqual({
      operadora: "Cielo",
      tipo: "debito",
      parcelas: 1,
      percentual: 1.49,
    });
    expect(argumentos(falso, "taxas_cartao", "eq")).toEqual([["id", TAXA]]);
    expect(navegacao.revalidados).toContain("/financeiro/taxas");
  });

  it("linha escondida pela RLS ou inexistente avisa e não revalida", async () => {
    banco.cliente = supabaseFalso({ taxas_cartao: { data: null } }).cliente;
    const { atualizarTaxa } = await import("./taxas-cartao");

    const r = await atualizarTaxa({ erros: {} }, formulario({ id: TAXA, ...TAXA_VALIDA }));
    expect(r.erros.geral).toBe("Taxa não encontrada.");
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("combinação repetida vira a frase da casa, com o formulário preenchido", async () => {
    banco.cliente = supabaseFalso({
      taxas_cartao: { error: { code: "23505", message: "duplicate key value violates unique constraint" } },
    }).cliente;
    const { atualizarTaxa } = await import("./taxas-cartao");

    const r = await atualizarTaxa({ erros: {} }, formulario({ id: TAXA, ...TAXA_VALIDA }));
    expect(r.erros.geral).toMatch(/Já existe uma taxa ativa/);
    expect(r.valores).toMatchObject({ operadora: "Stone", percentual: "6,5" });
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("outro erro do banco vira frase segura e fica registrado", async () => {
    banco.cliente = supabaseFalso({
      taxas_cartao: { error: { code: "42501", message: 'new row violates row-level security policy for table "taxas_cartao"' } },
    }).cliente;
    const { atualizarTaxa } = await import("./taxas-cartao");

    const r = await atualizarTaxa({ erros: {} }, formulario({ id: TAXA, ...TAXA_VALIDA }));
    expect(r.erros.geral).toBe(MENSAGEM_PERMISSAO);
    expect(registrosDeErro).toHaveBeenCalled();
  });
});

describe("alternarAtivaTaxa", () => {
  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "administradora" };
  });

  it("financeiro não ativa nem desativa", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { alternarAtivaTaxa } = await import("./taxas-cartao");

    const r = await alternarAtivaTaxa(ACAO_INICIAL, formulario({ id: TAXA, ativar: "nao" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/administradora/) });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("desativa só a linha do id e revalida", async () => {
    const falso = supabaseFalso({ taxas_cartao: { data: { id: TAXA } } });
    banco.cliente = falso.cliente;
    const { alternarAtivaTaxa } = await import("./taxas-cartao");

    const r = await alternarAtivaTaxa(ACAO_INICIAL, formulario({ id: TAXA, ativar: "nao" }));
    expect(r).toEqual({ ok: true, mensagem: "Taxa desativada." });
    expect(argumentos(falso, "taxas_cartao", "update")[0][0]).toEqual({ ativa: false });
    expect(argumentos(falso, "taxas_cartao", "eq")).toEqual([["id", TAXA]]);
    expect(navegacao.revalidados).toContain("/financeiro/taxas");
  });

  it("linha que não voltou avisa e não revalida", async () => {
    banco.cliente = supabaseFalso({ taxas_cartao: { data: null } }).cliente;
    const { alternarAtivaTaxa } = await import("./taxas-cartao");

    const r = await alternarAtivaTaxa(ACAO_INICIAL, formulario({ id: TAXA, ativar: "sim" }));
    expect(r).toEqual({ ok: false, mensagem: "Taxa não encontrada." });
    expect(navegacao.revalidados).toHaveLength(0);
  });
});
