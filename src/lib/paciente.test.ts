import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dataDoBanco } from "./dates";
import {
  cpfValido,
  diasAteAniversario,
  formatarCpf,
  formatarEndereco,
  formatarTelefone,
  idadeEm,
  lerEndereco,
  linkWhatsapp,
  nomeExibido,
  normalizarPaciente,
  PACIENTE_EM_BRANCO,
  paraOBanco,
  telefoneValido,
  validarPaciente,
  type ValoresPaciente,
} from "./paciente";

const paciente = (mudancas: Partial<ValoresPaciente>) =>
  normalizarPaciente({ ...PACIENTE_EM_BRANCO, nome: "Ana Maria Souza", ...mudancas });

describe("CPF", () => {
  it("confere os dois dígitos verificadores", () => {
    expect(cpfValido("529.982.247-25")).toBe(true);
    expect(cpfValido("52998224725")).toBe(true);
    expect(cpfValido("529.982.247-26")).toBe(false);
    expect(cpfValido("529.982.247-35")).toBe(false);
  });

  it("recusa sequência de um dígito só e tamanho errado", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
    expect(cpfValido("000.000.000-00")).toBe(false);
    expect(cpfValido("5299822472")).toBe(false);
  });

  it("formata para leitura", () => {
    expect(formatarCpf("52998224725")).toBe("529.982.247-25");
  });
});

describe("telefone", () => {
  it("celular com 9, fixo com 10 dígitos, DDD a partir de 11", () => {
    expect(telefoneValido("(11) 98765-4321")).toBe(true);
    expect(telefoneValido("(11) 3456-7890")).toBe(true);
    expect(telefoneValido("(11) 88765-4321")).toBe(false);
    expect(telefoneValido("(09) 3456-7890")).toBe(false);
    expect(telefoneValido("98765-4321")).toBe(false);
  });

  it("formata e monta o link do WhatsApp com o código do país", () => {
    expect(formatarTelefone("11987654321")).toBe("(11) 98765-4321");
    expect(formatarTelefone("1134567890")).toBe("(11) 3456-7890");
    expect(formatarTelefone("123")).toBe("123");
    expect(linkWhatsapp("(11) 98765-4321")).toContain("5511987654321");
    expect(linkWhatsapp("123")).toBeNull();
    expect(linkWhatsapp(null)).toBeNull();
  });
});

describe("validarPaciente — a regra do cadastro, da tela e da importação", () => {
  it("só o nome é obrigatório", () => {
    expect(validarPaciente(paciente({}))).toEqual({});
    expect(validarPaciente(paciente({ nome: "Al" }))).toHaveProperty("nome");
  });

  it("recusa data de nascimento que não existe no calendário", () => {
    expect(validarPaciente(paciente({ data_nascimento: "1990-02-31" }))).toEqual({
      data_nascimento: "Data inválida.",
    });
    expect(validarPaciente(paciente({ data_nascimento: "1991-02-29" }))).toEqual({
      data_nascimento: "Data inválida.",
    });
    expect(validarPaciente(paciente({ data_nascimento: "1992-02-29" }))).toEqual({});
  });

  it("recusa nascimento no futuro e ano anterior a 1900", () => {
    expect(validarPaciente(paciente({ data_nascimento: "2099-01-01" })).data_nascimento).toMatch(/futuro/);
    expect(validarPaciente(paciente({ data_nascimento: "2999-01-01" })).data_nascimento).toBe("Data inválida.");
    expect(validarPaciente(paciente({ data_nascimento: "1850-06-01" })).data_nascimento).toMatch(/ano/);
  });

  it("valida o que foi informado, sem exigir", () => {
    const erros = validarPaciente(
      paciente({ cpf: "123", telefone: "12", email: "a@b", uf: "XX" }),
    );
    expect(Object.keys(erros).sort()).toEqual(["cpf", "email", "telefone", "uf"]);
  });

  it("normaliza para o formato do banco", () => {
    const v = paciente({
      cpf: "529.982.247-25",
      telefone: "(11) 98765-4321",
      email: "  ANA@Clinica.COM ",
      uf: "sp",
      cep: "01310-100",
    });
    expect(v).toMatchObject({
      cpf: "52998224725",
      telefone: "11987654321",
      email: "ana@clinica.com",
      uf: "SP",
      cep: "01310100",
    });
    expect(paraOBanco(v)).toMatchObject({ cpf: "52998224725", nome_social: null });
  });
});

describe("apresentação", () => {
  it("nome social tem precedência", () => {
    expect(nomeExibido({ nome: "Maria da Silva", nome_social: " Mari " })).toBe("Mari");
    expect(nomeExibido({ nome: "Maria da Silva", nome_social: "  " })).toBe("Maria da Silva");
    expect(nomeExibido({ nome: "Maria da Silva", nome_social: null })).toBe("Maria da Silva");
  });

  it("endereço antigo fora do formato não quebra a ficha", () => {
    expect(lerEndereco(null).logradouro).toBe("");
    expect(lerEndereco("texto solto").cidade).toBe("");
    expect(lerEndereco({ logradouro: "Rua A", numero: 10, cidade: "SP" }).logradouro).toBe("Rua A");
    expect(formatarEndereco(lerEndereco({ logradouro: "Rua A", numero: "10", cidade: "São Paulo", uf: "SP" }))).toContain(
      "Rua A",
    );
  });
});

describe("idade e aniversário no calendário da clínica", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-22T15:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("idade só completa no dia", () => {
    expect(idadeEm(dataDoBanco("1990-09-22"))).toBe(36);
    expect(idadeEm(dataDoBanco("1990-09-23"))).toBe(35);
  });

  it("dias até o próximo aniversário", () => {
    const hoje = dataDoBanco("2026-09-22");
    expect(diasAteAniversario(dataDoBanco("1990-09-22"), hoje)).toBe(0);
    expect(diasAteAniversario(dataDoBanco("1990-09-30"), hoje)).toBe(8);
    expect(diasAteAniversario(dataDoBanco("1990-09-21"), hoje)).toBe(364);
  });
});
