import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { linhaDeRegistro, supabaseFalso } from "../../../testes/supabase-falso";

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string; papel: "administradora" | "financeiro" | "recepcao" },
}));
const banco = vi.hoisted(() => ({ cliente: null as unknown }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, email: "x@clinica.local", nome: "Pessoa de Teste" },
  ehFinanceira: async () =>
    sessao.usuario?.papel === "administradora" || sessao.usuario?.papel === "financeiro",
}));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));
vi.mock("next/cache", () => ({
  revalidatePath: (caminho: string) => navegacao.revalidados.push(caminho),
}));

const ID = "c0000000-0000-4000-8000-000000000001";
const LEAD = "d0000000-0000-4000-8000-000000000001";
const PACIENTE = "e0000000-0000-4000-8000-000000000001";

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "administradora" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("criarLead", () => {
  it("financeiro acompanha o funil, mas não cadastra lead", async () => {
    sessao.usuario = { id: ID, papel: "financeiro" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLead } = await import("./captacao");

    const r = await criarLead({ erros: {} }, formulario({ nome: "Maria Silva", origem: "Instagram" }));
    expect(r.erros.geral).toMatch(/não altera leads/i);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("valida contato antes de tocar o banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLead } = await import("./captacao");

    const r = await criarLead(
      { erros: {} },
      formulario({ nome: "M", telefone: "123", email: "errado", origem: "Instagram" }),
    );
    expect(r.erros.nome).toBeTruthy();
    expect(r.erros.telefone).toBeTruthy();
    expect(r.erros.email).toBeTruthy();
    expect(falso.chamadas).toHaveLength(0);
  });

  it("recepção grava o lead normalizado e revalida a Captação", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLead } = await import("./captacao");

    const r = await criarLead(
      { erros: {} },
      formulario({
        nome: "  Maria   Silva  ",
        telefone: "(11) 98765-4321",
        email: "MARIA@EXEMPLO.COM",
        origem: "Instagram",
        campanha: " Botox Setembro ",
      }),
    );

    expect(r.sucesso).toMatch(/adicionado/i);
    const insercao = falso.passosDe("leads").find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toMatchObject({
      nome: "Maria Silva",
      telefone: "11987654321",
      email: "maria@exemplo.com",
      origem: "Instagram",
      campanha: "Botox Setembro",
    });
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/captacao", "/"]));
  });
});

describe("salvarMetaComercial", () => {
  it("recepção não altera a meta", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { salvarMetaComercial } = await import("./captacao");

    const r = await salvarMetaComercial(
      { erros: {} },
      formulario({
        competencia: "2026-09-01",
        meta_faturamento: "75000",
        ticket_medio_planejado: "1500",
        taxa_lead_qualificado: "54",
        taxa_qualificado_agendamento: "49",
        taxa_agendamento_venda: "47",
      }),
    );
    expect(r.erros.geral).toMatch(/administradora ou o financeiro/i);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("taxa inválida não chega ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { salvarMetaComercial } = await import("./captacao");

    const r = await salvarMetaComercial(
      { erros: {} },
      formulario({
        competencia: "2026-09-01",
        meta_faturamento: "75000",
        ticket_medio_planejado: "1500",
        taxa_lead_qualificado: "0",
        taxa_qualificado_agendamento: "49",
        taxa_agendamento_venda: "47",
      }),
    );
    expect(r.erros.taxa_lead_qualificado).toBeTruthy();
    expect(falso.chamadas).toHaveLength(0);
  });
});

describe("mudarEtapaLead", () => {
  it("perda exige motivo antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarEtapaLead } = await import("./captacao");

    const r = await mudarEtapaLead(ACAO_INICIAL, formulario({ id: LEAD, para: "perdido", motivo: "" }));
    expect(r).toEqual({ ok: false, mensagem: "Informe o motivo da perda." });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("não deixa a carteira fabricar uma venda concluída", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarEtapaLead } = await import("./captacao");

    const r = await mudarEtapaLead(
      ACAO_INICIAL,
      formulario({ id: LEAD, para: "ganho", motivo: "" }),
    );

    expect(r).toEqual({
      ok: false,
      mensagem: "Venda concluída só é registrada quando existe uma venda no Financeiro.",
    });
    expect(falso.chamadas).toHaveLength(0);
  });

  it("mudança válida confere a linha e revalida", async () => {
    const falso = supabaseFalso({ leads: { data: { id: LEAD } } });
    banco.cliente = falso.cliente;
    const { mudarEtapaLead } = await import("./captacao");

    const r = await mudarEtapaLead(
      ACAO_INICIAL,
      formulario({ id: LEAD, para: "qualificado", motivo: "" }),
    );
    expect(r.ok).toBe(true);
    const atualizacao = falso.passosDe("leads").find((p) => p.metodo === "update");
    expect(atualizacao?.argumentos[0]).toEqual({ etapa: "qualificado", motivo_perda: null });
    expect(navegacao.revalidados).toContain("/captacao");
  });
});

describe("criarLead — sessão e banco", () => {
  it("sessão expirada não chega ao banco", async () => {
    sessao.usuario = null;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLead } = await import("./captacao");

    const r = await criarLead({ erros: {} }, formulario({ nome: "Maria Silva", origem: "Instagram" }));
    expect(r.erros.geral).toMatch(/Sessão expirada/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("falha do banco vira frase segura, com o digitado de volta e sem revalidar", async () => {
    const falso = supabaseFalso({ leads: { error: { code: "XX000", message: "falha simulada" } } });
    banco.cliente = falso.cliente;
    const { criarLead } = await import("./captacao");

    const r = await criarLead({ erros: {} }, formulario({ nome: "Maria Silva", origem: "Instagram" }));
    expect(r.erros.geral).toBe("Não foi possível adicionar o lead. Tente de novo.");
    expect(r.valores?.nome).toBe("Maria Silva");
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("captação: criar lead", "XX000"));
    expect(navegacao.revalidados).toHaveLength(0);
  });
});

describe("mudarEtapaLead — entradas e alcance", () => {
  it("sessão expirada, lead sem id e etapa fora da lista não chegam ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { mudarEtapaLead } = await import("./captacao");

    expect((await mudarEtapaLead(ACAO_INICIAL, formulario({ id: "abc", para: "novo" }))).mensagem).toBe("Lead não identificado.");
    expect((await mudarEtapaLead(ACAO_INICIAL, formulario({ id: LEAD, para: "arquivado" }))).mensagem).toBe("Etapa inválida.");
    sessao.usuario = null;
    expect((await mudarEtapaLead(ACAO_INICIAL, formulario({ id: LEAD, para: "novo" }))).mensagem).toMatch(/Sessão expirada/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("perda grava o motivo junto da etapa", async () => {
    const falso = supabaseFalso({ leads: { data: { id: LEAD } } });
    banco.cliente = falso.cliente;
    const { mudarEtapaLead } = await import("./captacao");

    const r = await mudarEtapaLead(ACAO_INICIAL, formulario({ id: LEAD, para: "perdido", motivo: "Preço" }));
    expect(r.ok).toBe(true);
    const atualizacao = falso.passosDe("leads").find((p) => p.metodo === "update");
    expect(atualizacao?.argumentos[0]).toEqual({ etapa: "perdido", motivo_perda: "Preço" });
  });

  it("zero linhas (RLS ou lead inexistente) não é sucesso", async () => {
    const falso = supabaseFalso({ leads: { data: null } });
    banco.cliente = falso.cliente;
    const { mudarEtapaLead } = await import("./captacao");

    const r = await mudarEtapaLead(ACAO_INICIAL, formulario({ id: LEAD, para: "qualificado" }));
    expect(r).toEqual({ ok: false, mensagem: "Lead não encontrado ou sem permissão para alteração." });
    expect(navegacao.revalidados).toHaveLength(0);
  });
});

describe("converterLeadEmPaciente", () => {
  it("sessão expirada, financeiro e lead sem id não chamam a função do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { converterLeadEmPaciente } = await import("./captacao");

    expect((await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: "x" }))).mensagem).toBe("Lead não identificado.");
    sessao.usuario = { id: ID, papel: "financeiro" };
    expect((await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: LEAD }))).mensagem).toMatch(/não altera leads/);
    sessao.usuario = null;
    expect((await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: LEAD }))).mensagem).toMatch(/Sessão expirada/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("recepção converte: chama a função com o lead e revalida lead e paciente", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso({ "rpc:lead_converter_em_paciente": { data: PACIENTE } });
    banco.cliente = falso.cliente;
    const { converterLeadEmPaciente } = await import("./captacao");

    const r = await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: LEAD }));
    expect(r).toEqual({ ok: true, mensagem: "Paciente criada e vinculada ao lead." });
    expect(falso.passosDe("rpc:lead_converter_em_paciente")).toContainEqual({
      metodo: "rpc",
      argumentos: [{ p_lead_id: LEAD }],
    });
    expect(navegacao.revalidados).toEqual(
      expect.arrayContaining(["/captacao", "/", "/pacientes", `/pacientes/${PACIENTE}`]),
    );
  });

  it("a frase da regra do banco (lead perdido) chega à tela; o resto vira frase segura", async () => {
    banco.cliente = supabaseFalso({
      "rpc:lead_converter_em_paciente": {
        error: { code: "P0001", message: "Reabra o lead antes de criar a paciente." },
      },
    }).cliente;
    const { converterLeadEmPaciente } = await import("./captacao");
    expect((await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: LEAD }))).mensagem).toBe(
      "Reabra o lead antes de criar a paciente.",
    );

    banco.cliente = supabaseFalso({
      "rpc:lead_converter_em_paciente": { error: { code: "XX000", message: 'relation "x" does not exist' } },
    }).cliente;
    const r = await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: LEAD }));
    expect(r.mensagem).toBe("Não foi possível criar a paciente a partir do lead. Tente de novo.");
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("captação: converter lead em paciente", "XX000"));
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("resposta sem id de paciente não é sucesso", async () => {
    banco.cliente = supabaseFalso({ "rpc:lead_converter_em_paciente": { data: null } }).cliente;
    const { converterLeadEmPaciente } = await import("./captacao");

    const r = await converterLeadEmPaciente(ACAO_INICIAL, formulario({ id: LEAD }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/paciente não foi identificada/);
    expect(navegacao.revalidados).toHaveLength(0);
  });
});

describe("vincularPacienteLead", () => {
  it("lead ou paciente sem id válido não chegam ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { vincularPacienteLead } = await import("./captacao");

    expect((await vincularPacienteLead(ACAO_INICIAL, formulario({ id: "x", paciente_id: PACIENTE }))).mensagem).toBe(
      "Lead não identificado.",
    );
    expect((await vincularPacienteLead(ACAO_INICIAL, formulario({ id: LEAD, paciente_id: "" }))).mensagem).toBe(
      "Escolha uma paciente para vincular.",
    );
    expect(falso.chamadas).toHaveLength(0);
  });

  it("paciente inexistente (ou escondida pela RLS) não gera vínculo", async () => {
    const falso = supabaseFalso({ pacientes: { data: null } });
    banco.cliente = falso.cliente;
    const { vincularPacienteLead } = await import("./captacao");

    const r = await vincularPacienteLead(ACAO_INICIAL, formulario({ id: LEAD, paciente_id: PACIENTE }));
    expect(r).toEqual({ ok: false, mensagem: "Paciente não encontrada." });
    expect(falso.passosDe("leads")).toHaveLength(0);
  });

  it("falha ao localizar a paciente vira frase segura e vai para o log", async () => {
    banco.cliente = supabaseFalso({ pacientes: { error: { code: "XX000", message: "falha simulada" } } }).cliente;
    const { vincularPacienteLead } = await import("./captacao");

    const r = await vincularPacienteLead(ACAO_INICIAL, formulario({ id: LEAD, paciente_id: PACIENTE }));
    expect(r.mensagem).toBe("Não foi possível localizar a paciente. Tente de novo.");
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("captação: localizar paciente do lead", "XX000"));
  });

  it("paciente apagada entre a leitura e o vínculo (23503) tem frase própria", async () => {
    banco.cliente = supabaseFalso({
      pacientes: { data: { id: PACIENTE } },
      leads: { error: { code: "23503", message: "violates foreign key constraint" } },
    }).cliente;
    const { vincularPacienteLead } = await import("./captacao");

    const r = await vincularPacienteLead(ACAO_INICIAL, formulario({ id: LEAD, paciente_id: PACIENTE }));
    expect(r.mensagem).toBe("A paciente selecionada não existe mais.");
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("zero linhas no vínculo não é sucesso", async () => {
    banco.cliente = supabaseFalso({ pacientes: { data: { id: PACIENTE } }, leads: { data: null } }).cliente;
    const { vincularPacienteLead } = await import("./captacao");

    const r = await vincularPacienteLead(ACAO_INICIAL, formulario({ id: LEAD, paciente_id: PACIENTE }));
    expect(r.mensagem).toBe("Lead não encontrado ou sem permissão para alteração.");
  });

  it("vincula só a paciente e revalida a ficha dela", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso({ pacientes: { data: { id: PACIENTE } }, leads: { data: { id: LEAD } } });
    banco.cliente = falso.cliente;
    const { vincularPacienteLead } = await import("./captacao");

    const r = await vincularPacienteLead(ACAO_INICIAL, formulario({ id: LEAD, paciente_id: PACIENTE }));
    expect(r).toEqual({ ok: true, mensagem: "Paciente vinculada ao lead." });
    const atualizacao = falso.passosDe("leads").find((p) => p.metodo === "update");
    expect(atualizacao?.argumentos[0]).toEqual({ paciente_id: PACIENTE });
    expect(falso.passosDe("leads")).toContainEqual({ metodo: "eq", argumentos: ["id", LEAD] });
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/captacao", `/pacientes/${PACIENTE}`]));
  });
});

describe("registrarContatoLead", () => {
  // Meio-dia em São Paulo: o dia da clínica e o do UTC coincidem.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-25T15:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const contato = (campos: Record<string, string> = {}) =>
    formulario({ lead_id: LEAD, canal: "whatsapp", observacao: "Pediu os valores.", proximo_contato: "", ...campos });

  it("sessão expirada e financeiro não chegam ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    sessao.usuario = null;
    expect((await registrarContatoLead({ erros: {} }, contato())).erros.geral).toMatch(/Sessão expirada/);
    sessao.usuario = { id: ID, papel: "financeiro" };
    const r = await registrarContatoLead({ erros: {} }, contato());
    expect(r.erros.geral).toMatch(/não altera leads/);
    expect(r.valores?.observacao).toBe("Pediu os valores.");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("lead sem id válido não chega ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead({ erros: {} }, contato({ lead_id: "1; drop table leads" }));
    expect(r.erros.geral).toBe("Lead não identificado.");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("canal, observação e data inválidos voltam por campo, com o digitado", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead(
      { erros: {} },
      contato({ canal: "pombo-correio", observacao: "x".repeat(1001), proximo_contato: "2026-02-30" }),
    );
    expect(r.erros.canal).toBeTruthy();
    expect(r.erros.observacao).toMatch(/1000/);
    expect(r.erros.proximo_contato).toBe("Data inválida.");
    expect(r.valores?.canal).toBe("pombo-correio");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("retorno no passado é recusado antes do banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead({ erros: {} }, contato({ proximo_contato: "2026-09-24" }));
    expect(r.erros.proximo_contato).toMatch(/passado/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("hoje é o dia da clínica: às 23h30 de São Paulo o UTC já virou, e hoje ainda vale", async () => {
    vi.setSystemTime(new Date("2026-09-26T02:30:00Z"));
    const falso = supabaseFalso({ lead_interacoes: { data: { id: 7 } } });
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead({ erros: {} }, contato({ proximo_contato: "2026-09-25" }));
    expect(r.erros).toEqual({});
    expect(r.sucesso).toMatch(/retorno programado/);
  });

  it("recepção registra: grava só as colunas do grant — autor e hora são do banco", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso({ lead_interacoes: { data: { id: 7 } } });
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead(
      { erros: {} },
      contato({ canal: " Telefone ", observacao: "  Vai pensar e retorna.  ", proximo_contato: "2026-09-30" }),
    );
    expect(r).toEqual({ erros: {}, valores: {}, sucesso: "Contato registrado e retorno programado." });
    const insercao = falso.passosDe("lead_interacoes").find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toEqual({
      lead_id: LEAD,
      canal: "telefone",
      observacao: "Vai pensar e retorna.",
      proximo_contato: "2026-09-30",
    });
    expect(Object.keys(insercao?.argumentos[0] as object)).not.toContain("por");
    expect(Object.keys(insercao?.argumentos[0] as object)).not.toContain("em");
    // Nunca escreve o resumo no lead: é o gatilho da 0030.
    expect(falso.passosDe("leads")).toHaveLength(0);
    expect(falso.passosDe("lead_interacoes")).toContainEqual({ metodo: "select", argumentos: ["id"] });
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/captacao", "/"]));
  });

  it("administradora registra contato sem retorno: vazio vira nulo", async () => {
    const falso = supabaseFalso({ lead_interacoes: { data: { id: 8 } } });
    banco.cliente = falso.cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead({ erros: {} }, contato({ observacao: "   " }));
    expect(r.sucesso).toBe("Contato registrado.");
    const insercao = falso.passosDe("lead_interacoes").find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toMatchObject({ observacao: null, proximo_contato: null });
  });

  it("lead encerrado: a frase do banco (0031) chega à tela, sem revalidar", async () => {
    banco.cliente = supabaseFalso({
      lead_interacoes: { error: { code: "P0001", message: "Reabra o lead antes de registrar um novo contato." } },
    }).cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead({ erros: {} }, contato());
    expect(r.erros.geral).toBe("Reabra o lead antes de registrar um novo contato.");
    expect(r.valores?.observacao).toBe("Pediu os valores.");
    expect(navegacao.revalidados).toHaveLength(0);
    // Recusa de regra não é falha técnica: não vai para o log.
    expect(console.error).not.toHaveBeenCalled();
  });

  it("RLS recusando vira frase de permissão; falha técnica vira frase segura e log", async () => {
    banco.cliente = supabaseFalso({
      lead_interacoes: {
        error: { code: "42501", message: 'new row violates row-level security policy for table "lead_interacoes"' },
      },
    }).cliente;
    const { registrarContatoLead } = await import("./captacao");
    expect((await registrarContatoLead({ erros: {} }, contato())).erros.geral).toBe(
      "Seu perfil não tem permissão para esta ação.",
    );

    banco.cliente = supabaseFalso({ lead_interacoes: { error: { code: "XX000", message: "falha simulada" } } }).cliente;
    const r = await registrarContatoLead({ erros: {} }, contato());
    expect(r.erros.geral).toBe("Não foi possível registrar o contato. Tente de novo.");
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("captação: registrar contato", "XX000"));
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("zero linhas devolvidas não é sucesso", async () => {
    banco.cliente = supabaseFalso({ lead_interacoes: { data: null } }).cliente;
    const { registrarContatoLead } = await import("./captacao");

    const r = await registrarContatoLead({ erros: {} }, contato());
    expect(r.erros.geral).toMatch(/não foi registrado/);
    expect(navegacao.revalidados).toHaveLength(0);
  });
});
