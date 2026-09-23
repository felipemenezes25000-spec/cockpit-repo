import { describe, expect, it } from "vitest";
import {
  erroParaRegistro,
  estruturaAusente,
  MENSAGEM_CONEXAO,
  MENSAGEM_ESTRUTURA,
  MENSAGEM_PERMISSAO,
  mensagemDoBanco,
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
