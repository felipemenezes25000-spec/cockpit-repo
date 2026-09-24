import { describe, expect, it } from "vitest";
import {
  ORIGENS_TAREFA,
  ORIGENS_CONTATO,
  REGISTRO_CONTATO,
  TIPOS_CONTATO,
  linkWhatsApp,
  mensagemAniversario,
  mensagemConfirmacao,
  telefoneParaWhatsApp,
  tipoContatoDaOrigem,
} from "./relacionamento";

describe("telefoneParaWhatsApp", () => {
  it("aceita celular e fixo com ou sem o código do país", () => {
    expect(telefoneParaWhatsApp("(11) 98765-4321")).toBe("5511987654321");
    expect(telefoneParaWhatsApp("+55 11 98765-4321")).toBe("5511987654321");
    expect(telefoneParaWhatsApp("(11) 3456-7890")).toBe("551134567890");
    expect(telefoneParaWhatsApp("55 11 3456-7890")).toBe("551134567890");
  });

  it("não come o DDD 55 (RS) de telefone gravado sem código do país", () => {
    expect(telefoneParaWhatsApp("(55) 99123-4567")).toBe("5555991234567");
    expect(telefoneParaWhatsApp("(55) 3222-1234")).toBe("555532221234");
    expect(telefoneParaWhatsApp("+55 (55) 99123-4567")).toBe("5555991234567");
  });

  it("recusa o que não é telefone brasileiro", () => {
    expect(telefoneParaWhatsApp(null)).toBeNull();
    expect(telefoneParaWhatsApp("123")).toBeNull();
    expect(telefoneParaWhatsApp("+1 415 555 0100 99")).toBeNull();
  });
});

describe("linkWhatsApp", () => {
  it("só monta link wa.me com número limpo e texto codificado", () => {
    const link = linkWhatsApp("(11) 98765-4321", "Olá & até já?");
    expect(link).toBe("https://wa.me/5511987654321?text=Ol%C3%A1%20%26%20at%C3%A9%20j%C3%A1%3F");
    expect(new URL(link!).host).toBe("wa.me");
  });

  it("sem telefone válido não há link", () => {
    expect(linkWhatsApp("abc", "oi")).toBeNull();
  });
});

describe("mensagemConfirmacao", () => {
  it("usa o primeiro nome e traz dia e hora, sem o procedimento (dado de saúde)", () => {
    const texto = mensagemConfirmacao(" Otávia Bezerra ", "24/09/2026", "17:15");
    expect(texto).toMatch(/^Olá, Otávia!/);
    expect(texto).toContain("atendimento em 24/09/2026 às 17:15?");
  });
});

describe("mensagemAniversario", () => {
  it("usa só o primeiro nome", () => {
    expect(mensagemAniversario("  Maria Clara Souza ")).toMatch(/^Olá, Maria!/);
  });
});

describe("ORIGENS_TAREFA", () => {
  it("aberta conclui ou cancela; fechada só reabre", () => {
    expect(ORIGENS_TAREFA.resolvida).toEqual(["aberta"]);
    expect(ORIGENS_TAREFA.cancelada).toEqual(["aberta"]);
    expect(ORIGENS_TAREFA.aberta).toEqual(["resolvida", "cancelada"]);
  });
});

describe("registro de contato pela origem (0025)", () => {
  it("cada contato tem origem própria, e a origem leva de volta ao contato", () => {
    expect(ORIGENS_CONTATO).toEqual(["contato_avaliacao", "contato_aniversario"]);
    for (const tipo of TIPOS_CONTATO) {
      expect(tipoContatoDaOrigem(REGISTRO_CONTATO[tipo].origem)).toBe(tipo);
    }
  });

  it("tarefa não é registro de contato, qualquer que seja o texto", () => {
    expect(tipoContatoDaOrigem("tarefa")).toBeNull();
  });

  it("origem e tipo combinam como a constraint do banco (pendencias_origem_coerente)", () => {
    expect(REGISTRO_CONTATO.avaliacao).toMatchObject({ origem: "contato_avaliacao", tipo: "pesquisa" });
    expect(REGISTRO_CONTATO.aniversario).toMatchObject({ origem: "contato_aniversario", tipo: "outro" });
  });
});
