import { describe, expect, it } from "vitest";
import { lerDuracao, PROXIMAS_SITUACOES, SITUACOES_VALIDAS, situacaoValida, VERBO_SITUACAO } from "./atendimento";
import { dataDaBusca, termoDeBusca } from "./busca";
import { despesaVencida, validarDespesa, DESPESA_EM_BRANCO } from "./despesa";
import { lerRetorno, validarProcedimento } from "./procedimento";
import { campoTexto, uuidValido, valoresDigitados } from "./formulario";
import {
  mensagemAvaliacao,
  telefoneParaWhatsApp,
  validarRetorno,
  validarTarefa,
} from "./relacionamento";

describe("agenda", () => {
  it("toda situação tem caminho e verbo — o Record obriga", () => {
    expect(SITUACOES_VALIDAS).toHaveLength(7);
    for (const s of SITUACOES_VALIDAS) {
      expect(VERBO_SITUACAO[s]).toBeTruthy();
      for (const proxima of PROXIMAS_SITUACOES[s]) expect(SITUACOES_VALIDAS).toContain(proxima);
    }
  });

  it("situação válida é só a do enum", () => {
    expect(situacaoValida("confirmado")).toBe(true);
    expect(situacaoValida("remarcado")).toBe(false);
  });

  it("cancelado e ausente só reabrem como agendado; concluído não tem próximo", () => {
    expect(PROXIMAS_SITUACOES.cancelado).toEqual(["agendado"]);
    expect(PROXIMAS_SITUACOES.ausente).toEqual(["agendado"]);
    expect(PROXIMAS_SITUACOES.concluido).toEqual([]);
  });

  it("duração de 5 a 480 minutos, inteira", () => {
    expect(lerDuracao("5")).toBe(5);
    expect(lerDuracao("480")).toBe(480);
    expect(lerDuracao("4")).toBeNull();
    expect(lerDuracao("481")).toBeNull();
    expect(lerDuracao("30.5")).toBeNull();
    expect(lerDuracao("")).toBeNull();
  });
});

describe("busca", () => {
  it("tira a gramática do PostgREST e os curingas do ilike", () => {
    expect(termoDeBusca(' Ana, (Maria) "x" \\ 50% _ * ')).toBe("Ana Maria x 50");
    expect(termoDeBusca("a".repeat(200))).toHaveLength(80);
  });

  it("reconhece data no calendário da clínica", () => {
    expect(dataDaBusca("22/09/2026")).toBe("2026-09-22");
    expect(dataDaBusca("2026-09-22")).toBe("2026-09-22");
    expect(dataDaBusca("31/02/2026")).toBeNull();
    expect(dataDaBusca("Ana")).toBeNull();
  });
});

describe("despesa", () => {
  const base = { ...DESPESA_EM_BRANCO, descricao: "Aluguel", valor: "1.500,00", vencimento: "2026-09-10" };

  it("valida e devolve centavos", () => {
    expect(validarDespesa(base)).toEqual({
      campos: {
        descricao: "Aluguel",
        categoria: "outros",
        valorCent: 150_000,
        vencimento: "2026-09-10",
        observacoes: null,
      },
    });
  });

  it("recusa vencimento que não existe e valor zero", () => {
    const r = validarDespesa({ ...base, vencimento: "2026-02-31", valor: "0" });
    expect("erros" in r && r.erros).toMatchObject({
      vencimento: "Data de vencimento inválida.",
      valor: expect.any(String),
    });
  });

  it("vencida é derivada: pendente com prazo no passado", () => {
    expect(despesaVencida("pendente", -1)).toBe(true);
    expect(despesaVencida("pendente", 0)).toBe(false);
    expect(despesaVencida("paga", -30)).toBe(false);
  });
});

describe("procedimento", () => {
  it("retorno vazio é sem retorno; preenchido vai de 1 a 3650 dias", () => {
    expect(lerRetorno("")).toBeNull();
    expect(lerRetorno("90")).toBe(90);
    expect(lerRetorno("0")).toBeUndefined();
    expect(lerRetorno("3651")).toBeUndefined();
  });

  it("valida e converte", () => {
    expect(
      validarProcedimento({ nome: "Peeling", duracao_min: "45", valor_padrao: "350,00", retorno_sugerido_dias: "" }),
    ).toEqual({ campos: { nome: "Peeling", duracao_min: 45, valor_padrao: 350, retorno_sugerido_dias: null } });
    const r = validarProcedimento({ nome: "P", duracao_min: "3", valor_padrao: "1.2.3", retorno_sugerido_dias: "x" });
    expect("erros" in r && Object.keys(r.erros).sort()).toEqual([
      "duracao_min",
      "nome",
      "retorno_sugerido_dias",
      "valor_padrao",
    ]);
  });
});

describe("relacionamento", () => {
  it("tarefa e retorno", () => {
    expect(validarTarefa({ tipo: "outro", prioridade: "alta", descricao: "Ligar", prazo: "2026-02-30" })).toMatchObject({
      erros: { prazo: expect.any(String) },
    });
    expect(
      validarTarefa({ tipo: "outro", prioridade: "alta", descricao: "Ligar para confirmar", prazo: "" }),
    ).toMatchObject({ campos: { prazo: null, paciente_id: null } });
    expect(validarRetorno({ paciente_id: "x", sugerido_para: "2026-09-31" })).toMatchObject({
      erros: { paciente_id: expect.any(String), sugerido_para: expect.any(String) },
    });
  });

  it("WhatsApp com código do país e mensagem pelo primeiro nome", () => {
    expect(telefoneParaWhatsApp("(11) 98765-4321")).toBe("5511987654321");
    expect(telefoneParaWhatsApp("+55 11 98765-4321")).toBe("5511987654321");
    expect(telefoneParaWhatsApp("123")).toBeNull();
    expect(mensagemAvaliacao("Ana Maria", "https://exemplo")).toMatch(/^Olá, Ana!/);
  });
});

describe("leitura do formulário nas ações", () => {
  it("corta e limpa o texto; campo ausente é vazio", () => {
    const dados = new FormData();
    dados.set("nome", "  Ana  ");
    dados.set("longo", "x".repeat(50));
    expect(campoTexto(dados, "nome")).toBe("Ana");
    expect(campoTexto(dados, "longo", 10)).toHaveLength(10);
    expect(campoTexto(dados, "ausente")).toBe("");
  });

  it("devolve o que foi digitado, sem os campos internos do Next", () => {
    const dados = new FormData();
    dados.set("nome", "Ana");
    dados.set("$ACTION_ID_abc", "1");
    expect(valoresDigitados(dados)).toEqual({ nome: "Ana" });
  });

  it("UUID em qualquer versão, só no formato canônico", () => {
    expect(uuidValido("c0000000-0000-4000-8000-000000000001")).toBe(true);
    expect(uuidValido("C0000000-0000-4000-8000-000000000001")).toBe(true);
    expect(uuidValido("c0000000-0000-4000-8000-00000000000")).toBe(false);
    expect(uuidValido(42)).toBe(false);
  });
});
