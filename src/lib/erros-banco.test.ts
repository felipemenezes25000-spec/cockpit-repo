import { describe, expect, it } from "vitest";
import {
  CABECALHO_ID_REQUISICAO,
  erroParaRegistro,
  estruturaAusente,
  idDeCorrelacao,
  MENSAGEM_CONEXAO,
  MENSAGEM_ESTRUTURA,
  MENSAGEM_PERMISSAO,
  mensagemDoBanco,
  sanitizarParaRegistro,
} from "./erros-banco";

const PADRAO = "Não foi possível salvar.";

describe("mensagemDoBanco — nada do Postgres chega à tela", () => {
  it("sem erro, a frase padrão", () => {
    expect(mensagemDoBanco(null, PADRAO)).toBe(PADRAO);
  });

  it("frase nossa de raise exception passa", () => {
    expect(mensagemDoBanco({ code: "P0001", message: "Modelo fora de uso" }, PADRAO)).toBe("Modelo fora de uso");
    expect(
      mensagemDoBanco({ code: "42501", message: "No próprio perfil só o nome pode ser alterado." }, PADRAO),
    ).toBe("No próprio perfil só o nome pode ser alterado.");
  });

  it("mensagem técnica com P0001 não passa", () => {
    expect(mensagemDoBanco({ code: "P0001", message: 'relation "x" does not exist' }, PADRAO)).toBe(PADRAO);
  });

  it("permissão do Postgres vira frase neutra, sem dizer a tabela", () => {
    const frase = mensagemDoBanco(
      { code: "42501", message: 'new row violates row-level security policy for table "recebimentos"' },
      PADRAO,
    );
    expect(frase).toBe(MENSAGEM_PERMISSAO);
    expect(frase).not.toMatch(/recebimentos|policy/);
  });

  it("violação conhecida vira frase do domínio quando o contexto pede", () => {
    const erro = {
      code: "23505",
      message: 'duplicate key value violates unique constraint "pacientes_cpf_unico"',
      details: "Key (cpf)=(52998224725) already exists.",
    };
    expect(mensagemDoBanco(erro, PADRAO, { "23505": "CPF já cadastrado." })).toBe("CPF já cadastrado.");
    expect(mensagemDoBanco(erro, PADRAO)).toBe("Já existe um registro igual a este.");
  });

  it("choque de horário do gatilho da 0021", () => {
    expect(mensagemDoBanco({ code: "23P01", message: "Choque de horário" }, PADRAO)).toMatch(/horário/);
  });

  it("estrutura ausente e falha de rede têm frase própria", () => {
    expect(mensagemDoBanco({ code: "PGRST205", message: "Could not find the table" }, PADRAO)).toBe(MENSAGEM_ESTRUTURA);
    expect(estruturaAusente({ message: "... in the schema cache" })).toBe(true);
    expect(mensagemDoBanco({ message: "TypeError: fetch failed" }, PADRAO)).toBe(MENSAGEM_CONEXAO);
  });

  it("código desconhecido cai na frase padrão", () => {
    expect(mensagemDoBanco({ code: "XX000", message: "internal error" }, PADRAO)).toBe(PADRAO);
  });
});

describe("erroParaRegistro — o log não guarda dado de paciente", () => {
  it("tira valores entre aspas e o que vem depois de =", () => {
    const { codigo, mensagem } = erroParaRegistro({
      code: "22007",
      message: 'invalid input syntax for type date: "1990-02-31"',
      details: "Key (cpf)=(52998224725)",
    });
    expect(codigo).toBe("22007");
    expect(mensagem).not.toContain("1990-02-31");
    expect(mensagem).not.toContain("52998224725");
  });

  it("não inclui details", () => {
    expect(JSON.stringify(erroParaRegistro({ code: "23505", message: "x", details: "Key (cpf)=(1)" }))).not.toContain(
      "Key",
    );
  });
});

describe("sanitizarParaRegistro — texto solto de serviço também sai limpo", () => {
  it.each([
    ["e-mail", "User ana.clara+teste@clinica.com.br not found", "ana.clara"],
    ["JWT", "invalid JWT eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc_DEF-123 expired", "eyJ"],
    ["Bearer", "Authorization: Bearer sb-abc.def.ghi rejected", "sb-abc"],
    ["token de link", "token 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08 inválido", "9f86d081"],
    ["CPF pontuado", "cpf 529.982.247-25 duplicado", "529.982"],
    ["CPF cru", "cpf 52998224725 duplicado", "52998224725"],
    ["telefone", "telefone (11) 98765-4321 inválido", "98765"],
    ["data", "nascimento 1990-02-31 fora do calendário", "1990-02-31"],
    ["data BR", "nascimento 31/02/1990 fora do calendário", "31/02/1990"],
  ])("tira %s", (_rotulo, entrada, proibido) => {
    expect(sanitizarParaRegistro(entrada)).not.toContain(proibido);
  });

  it("uma entrada é uma linha: quebra de linha não forja outra entrada", () => {
    expect(sanitizarParaRegistro("falhou\r\n[cockpit] login: tudo certo")).not.toMatch(/[\r\n]/);
  });

  it("mantém o que ajuda a investigar", () => {
    expect(sanitizarParaRegistro("permission denied for table pacientes")).toBe(
      "permission denied for table pacientes",
    );
    expect(sanitizarParaRegistro("value too long for type character varying(255)")).toContain("(255)");
  });

  it("erroParaRegistro passa a mensagem pela mesma limpeza", () => {
    const { mensagem } = erroParaRegistro({ message: "fetch failed para ana@clinica.com, cpf 52998224725" });
    expect(mensagem).not.toContain("ana@clinica.com");
    expect(mensagem).not.toContain("52998224725");
    expect(mensagem).toContain("fetch failed");
  });
});

describe("idDeCorrelacao", () => {
  it("é curto, opaco e muda a cada operação", () => {
    const a = idDeCorrelacao();
    const b = idDeCorrelacao();
    expect(a).toMatch(/^[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
    expect(CABECALHO_ID_REQUISICAO).toBe("x-id-requisicao");
  });
});
