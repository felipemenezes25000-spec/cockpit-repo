import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { supabaseFalso } from "../../../testes/supabase-falso";

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
