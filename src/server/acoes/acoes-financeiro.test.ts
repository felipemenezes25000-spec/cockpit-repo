import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

/**
 * Invariantes das ações do Financeiro (AGENTS.md §8.4). O banco repete boa
 * parte destas regras (0019, 0020) e `supabase/testes/permissoes.sql` as
 * confere lá; aqui a pergunta é o que a ação manda para o banco — e o que
 * ela se recusa a mandar.
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
const VENDA = "d0000000-0000-4000-8000-000000000001";
const TAXA = "e0000000-0000-4000-8000-000000000001";

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

/** Os argumentos da chamada `rpc` a uma função do banco. */
function argumentosDaRpc(falso: ReturnType<typeof supabaseFalso>, funcao: string) {
  return falso.passosDe(`rpc:${funcao}`).find((p) => p.metodo === "rpc")?.argumentos[0] as
    | Record<string, unknown>
    | undefined;
}

/** O que foi pedido ao banco numa chamada a uma tabela, por método. */
function argumentos(falso: ReturnType<typeof supabaseFalso>, alvo: string, metodo: string, indice = 0) {
  return falso.passosDe(alvo, indice).filter((p) => p.metodo === metodo).map((p) => p.argumentos);
}

const VENDA_BASE = {
  paciente_id: ID,
  procedimento_id: ID,
  data_venda: "2026-09-01",
  valor_original: "1.000,00",
  situacao_inicial: "previsto",
  vencimento: "2026-10-01",
};

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "recepcao" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------
// Registrar venda
// ---------------------------------------------------------------------

describe("registrarVenda", () => {
  it("cria só pela função do banco — nunca INSERT direto em vendas ou recebimentos", async () => {
    const falso = supabaseFalso({
      procedimentos: { data: { nome: "Toxina" } },
      "rpc:venda_registrar": { data: VENDA },
    });
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    const destino = await destinoDe(registrarVenda({ erros: {} }, formulario({ ...VENDA_BASE, forma: "pix" })));

    expect(destino).toBe(`/financeiro/vendas/${VENDA}`);
    expect(falso.chamadas.some((c) => c.alvo === "vendas" || c.alvo === "recebimentos")).toBe(false);
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/financeiro", "/"]));
  });

  it("repassa a chave do envio: o duplo envio do mesmo formulário devolve a mesma venda (0028)", async () => {
    const CHAVE = "f0000000-0000-4000-8000-00000000000a";
    const falso = supabaseFalso({
      procedimentos: { data: { nome: "Toxina" } },
      "rpc:venda_registrar": { data: VENDA },
    });
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    // Dois envios do mesmo formulário: a mesma chave vai nos dois, e o
    // banco (que devolve a venda já criada) leva os dois para ela.
    const envio = formulario({ ...VENDA_BASE, forma: "pix", chave_envio: CHAVE });
    const primeiro = await destinoDe(registrarVenda({ erros: {} }, envio));
    const segundo = await destinoDe(registrarVenda({ erros: {} }, envio));

    expect(primeiro).toBe(`/financeiro/vendas/${VENDA}`);
    expect(segundo).toBe(primeiro);
    const chaves = [0, 1].map(
      (indice) =>
        (falso.passosDe("rpc:venda_registrar", indice).find((p) => p.metodo === "rpc")?.argumentos[0] as
          | Record<string, unknown>
          | undefined)?.p_chave,
    );
    expect(chaves).toEqual([CHAVE, CHAVE]);
  });

  it("sem chave válida, a venda segue sem ela — o parâmetro nem vai ao banco", async () => {
    const falso = supabaseFalso({
      procedimentos: { data: { nome: "Toxina" } },
      "rpc:venda_registrar": { data: VENDA },
    });
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    await destinoDe(
      registrarVenda({ erros: {} }, formulario({ ...VENDA_BASE, forma: "pix", chave_envio: "não-é-uuid" })),
    );

    const argumentosDaVenda = argumentosDaRpc(falso, "venda_registrar");
    expect(argumentosDaVenda?.p_chave).toBeUndefined();
    expect(JSON.parse(JSON.stringify(argumentosDaVenda))).not.toHaveProperty("p_chave");
  });

  it("forma sem cartão não tem taxa, mesmo que o formulário mande uma", async () => {
    const falso = supabaseFalso({
      procedimentos: { data: { nome: "Toxina" } },
      "rpc:venda_registrar": { data: VENDA },
    });
    banco.cliente = falso.cliente;
    sessao.usuario = { id: ID, papel: "financeiro" };
    const { registrarVenda } = await import("./vendas");

    await destinoDe(
      registrarVenda(
        { erros: {} },
        formulario({
          ...VENDA_BASE,
          forma: "pix",
          taxa_cartao_id: TAXA,
          taxa_manual: "sim",
          taxa_percentual: "5",
          taxa_justificativa: "não devia valer",
        }),
      ),
    );

    expect(falso.chamadas.some((c) => c.alvo === "taxas_cartao")).toBe(false);
    expect(argumentosDaRpc(falso, "venda_registrar")).toMatchObject({
      p_forma: "pix",
      p_parcelas: 1,
      p_taxa_cartao_id: null,
      p_taxa_percentual: 0,
      p_taxa_valor: 0,
      p_taxa_manual: false,
      p_taxa_justificativa: null,
    });
  });

  it("cartão copia o percentual da tabela (fotografia), não o que veio do formulário", async () => {
    const falso = supabaseFalso({
      taxas_cartao: { data: { id: TAXA, tipo: "credito", parcelas: 3, percentual: 6.5, ativa: true } },
      procedimentos: { data: { nome: "Toxina" } },
      "rpc:venda_registrar": { data: VENDA },
    });
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    await destinoDe(
      registrarVenda(
        { erros: {} },
        formulario({
          ...VENDA_BASE,
          valor_original: "1.000,01",
          forma: "credito",
          parcelas: "3",
          taxa_cartao_id: TAXA,
          // Sem `taxa_manual=sim`, percentual digitado é ignorado.
          taxa_percentual: "1",
        }),
      ),
    );

    // R$ 1.000,01 a 6,5%: um arredondamento só, 6.500,065 → 6.500 centavos.
    expect(argumentosDaRpc(falso, "venda_registrar")).toMatchObject({
      p_valor_original: 1000.01,
      p_desconto: 0,
      p_parcelas: 3,
      p_taxa_cartao_id: TAXA,
      p_taxa_percentual: 6.5,
      p_taxa_valor: 65,
      p_taxa_manual: false,
    });
  });

  it("débito não parcela", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({ ...VENDA_BASE, forma: "debito", parcelas: "3", taxa_cartao_id: TAXA }),
    );
    expect(r.erros.parcelas).toBeTruthy();
    expect(falso.chamadas).toHaveLength(0);
  });

  it("taxa de outro parcelamento é recusada antes de gravar", async () => {
    const falso = supabaseFalso({
      taxas_cartao: { data: { id: TAXA, tipo: "credito", parcelas: 6, percentual: 8, ativa: true } },
    });
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({ ...VENDA_BASE, forma: "credito", parcelas: "3", taxa_cartao_id: TAXA }),
    );
    expect(r.erros.taxa).toMatch(/outro parcelamento/);
    expect(falso.chamadas.some((c) => c.alvo === "rpc:venda_registrar")).toBe(false);
  });

  it("taxa inativa não entra em venda nova", async () => {
    const falso = supabaseFalso({
      taxas_cartao: { data: { id: TAXA, tipo: "credito", parcelas: 3, percentual: 6.5, ativa: false } },
    });
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({ ...VENDA_BASE, forma: "credito", parcelas: "3", taxa_cartao_id: TAXA }),
    );
    expect(r.erros.taxa).toMatch(/não está mais ativa/);
    expect(falso.chamadas.some((c) => c.alvo === "rpc:venda_registrar")).toBe(false);
  });

  it("valor original vazio não vira venda de R$ 0,00 — e o que foi digitado volta", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({ ...VENDA_BASE, forma: "pix", valor_original: "", observacoes: "retorno" }),
    );
    expect(r.erros.valor_original).toMatch(/Informe o valor/);
    expect(r.valores).toMatchObject({ observacoes: "retorno", data_venda: "2026-09-01" });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("sem escolher se já entrou, o erro fica no campo da situação", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({ ...VENDA_BASE, forma: "pix", situacao_inicial: "" }),
    );
    expect(r.erros.situacao_inicial).toBeTruthy();
    expect(r.erros.geral).toBeUndefined();
  });

  it("pagamento no balcão não pode estar no futuro", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({ ...VENDA_BASE, forma: "pix", situacao_inicial: "recebido", recebido_em: "2099-01-01" }),
    );
    expect(r.erros.recebido_em).toMatch(/futuro/);
    expect(falso.chamadas).toHaveLength(0);
  });

  describe("taxa manual (financeiro)", () => {
    const MANUAL = {
      ...VENDA_BASE,
      forma: "credito",
      parcelas: "3",
      taxa_cartao_id: TAXA,
      taxa_manual: "sim",
    };
    const tabela = { taxas_cartao: { data: { id: TAXA, tipo: "credito", parcelas: 3, percentual: 6.5, ativa: true } } };

    beforeEach(() => {
      sessao.usuario = { id: ID, papel: "financeiro" };
    });

    it("percentual vazio não é 0%: o erro fica no campo", async () => {
      banco.cliente = supabaseFalso(tabela).cliente;
      const { registrarVenda } = await import("./vendas");

      const r = await registrarVenda(
        { erros: {} },
        formulario({ ...MANUAL, taxa_percentual: "", taxa_justificativa: "negociado com a operadora" }),
      );
      expect(r.erros.taxa_percentual).toMatch(/Informe a nova taxa/);
    });

    it("sem justificativa é recusada, com o erro no campo da justificativa", async () => {
      banco.cliente = supabaseFalso(tabela).cliente;
      const { registrarVenda } = await import("./vendas");

      const r = await registrarVenda({ erros: {} }, formulario({ ...MANUAL, taxa_percentual: "3" }));
      expect(r.erros.taxa_justificativa).toMatch(/justificativa/);
    });

    it("com motivo, grava marcada como manual e não toca a tabela padrão", async () => {
      const falso = supabaseFalso({
        ...tabela,
        procedimentos: { data: { nome: "Toxina" } },
        "rpc:venda_registrar": { data: VENDA },
      });
      banco.cliente = falso.cliente;
      const { registrarVenda } = await import("./vendas");

      await destinoDe(
        registrarVenda(
          { erros: {} },
          formulario({ ...MANUAL, taxa_percentual: "3", taxa_justificativa: "negociado com a operadora" }),
        ),
      );

      expect(argumentosDaRpc(falso, "venda_registrar")).toMatchObject({
        p_taxa_cartao_id: TAXA,
        p_taxa_percentual: 3,
        p_taxa_valor: 30,
        p_taxa_manual: true,
        p_taxa_justificativa: "negociado com a operadora",
      });
      // A tabela só foi lida: nenhum update/insert em `taxas_cartao`.
      for (const chamada of falso.chamadas.filter((c) => c.alvo === "taxas_cartao")) {
        expect(chamada.passos.map((p) => p.metodo)).not.toContain("update");
        expect(chamada.passos.map((p) => p.metodo)).not.toContain("insert");
      }
    });
  });
});

// ---------------------------------------------------------------------
// Confirmar recebimento
// ---------------------------------------------------------------------

describe("confirmarRecebimento", () => {
  const CONFIRMAR = { recebimento_id: ID, venda_id: VENDA, recebido_em: "2026-09-01" };
  const ABERTO = { data: { situacao: "previsto", valor: 1000, taxa_valor: 60 } };

  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "financeiro" };
  });

  it("recepção não confirma", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { confirmarRecebimento } = await import("./vendas");

    const r = await confirmarRecebimento({ erros: {} }, formulario({ ...CONFIRMAR, valor_recebido: "940" }));
    expect(r.erros.geral).toMatch(/financeiro/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("campo de valor vazio não vira R$ 0,00 confirmado para sempre", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { confirmarRecebimento } = await import("./vendas");

    const r = await confirmarRecebimento({ erros: {} }, formulario({ ...CONFIRMAR, valor_recebido: "  " }));
    expect(r.erros.valor_recebido).toMatch(/Informe o valor/);
    expect(r.valores).toMatchObject({ recebido_em: "2026-09-01" });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("valor igual ao líquido grava `recebido`, só se o recebimento ainda estiver em aberto", async () => {
    const falso = supabaseFalso({ recebimentos: [ABERTO, { data: { id: ID } }] });
    banco.cliente = falso.cliente;
    const { confirmarRecebimento } = await import("./vendas");

    await destinoDe(confirmarRecebimento({ erros: {} }, formulario({ ...CONFIRMAR, valor_recebido: "940,00" })));

    expect(argumentos(falso, "recebimentos", "update", 1)[0][0]).toEqual({
      situacao: "recebido",
      recebido_em: "2026-09-01",
      valor_recebido: 940,
    });
    expect(argumentos(falso, "recebimentos", "in", 1)).toContainEqual(["situacao", ["previsto", "pendente"]]);
  });

  it("zero digitado grava divergência com zero (comportamento atual — decisão em aberto)", async () => {
    const falso = supabaseFalso({ recebimentos: [ABERTO, { data: { id: ID } }] });
    banco.cliente = falso.cliente;
    const { confirmarRecebimento } = await import("./vendas");

    await destinoDe(confirmarRecebimento({ erros: {} }, formulario({ ...CONFIRMAR, valor_recebido: "0" })));

    expect(argumentos(falso, "recebimentos", "update", 1)[0][0]).toMatchObject({
      situacao: "recebido_divergencia",
      valor_recebido: 0,
    });
  });

  it("confirmado ou cancelado não se confirma de novo — nem chega ao UPDATE", async () => {
    for (const situacao of ["recebido", "recebido_divergencia", "cancelado"]) {
      const falso = supabaseFalso({ recebimentos: { data: { situacao, valor: 1000, taxa_valor: 60 } } });
      banco.cliente = falso.cliente;
      const { confirmarRecebimento } = await import("./vendas");

      const r = await confirmarRecebimento({ erros: {} }, formulario({ ...CONFIRMAR, valor_recebido: "940" }));
      expect(r.erros.geral).toMatch(/já foi confirmado ou cancelado/);
      expect(falso.chamadas.filter((c) => c.alvo === "recebimentos")).toHaveLength(1);
    }
  });
});

// ---------------------------------------------------------------------
// Situação do recebimento
// ---------------------------------------------------------------------

describe("mudarSituacaoRecebimento", () => {
  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "financeiro" };
  });

  it("não há caminho para confirmado por aqui", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacaoRecebimento } = await import("./vendas");

    for (const para of ["recebido", "recebido_divergencia"]) {
      const r = await mudarSituacaoRecebimento(
        ACAO_INICIAL,
        formulario({ recebimento_id: ID, venda_id: VENDA, para }),
      );
      expect(r.ok).toBe(false);
    }
    expect(falso.chamadas).toHaveLength(0);
  });

  it("cancelar só sai de previsto ou pendente — cancelado é terminal", async () => {
    const falso = supabaseFalso({ recebimentos: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    const { mudarSituacaoRecebimento } = await import("./vendas");

    const r = await mudarSituacaoRecebimento(
      ACAO_INICIAL,
      formulario({ recebimento_id: ID, venda_id: VENDA, para: "cancelado" }),
    );
    expect(r.ok).toBe(true);
    expect(argumentos(falso, "recebimentos", "in")).toContainEqual(["situacao", ["previsto", "pendente"]]);
  });

  it("linha não alcançada (já confirmada ou cancelada) não finge sucesso", async () => {
    banco.cliente = supabaseFalso({ recebimentos: { data: null } }).cliente;
    const { mudarSituacaoRecebimento } = await import("./vendas");

    const r = await mudarSituacaoRecebimento(
      ACAO_INICIAL,
      formulario({ recebimento_id: ID, venda_id: VENDA, para: "previsto" }),
    );
    expect(r.ok).toBe(false);
    expect(navegacao.revalidados).toEqual([]);
  });
});

// ---------------------------------------------------------------------
// Alterar forma ou taxa
// ---------------------------------------------------------------------

describe("alteração de pagamento", () => {
  const CARTAO = { valor_original: 1000, desconto: 0, valor_final: 1000, forma: "credito", parcelas: 3, taxa_cartao_id: TAXA };

  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "financeiro" };
  });

  it("exige motivo antes de qualquer leitura", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { alterarTaxaManual } = await import("./vendas");

    const r = await alterarTaxaManual({ erros: {} }, formulario({ venda_id: VENDA, motivo: "", taxa_percentual: "3" }));
    expect(r.erros.motivo).toBeTruthy();
    expect(falso.chamadas).toHaveLength(0);
  });

  it("taxa manual vazia não vira 0%", async () => {
    const falso = supabaseFalso({ vendas: { data: CARTAO } });
    banco.cliente = falso.cliente;
    const { alterarTaxaManual } = await import("./vendas");

    const r = await alterarTaxaManual(
      { erros: {} },
      formulario({ venda_id: VENDA, motivo: "renegociada", taxa_percentual: "" }),
    );
    expect(r.erros.taxa).toMatch(/Informe a nova taxa/);
    expect(r.valores).toMatchObject({ motivo: "renegociada" });
    expect(falso.chamadas.some((c) => c.alvo === "rpc:venda_alterar_pagamento")).toBe(false);
  });

  it("taxa manual passa pela função do banco, com o valor recalculado em centavos", async () => {
    const falso = supabaseFalso({ vendas: { data: CARTAO } });
    banco.cliente = falso.cliente;
    const { alterarTaxaManual } = await import("./vendas");

    await destinoDe(
      alterarTaxaManual({ erros: {} }, formulario({ venda_id: VENDA, motivo: "renegociada", taxa_percentual: "2,5" })),
    );
    expect(argumentosDaRpc(falso, "venda_alterar_pagamento")).toMatchObject({
      p_venda_id: VENDA,
      p_tipo: "taxa_manual",
      p_forma: "credito",
      p_parcelas: 3,
      p_taxa_percentual: 2.5,
      p_taxa_valor: 25,
      p_taxa_manual: true,
      p_motivo: "renegociada",
    });
    // Nenhum UPDATE direto: recebimento e ajuste são da função do banco.
    expect(falso.chamadas.some((c) => c.passos.some((p) => p.metodo === "update" || p.metodo === "insert"))).toBe(false);
  });

  it("trocar para PIX zera a taxa e tira a proveniência", async () => {
    const falso = supabaseFalso({ vendas: { data: CARTAO } });
    banco.cliente = falso.cliente;
    const { alterarFormaPagamento } = await import("./vendas");

    await destinoDe(
      alterarFormaPagamento({ erros: {} }, formulario({ venda_id: VENDA, motivo: "pagou no PIX", forma: "pix" })),
    );
    expect(argumentosDaRpc(falso, "venda_alterar_pagamento")).toMatchObject({
      p_tipo: "forma_pagamento",
      p_forma: "pix",
      p_parcelas: 1,
      p_taxa_cartao_id: null,
      p_taxa_percentual: 0,
      p_taxa_valor: 0,
      p_taxa_manual: false,
    });
  });
});

// ---------------------------------------------------------------------
// Despesas e taxas
// ---------------------------------------------------------------------

describe("despesas", () => {
  beforeEach(() => {
    sessao.usuario = { id: ID, papel: "financeiro" };
  });

  it("competência é o mês do vencimento e o valor vai em reais exatos", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarDespesa } = await import("./despesas");

    await destinoDe(
      criarDespesa(
        { erros: {} },
        formulario({ descricao: "Aluguel", categoria: "estrutura", valor: "1.500,10", vencimento: "2026-09-30" }),
      ),
    );
    expect(argumentos(falso, "despesas", "insert")[0][0]).toMatchObject({
      valor: 1500.1,
      vencimento: "2026-09-30",
      competencia: "2026-09-01",
      criado_por: ID,
    });
  });

  it("pagar e cancelar só a partir de pendente; reabrir só de paga ou cancelada", async () => {
    const { mudarSituacaoDespesa } = await import("./despesas");

    const casos: [Record<string, string>, unknown[]][] = [
      [{ acao: "pagar", pago_em: "2026-09-01" }, ["situacao", "pendente"]],
      [{ acao: "cancelar" }, ["situacao", "pendente"]],
    ];
    for (const [campos, condicao] of casos) {
      const falso = supabaseFalso({ despesas: { data: { id: ID } } });
      banco.cliente = falso.cliente;
      const r = await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: ID, ...campos }));
      expect(r.ok).toBe(true);
      expect(argumentos(falso, "despesas", "eq")).toContainEqual(condicao);
    }

    const falso = supabaseFalso({ despesas: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: ID, acao: "reabrir" }));
    expect(argumentos(falso, "despesas", "in")).toContainEqual(["situacao", ["paga", "cancelada"]]);
    expect(argumentos(falso, "despesas", "update")[0][0]).toEqual({ situacao: "pendente", pago_em: null, forma: null });
  });
});

describe("tabela de taxas", () => {
  it("financeiro vê a tabela, mas não configura", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarTaxa } = await import("./taxas-cartao");

    const r = await criarTaxa(
      { erros: {} },
      formulario({ operadora: "Stone", tipo: "credito", parcelas: "3", percentual: "6,5" }),
    );
    expect(r.erros.geral).toMatch(/administradora/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("percentual vazio não vira taxa zero", async () => {
    sessao.usuario = { id: ID, papel: "administradora" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarTaxa } = await import("./taxas-cartao");

    const r = await criarTaxa(
      { erros: {} },
      formulario({ operadora: "Stone", tipo: "credito", parcelas: "3", percentual: "" }),
    );
    expect(r.erros.percentual).toMatch(/Informe o percentual/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("débito grava sempre 1 parcela, e o percentual vai exato para numeric(5,2)", async () => {
    sessao.usuario = { id: ID, papel: "administradora" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarTaxa } = await import("./taxas-cartao");

    await destinoDe(
      criarTaxa({ erros: {} }, formulario({ operadora: "Stone", tipo: "debito", parcelas: "6", percentual: "1,99" })),
    );
    expect(argumentos(falso, "taxas_cartao", "insert")[0][0]).toEqual({
      operadora: "Stone",
      tipo: "debito",
      parcelas: 1,
      percentual: 1.99,
    });
  });
});
