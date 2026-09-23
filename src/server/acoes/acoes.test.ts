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

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

/** Nenhuma frase que chega à tela pode trazer texto do Postgres. */
const TEXTO_TECNICO = /violates|constraint|relation|policy|duplicate key|syntax|PGRST|42501|23505/i;

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "recepcao" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

// ---------------------------------------------------------------------

describe("mudarSituacao (agenda)", () => {
  it("sem sessão não toca o banco", async () => {
    sessao.usuario = null;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r).toEqual({ ok: false, mensagem: "Sessão expirada. Entre novamente." });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("situação fora do enum é recusada antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ID, para: "remarcado" }));
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("erro do banco vira frase segura, e nada é revalidado", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: { error: { code: "XX000", message: 'relation "atendimentos" is broken' } },
    }).cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("choque de horário do banco (23P01) diz o que fazer", async () => {
    banco.cliente = supabaseFalso({
      atendimentos: { error: { code: "23P01", message: "Choque de horário com outro atendimento" } },
    }).cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ID, para: "agendado" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/remarque/) });
  });

  it("nenhuma linha alterada não finge sucesso", async () => {
    banco.cliente = supabaseFalso({ atendimentos: { data: null } }).cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r.ok).toBe(false);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("sucesso revalida a agenda e a Visão Geral", async () => {
    const falso = supabaseFalso({ atendimentos: { data: { id: ID } } });
    banco.cliente = falso.cliente;
    const { mudarSituacao } = await import("./agenda");

    const r = await mudarSituacao(ACAO_INICIAL, formulario({ id: ID, para: "confirmado" }));
    expect(r.ok).toBe(true);
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/agenda", "/"]));
    // A condição `.neq(situacao)` evita gravar a trilha de uma mudança que não mudou nada.
    expect(falso.passosDe("atendimentos").map((p) => p.metodo)).toContain("neq");
  });
});

describe("marcarAtendimento", () => {
  const campos = {
    paciente_id: ID,
    profissional_id: ID,
    procedimento_id: ID,
    data: "2026-02-31",
    hora: "14:30",
    duracao_min: "60",
    valor: "150",
  };

  it("31/02 é recusado — não vira 03/03 em silêncio", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario(campos));
    expect(r.erros.data).toBe("Data inválida.");
    expect(r.valores?.hora).toBe("14:30");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("falha ao conferir a agenda não promete horário livre", async () => {
    banco.cliente = supabaseFalso({ atendimentos: { error: { code: "57014", message: "timeout" } } }).cliente;
    const { marcarAtendimento } = await import("./agenda");

    const r = await marcarAtendimento({ erros: {} }, formulario({ ...campos, data: "2026-09-22" }));
    expect(r.erros.hora).toMatch(/Não foi possível conferir a agenda/);
  });
});

describe("vendas", () => {
  it("taxa manual em venda de PIX é recusada (bug 1 do AGENTS.md §13)", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    const falso = supabaseFalso({
      vendas: {
        data: { valor_original: 500, desconto: 0, valor_final: 500, forma: "pix", parcelas: 1, taxa_cartao_id: null },
      },
    });
    banco.cliente = falso.cliente;
    const { alterarTaxaManual } = await import("./vendas");

    const r = await alterarTaxaManual(
      { erros: {} },
      formulario({ venda_id: VENDA, motivo: "negociado", taxa_percentual: "5" }),
    );
    expect(r.erros.taxa).toMatch(/não é no cartão/);
    expect(falso.chamadas.some((c) => c.alvo === "rpc:venda_alterar_pagamento")).toBe(false);
  });

  it("recepção não altera venda", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { alterarFormaPagamento } = await import("./vendas");

    const r = await alterarFormaPagamento({ erros: {} }, formulario({ venda_id: VENDA, motivo: "trocou" }));
    expect(r.erros.geral).toMatch(/restrito ao financeiro/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("confirmação concorrente: quem chega depois é avisado, não grava duas vezes", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    banco.cliente = supabaseFalso({
      recebimentos: [
        { data: { situacao: "previsto", valor: 100, taxa_valor: 0 } },
        // O UPDATE com `.in(situacao, [previsto, pendente])` não achou a linha:
        // outra pessoa confirmou no meio-tempo.
        { data: null },
      ],
    }).cliente;
    const { confirmarRecebimento } = await import("./vendas");

    const r = await confirmarRecebimento(
      { erros: {} },
      formulario({ recebimento_id: ID, venda_id: VENDA, recebido_em: "2026-09-01", valor_recebido: "100" }),
    );
    expect(r.erros.geral).toMatch(/outra pessoa/);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("recebimento no futuro é recusado", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    banco.cliente = supabaseFalso().cliente;
    const { confirmarRecebimento } = await import("./vendas");

    const r = await confirmarRecebimento(
      { erros: {} },
      formulario({ recebimento_id: ID, venda_id: VENDA, recebido_em: "2099-01-01", valor_recebido: "100" }),
    );
    expect(r.erros.recebido_em).toMatch(/futuro/);
  });

  it("recusa do gatilho da 0020 chega em português", async () => {
    banco.cliente = supabaseFalso({
      taxas_cartao: { data: { id: ID, tipo: "credito", parcelas: 3, percentual: 6.5, ativa: true } },
      procedimentos: { data: { nome: "Toxina" } },
      "rpc:venda_registrar": {
        error: { code: "P0001", message: "O percentual não confere com a tabela padrão de taxas." },
      },
    }).cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({
        paciente_id: ID,
        procedimento_id: ID,
        data_venda: "2026-09-22",
        forma: "credito",
        parcelas: "3",
        valor_original: "1.000,00",
        situacao_inicial: "previsto",
        vencimento: "2026-10-22",
        taxa_cartao_id: ID,
      }),
    ).catch((e) => {
      if (e instanceof Redirecionou) throw new Error("não devia redirecionar");
      throw e;
    });
    expect(r.erros.geral).toBe("O percentual não confere com a tabela padrão de taxas.");
  });

  it("recepção não registra taxa manual", async () => {
    banco.cliente = supabaseFalso({
      taxas_cartao: { data: { id: ID, tipo: "credito", parcelas: 3, percentual: 6.5, ativa: true } },
    }).cliente;
    const { registrarVenda } = await import("./vendas");

    const r = await registrarVenda(
      { erros: {} },
      formulario({
        paciente_id: ID,
        procedimento_id: ID,
        data_venda: "2026-09-22",
        forma: "credito",
        parcelas: "3",
        valor_original: "1000",
        situacao_inicial: "previsto",
        vencimento: "2026-10-22",
        taxa_cartao_id: ID,
        taxa_manual: "sim",
        taxa_percentual: "1",
        taxa_justificativa: "cliente pediu",
      }),
    );
    expect(r.erros.taxa).toMatch(/restrito ao financeiro/);
  });
});

describe("pacientes", () => {
  it("CPF repetido vira mensagem no campo, não erro cru", async () => {
    banco.cliente = supabaseFalso({
      pacientes: {
        error: {
          code: "23505",
          message: 'duplicate key value violates unique constraint "pacientes_cpf_unico"',
          details: "Key (cpf)=(52998224725) already exists.",
        },
      },
    }).cliente;
    const { cadastrarPaciente } = await import("./pacientes");

    const r = await cadastrarPaciente({ erros: {} }, formulario({ nome: "Ana Maria", cpf: "529.982.247-25" }));
    expect(r.erros).toEqual({ cpf: "Já existe uma paciente cadastrada com este CPF." });
    expect(r.valores?.nome).toBe("Ana Maria");
  });

  it("arquivar paciente inexistente não finge sucesso", async () => {
    banco.cliente = supabaseFalso({ pacientes: { data: null } }).cliente;
    const { alternarArquivamento } = await import("./pacientes");

    const r = await alternarArquivamento(ACAO_INICIAL, formulario({ id: ID, arquivar: "sim" }));
    expect(r).toEqual({ ok: false, mensagem: "Paciente não encontrada." });
  });

  it("cadastro que dá certo redireciona para a ficha", async () => {
    banco.cliente = supabaseFalso({ pacientes: { data: { id: ID } } }).cliente;
    const { cadastrarPaciente } = await import("./pacientes");

    await expect(cadastrarPaciente({ erros: {} }, formulario({ nome: "Ana Maria" }))).rejects.toEqual(
      new Redirecionou(`/pacientes/${ID}`),
    );
    expect(navegacao.revalidados).toContain("/pacientes");
  });
});

describe("despesas e taxas", () => {
  it("recepção não mexe em despesa", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarSituacaoDespesa } = await import("./despesas");

    const r = await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: ID, acao: "cancelar" }));
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("pagar exige data real e não futura", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    banco.cliente = supabaseFalso().cliente;
    const { mudarSituacaoDespesa } = await import("./despesas");

    expect((await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: ID, acao: "pagar", pago_em: "2026-02-30" }))).mensagem).toMatch(
      /data do pagamento/,
    );
    expect((await mudarSituacaoDespesa(ACAO_INICIAL, formulario({ id: ID, acao: "pagar", pago_em: "2099-01-01" }))).mensagem).toMatch(
      /futuro/,
    );
  });

  it("reativar taxa que choca com outra ativa avisa (bug 2 do AGENTS.md §13)", async () => {
    sessao.usuario = { id: ID, papel: "administradora" };
    banco.cliente = supabaseFalso({
      taxas_cartao: { error: { code: "23505", message: "duplicate key value violates unique constraint" } },
    }).cliente;
    const { alternarAtivaTaxa } = await import("./taxas-cartao");

    const r = await alternarAtivaTaxa(ACAO_INICIAL, formulario({ id: ID, ativar: "sim" }));
    expect(r).toEqual({ ok: false, mensagem: expect.stringMatching(/Já existe outra taxa ativa/) });
  });
});
