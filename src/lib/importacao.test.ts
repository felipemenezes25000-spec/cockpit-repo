import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decodificar, detectarSeparador, formatoNaoSuportado, gerarCsv, lerCsv } from "./csv";
import {
  analisarPlanilha,
  interpretarDataBr,
  LIMITE_DE_LINHAS,
  mapearColunas,
  normalizarRotulo,
} from "./importacao";

const utf8 = (texto: string) => new TextEncoder().encode(texto);

/** Windows-1252 à mão: os acentos do português ficam todos abaixo de 0x100. */
function latin1(texto: string): Uint8Array {
  return Uint8Array.from([...texto].map((c) => c.charCodeAt(0)));
}

describe("leitor de CSV", () => {
  it("UTF-8 primeiro; Windows-1252 quando o UTF-8 não fecha", () => {
    expect(decodificar(utf8("Conceição"))).toEqual({ texto: "Conceição", codificacao: "utf-8" });
    expect(decodificar(latin1("Conceição"))).toEqual({ texto: "Conceição", codificacao: "windows-1252" });
  });

  it("detecta o separador contando fora das aspas", () => {
    expect(detectarSeparador('Nome;Endereço\n"Ana";"Rua X, 100"')).toBe(";");
    expect(detectarSeparador("Nome,Telefone\nAna,11")).toBe(",");
    expect(detectarSeparador('"Rua A, 1, 2, 3";Nome;CPF')).toBe(";");
  });

  it("aspas protegem separador, quebra de linha e aspa duplicada", () => {
    const planilha = lerCsv(utf8('Nome;Obs\n"Ana; Maria";"linha 1\nlinha 2"\n"Bia";"disse ""oi"""\n\n;\n'));
    expect(planilha.cabecalho).toEqual(["Nome", "Obs"]);
    expect(planilha.linhas).toEqual([
      ["Ana; Maria", "linha 1\nlinha 2"],
      ["Bia", 'disse "oi"'],
    ]);
  });

  it("remove o BOM do Excel e aceita CRLF", () => {
    const planilha = lerCsv(utf8("﻿Nome;CPF\r\nAna;123\r\n"));
    expect(planilha.cabecalho).toEqual(["Nome", "CPF"]);
    expect(planilha.linhas).toEqual([["Ana", "123"]]);
  });

  it("gera o arquivo-modelo escapando o que precisa", () => {
    expect(gerarCsv([["Nome", "Obs"], ["Ana", 'a;b "c"']])).toBe('Nome;Obs\r\nAna;"a;b ""c"""');
  });
});

describe("colunas pelo nome, sem acento nem maiúscula", () => {
  it("normaliza o rótulo", () => {
    expect(normalizarRotulo("  Data de Nascimento ")).toBe(normalizarRotulo("data de nascimento"));
    expect(normalizarRotulo("Endereço")).toBe(normalizarRotulo("endereco"));
  });

  it("coluna desconhecida é listada como ignorada, não faz falhar", () => {
    const mapa = mapearColunas(["Nome", "CPF", "Coluna misteriosa"]);
    expect(mapa.indices.nome).toBe(0);
    expect(mapa.indices.cpf).toBe(1);
    expect(mapa.ignoradas).toContain("Coluna misteriosa");
  });
});

describe("data como a planilha escreve", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    ["22/09/1990", "1990-09-22"],
    ["2/9/1990", "1990-09-02"],
    ["22-09-1990", "1990-09-22"],
    ["22.09.1990", "1990-09-22"],
    ["1990-09-22", "1990-09-22"],
    ["29/02/1992", "1992-02-29"],
  ])("%s vira %s", (bruto, iso) => {
    expect(interpretarDataBr(bruto)?.iso).toBe(iso);
  });

  it.each(["31/02/1990", "29/02/1991", "00/01/1990", "1990-13-01", "abc", ""])("recusa %j", (bruto) => {
    expect(interpretarDataBr(bruto)).toBeNull();
  });

  it("ano com dois dígitos entra com aviso para conferir", () => {
    expect(interpretarDataBr("01/02/65")).toMatchObject({ iso: "1965-02-01" });
    expect(interpretarDataBr("01/02/65")?.aviso).toMatch(/1965/);
    expect(interpretarDataBr("01/02/10")?.iso).toBe("2010-02-01");
  });
});

describe("análise da planilha — nada é gravado aqui", () => {
  it("usa a mesma validação do cadastro e marca CPF repetido no arquivo", () => {
    const analise = analisarPlanilha(
      utf8(
        [
          "Nome;CPF;Nascimento;Telefone",
          "Ana Maria;529.982.247-25;22/09/1990;(11) 98765-4321",
          "Ana Maria de Novo;52998224725;01/01/1991;",
          "Bia;123;31/02/1990;",
        ].join("\n"),
      ),
    );

    expect(analise.falha).toBeNull();
    const [primeira, repetida, invalida] = analise.linhas;
    expect(primeira.erros).toEqual([]);
    expect(repetida.erros.join(" ")).toMatch(/CPF repetido na linha 2/);
    expect(invalida.erros.join(" ")).toMatch(/CPF/);
    expect(invalida.erros.join(" ")).toMatch(/não foi reconhecida/);
    expect(invalida.avisos.join(" ")).toMatch(/Só um nome/);
  });

  it("CEP fora dos 8 números recusa a linha, como no cadastro manual — sem completar nem apagar", () => {
    const analise = analisarPlanilha(
      utf8(
        [
          "Nome;CEP;Telefone",
          "Ana Maria;2204000;11987654321",
          "Bia Souza;0131;11987654321",
          "Carla Lima;01310-100;11987654321",
        ].join("\n"),
      ),
    );

    const [seteDigitos, curto, certo] = analise.linhas;
    expect(seteDigitos.erros.join(" ")).toMatch(/CEP: CEP inválido/);
    expect(seteDigitos.valores.cep).toBe("2204000");
    expect(curto.erros.join(" ")).toMatch(/CEP: CEP inválido/);
    expect(certo.erros).toEqual([]);
    expect(certo.valores.cep).toBe("01310100");
  });

  it("sem coluna de nome, falha com instrução", () => {
    expect(analisarPlanilha(utf8("CPF;Telefone\n123;456")).falha).toMatch(/coluna do nome/);
  });

  it("arquivo vazio", () => {
    expect(analisarPlanilha(utf8("")).falha).toMatch(/vazio/);
  });
});

describe("arquivo malformado ou que não é CSV", () => {
  it("aspa aberta e nunca fechada falha dizendo a linha, em vez de engolir o resto", () => {
    const texto = ["Nome;Obs", "Ana Maria;ok", 'Bia Souza;"sem fechar', "Carla Dias;ok"].join("\n");
    expect(lerCsv(utf8(texto)).aspaSemFechar).toBe(3);

    const analise = analisarPlanilha(utf8(texto));
    expect(analise.falha).toMatch(/linha 3.*aspas/);
    expect(analise.linhas).toEqual([]);
  });

  it("aspas bem fechadas não disparam o aviso", () => {
    expect(lerCsv(utf8('Nome;Obs\n"Ana";"disse ""oi"""')).aspaSemFechar).toBeNull();
  });

  it("recusa planilha do Excel, UTF-16 e binário com instrução", () => {
    const xlsx = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    const xls = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1]);
    const utf16 = Uint8Array.from([0xff, 0xfe, 0x4e, 0x00, 0x6f, 0x00]);
    const binario = Uint8Array.from([0x4e, 0x6f, 0x00, 0x6d]);

    expect(formatoNaoSuportado(xlsx)).toMatch(/Excel.*CSV UTF-8/);
    expect(formatoNaoSuportado(xls)).toMatch(/Excel/);
    expect(formatoNaoSuportado(utf16)).toMatch(/UTF-16/);
    expect(formatoNaoSuportado(binario)).toMatch(/não parece ser um CSV/);
    expect(formatoNaoSuportado(utf8("Nome;CPF\nAna;1"))).toBeNull();

    expect(analisarPlanilha(xlsx).falha).toMatch(/Excel/);
  });

  it("windows-1252 com acento chega inteiro à análise", () => {
    const analise = analisarPlanilha(latin1("Nome;Endereço\nConceição Araújo;Rua São João"));
    expect(analise.codificacao).toBe("windows-1252");
    expect(analise.linhas[0].valores.nome).toBe("Conceição Araújo");
    expect(analise.mapa.rotulos.logradouro).toBe("Endereço");
  });

  it("separador vírgula e tabulação também servem", () => {
    const virgula = analisarPlanilha(utf8('Nome,Cidade\n"Ana Maria","São Paulo, SP"'));
    expect(virgula.separador).toBe(",");
    expect(virgula.linhas[0].valores.cidade).toBe("São Paulo, SP");

    const tab = analisarPlanilha(utf8("Nome\tCidade\nAna Maria\tCampinas"));
    expect(tab.separador).toBe("\t");
    expect(tab.linhas[0].valores.cidade).toBe("Campinas");
  });

  it("valor além do cabeçalho vira erro da linha (separador sem aspas desloca colunas)", () => {
    const analise = analisarPlanilha(
      utf8(["Nome,Rua,Cidade", "Ana Maria,Rua X, 100,Campinas", "Bia Souza,Rua Y,Santos,,"].join("\n")),
    );
    expect(analise.linhas[0].erros.join(" ")).toMatch(/além das 3 colunas/);
    // Célula vazia sobrando é só sobra do Excel.
    expect(analise.linhas[1].erros).toEqual([]);
  });

  it("acima do limite de linhas falha sem analisar nenhuma", () => {
    const linhas = Array.from({ length: LIMITE_DE_LINHAS + 1 }, (_, i) => `Pessoa ${i}`);
    const analise = analisarPlanilha(utf8(["Nome", ...linhas].join("\n")));
    expect(analise.falha).toMatch(new RegExp(`limite por importação é ${LIMITE_DE_LINHAS}`));
    expect(analise.linhas).toEqual([]);
  });

  it("no limite exato de linhas ainda analisa", () => {
    const linhas = Array.from({ length: LIMITE_DE_LINHAS }, (_, i) => `Pessoa ${i}`);
    expect(analisarPlanilha(utf8(["Nome", ...linhas].join("\n"))).falha).toBeNull();
  });
});
