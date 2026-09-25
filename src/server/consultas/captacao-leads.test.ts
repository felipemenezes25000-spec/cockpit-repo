import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lerMes } from "@/lib/periodo";
import { linhaDeRegistro, supabaseFalso } from "../../../testes/supabase-falso";

const banco = vi.hoisted(() => ({ cliente: null as unknown }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));

const LEAD_A = "d0000000-0000-4000-8000-00000000000a";
const LEAD_B = "d0000000-0000-4000-8000-00000000000b";

type Passo = { metodo: string; argumentos: unknown[] };

function lead(id: string, campos: Record<string, unknown> = {}) {
  return {
    id,
    nome: `Lead ${id.slice(-1)}`,
    telefone: null,
    email: null,
    origem: "Instagram",
    campanha: null,
    procedimento_interesse_id: null,
    paciente_id: null,
    etapa: "qualificado",
    motivo_perda: null,
    criado_em: "2026-09-10T13:00:00Z",
    atualizado_em: "2026-09-24T13:00:00Z",
    ultimo_contato_em: null,
    proximo_contato: null,
    ...campos,
  };
}

function temPasso(passos: Passo[], metodo: string, ...argumentos: unknown[]) {
  return passos.some(
    (p) => p.metodo === metodo && JSON.stringify(p.argumentos) === JSON.stringify(argumentos),
  );
}

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  // 25/09/2026, meio-dia em São Paulo.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T15:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("listarLeadsCaptacao — recortes", () => {
  it("sem recorte de atenção: a coorte do mês, mais recentes primeiro, 15 por página", async () => {
    const falso = supabaseFalso({ leads: { data: [], count: 0 } });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");
    const periodo = lerMes("2026-09");

    await listarLeadsCaptacao(periodo);

    const passos = falso.passosDe("leads");
    expect(temPasso(passos, "gte", "criado_em", periodo.de.toISOString())).toBe(true);
    expect(temPasso(passos, "lt", "criado_em", periodo.ate.toISOString())).toBe(true);
    expect(temPasso(passos, "order", "criado_em", { ascending: false })).toBe(true);
    expect(temPasso(passos, "range", 0, 14)).toBe(true);
    // Página vazia: nada de ida ao banco por histórico ou contato.
    expect(falso.passosDe("lead_etapas")).toHaveLength(0);
    expect(falso.passosDe("lead_interacoes")).toHaveLength(0);
  });

  it("parados: só abertos da coorte, 3+ dias sem movimento, o mais antigo primeiro", async () => {
    const falso = supabaseFalso({ leads: { data: [], count: 0 } });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await listarLeadsCaptacao(lerMes("2026-09"), "", "todos", 1, "", "", "parados");

    const passos = falso.passosDe("leads");
    expect(passos.some((p) => p.metodo === "gte" && p.argumentos[0] === "criado_em")).toBe(true);
    // Três dias de calendário: antes do começo do dia 23 (dia da clínica).
    expect(temPasso(passos, "lt", "atualizado_em", "2026-09-23T03:00:00.000Z")).toBe(true);
    expect(temPasso(passos, "not", "etapa", "in", "(ganho,perdido)")).toBe(true);
    expect(temPasso(passos, "order", "atualizado_em", { ascending: true })).toBe(true);
  });

  it("retorno hoje: a carteira aberta inteira, com o dia da clínica", async () => {
    const falso = supabaseFalso({ leads: { data: [], count: 0 } });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await listarLeadsCaptacao(lerMes("2026-08"), "", "todos", 1, "", "", "retorno_hoje");

    const passos = falso.passosDe("leads");
    expect(temPasso(passos, "eq", "proximo_contato", "2026-09-25")).toBe(true);
    expect(temPasso(passos, "not", "etapa", "in", "(ganho,perdido)")).toBe(true);
    // O mês de entrada não recorta retorno: o de agosto vence hoje também.
    expect(passos.some((p) => p.argumentos[0] === "criado_em" && (p.metodo === "gte" || p.metodo === "lt"))).toBe(false);
  });

  it("retorno atrasado: data antes de hoje, o mais atrasado primeiro", async () => {
    const falso = supabaseFalso({ leads: { data: [], count: 0 } });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await listarLeadsCaptacao(lerMes("2026-09"), "", "todos", 1, "", "", "retorno_atrasado");

    const passos = falso.passosDe("leads");
    expect(temPasso(passos, "lt", "proximo_contato", "2026-09-25")).toBe(true);
    expect(temPasso(passos, "not", "etapa", "in", "(ganho,perdido)")).toBe(true);
    const ordens = passos.filter((p) => p.metodo === "order").map((p) => p.argumentos[0]);
    expect(ordens).toEqual(["proximo_contato", "criado_em", "id"]);
  });

  it("o dia da clínica vale perto da meia-noite: 23h30 de 25/09 ainda é dia 25", async () => {
    vi.setSystemTime(new Date("2026-09-26T02:30:00Z"));
    const falso = supabaseFalso({ leads: { data: [], count: 0 } });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await listarLeadsCaptacao(lerMes("2026-09"), "", "todos", 1, "", "", "retorno_hoje");

    expect(temPasso(falso.passosDe("leads"), "eq", "proximo_contato", "2026-09-25")).toBe(true);
  });

  it("etapa, origem, campanha e busca combinam; operador na busca não vira filtro", async () => {
    const falso = supabaseFalso({ leads: { data: [], count: 0 } });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await listarLeadsCaptacao(
      lerMes("2026-09"),
      "ana,etapa.eq.ganho)",
      "agendamento",
      1,
      "Instagram",
      "Botox setembro",
      "retorno_hoje",
    );

    const passos = falso.passosDe("leads");
    expect(temPasso(passos, "eq", "etapa", "agendamento")).toBe(true);
    expect(temPasso(passos, "eq", "origem", "Instagram")).toBe(true);
    expect(temPasso(passos, "eq", "campanha", "Botox setembro")).toBe(true);
    expect(temPasso(passos, "eq", "proximo_contato", "2026-09-25")).toBe(true);
    const ou = passos.find((p) => p.metodo === "or")?.argumentos[0] as string;
    // Vírgula e parêntese saem do termo: ele não abre um filtro novo no `or`.
    expect(ou.split(",")).toHaveLength(4);
    expect(ou).toContain("nome.ilike.%ana etapa.eq.ganho%");
  });
});

describe("listarLeadsCaptacao — paginação", () => {
  it("página além da última (URL manipulada) recua para a última válida", async () => {
    const falso = supabaseFalso({
      leads: [
        { error: { code: "PGRST103", message: "Requested range not satisfiable" } },
        { data: null, count: 20 },
        { data: [lead(LEAD_A)], count: 20 },
      ],
    });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    const r = await listarLeadsCaptacao(lerMes("2026-09"), "", "todos", 999);

    expect(r.pagina).toBe(2);
    expect(r.paginas).toBe(2);
    expect(r.total).toBe(20);
    expect(r.itens.map((item) => item.id)).toEqual([LEAD_A]);
    expect(temPasso(falso.passosDe("leads", 2), "range", 15, 29)).toBe(true);
  });

  it("falha que não é de página vira tela de erro", async () => {
    banco.cliente = supabaseFalso({ leads: { error: { code: "XX000", message: "falha simulada" } } }).cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await expect(listarLeadsCaptacao(lerMes("2026-09"))).rejects.toThrow("Não foi possível carregar a carteira de leads.");
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta captação: carteira", "XX000"));
  });
});

describe("listarLeadsCaptacao — acompanhamento de cada lead", () => {
  it("contatos em lote, agrupados por lead, os mais recentes primeiro, com o total", async () => {
    const contatosA = Array.from({ length: 10 }, (_, i) => ({
      id: 100 - i,
      lead_id: LEAD_A,
      canal: i === 0 ? "canal-que-nao-existe" : "telefone",
      observacao: `Contato ${10 - i}`,
      proximo_contato: i === 0 ? "2026-09-25" : null,
      em: `2026-09-${String(24 - i).padStart(2, "0")}T14:00:00Z`,
    }));
    const falso = supabaseFalso({
      leads: {
        data: [
          lead(LEAD_A, { ultimo_contato_em: "2026-09-24T14:00:00Z", proximo_contato: "2026-09-25" }),
          lead(LEAD_B, { proximo_contato: "2026-09-22" }),
        ],
        count: 2,
      },
      lead_etapas: { data: [{ lead_id: LEAD_A, de: "novo", para: "qualificado", motivo: null, em: "2026-09-11T13:00:00Z" }] },
      lead_interacoes: {
        data: [...contatosA, { id: 5, lead_id: LEAD_B, canal: "whatsapp", observacao: null, proximo_contato: "2026-09-22", em: "2026-09-20T12:00:00Z" }],
      },
    });
    banco.cliente = falso.cliente;
    const { listarLeadsCaptacao, INTERACOES_POR_LEAD } = await import("./captacao-leads");

    const r = await listarLeadsCaptacao(lerMes("2026-09"));
    const [a, b] = r.itens;

    // Uma ida ao banco para a página inteira, lida em blocos e em ordem estável.
    expect(falso.chamadas.filter((c) => c.alvo === "lead_interacoes")).toHaveLength(1);
    const passos = falso.passosDe("lead_interacoes");
    expect(temPasso(passos, "in", "lead_id", [LEAD_A, LEAD_B])).toBe(true);
    expect(temPasso(passos, "order", "em", { ascending: false })).toBe(true);
    expect(temPasso(passos, "order", "id", { ascending: false })).toBe(true);
    expect(temPasso(passos, "range", 0, 499)).toBe(true);

    expect(a.totalInteracoes).toBe(10);
    expect(a.interacoes).toHaveLength(INTERACOES_POR_LEAD);
    expect(a.interacoes[0]).toMatchObject({ id: 100, canal: "outro", observacao: "Contato 10" });
    expect(a.interacoes[0].proximoContato?.toISOString()).toBe("2026-09-25T03:00:00.000Z");
    expect(a.ultimoContatoEm?.toISOString()).toBe("2026-09-24T14:00:00.000Z");
    expect(a).toMatchObject({ retornoHoje: true, retornoAtrasado: false, diasParaRetorno: 0 });
    expect(a.historico).toHaveLength(1);

    expect(b.totalInteracoes).toBe(1);
    expect(b).toMatchObject({ retornoHoje: false, retornoAtrasado: true, diasParaRetorno: -3 });
    expect(b.ultimoContatoEm).toBeNull();
  });

  it("lead encerrado não tem retorno, nem com data velha no resumo", async () => {
    banco.cliente = supabaseFalso({
      leads: {
        data: [
          lead(LEAD_A, { etapa: "ganho", proximo_contato: "2026-09-20" }),
          lead(LEAD_B, { etapa: "perdido", motivo_perda: "Preço", proximo_contato: "2026-09-25" }),
        ],
        count: 2,
      },
    }).cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    const r = await listarLeadsCaptacao(lerMes("2026-09"));
    for (const item of r.itens) {
      expect(item).toMatchObject({ proximoContato: null, diasParaRetorno: null, retornoHoje: false, retornoAtrasado: false });
    }
  });

  it("falha ao ler os contatos vira tela de erro, não histórico vazio", async () => {
    banco.cliente = supabaseFalso({
      leads: { data: [lead(LEAD_A)], count: 1 },
      lead_interacoes: { error: { code: "XX000", message: "falha simulada" } },
    }).cliente;
    const { listarLeadsCaptacao } = await import("./captacao-leads");

    await expect(listarLeadsCaptacao(lerMes("2026-09"))).rejects.toThrow(
      "Não foi possível carregar o histórico comercial dos leads.",
    );
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta captação: contatos da carteira", "XX000"));
  });
});
