import { diferencaEmDias, instanteNaClinica, partesDoDia } from "./dates";

/**
 * Regras da paciente que valem nos dois lados.
 *
 * Fica em `lib` e não em `server/`, como `dominio.ts` e `perfil.ts`, porque o
 * formulário é componente de cliente e precisa validar antes de enviar — e a
 * ação de servidor valida de novo, com estas mesmas funções. Validação de
 * interface é conveniência; a que vale é a do servidor.
 */

export type Endereco = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

export const ENDERECO_VAZIO: Endereco = {
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
};

/**
 * Como a paciente chegou à clínica. Lista fechada para o campo virar relatório
 * depois — texto livre não agrupa.
 */
export const ORIGENS = [
  "Indicação",
  "Instagram",
  "Google",
  "Passou em frente",
  "Retorno de paciente antiga",
  "Outro",
] as const;

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
] as const;

/**
 * O que o formulário edita, com os nomes exatos dos campos do `FormData`.
 *
 * A ação de servidor lê por estes mesmos nomes, então renomear um campo aqui
 * quebra a compilação lá — que é o objetivo.
 */
export type ValoresPaciente = Endereco & {
  nome: string;
  nome_social: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  origem: string;
  observacoes: string;
};

export const PACIENTE_EM_BRANCO: ValoresPaciente = {
  ...ENDERECO_VAZIO,
  nome: "",
  nome_social: "",
  cpf: "",
  data_nascimento: "",
  telefone: "",
  email: "",
  origem: "",
  observacoes: "",
};

export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, "");
}

// ---------------------------------------------------------------------
// CPF
// ---------------------------------------------------------------------

/** 123.456.789-01 — devolve o que veio quando não são 11 dígitos. */
export function formatarCpf(cpf: string): string {
  const d = apenasDigitos(cpf);
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Validação pelos dois dígitos verificadores.
 *
 * Sequências de um dígito só (111.111.111-11) passam na conta mas não existem,
 * então são recusadas à parte.
 */
export function cpfValido(cpf: string): boolean {
  const d = apenasDigitos(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  for (const [posicao, peso] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let soma = 0;
    for (let i = 0; i < posicao; i += 1) {
      soma += Number(d[i]) * (peso - i);
    }
    const resto = (soma * 10) % 11 % 10;
    if (resto !== Number(d[posicao])) return false;
  }

  return true;
}

// ---------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------

/** (11) 98765-4321 e (11) 3456-7890. Devolve o original se não reconhecer. */
export function formatarTelefone(telefone: string): string {
  const d = apenasDigitos(telefone);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

/** Fixo tem 10 dígitos, celular 11. DDD começa em 11. */
export function telefoneValido(telefone: string): boolean {
  const d = apenasDigitos(telefone);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;
  // Celular brasileiro sempre começa com 9 depois do DDD.
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

/** Link do WhatsApp com o código do país. Vazio quando o número não serve. */
export function linkWhatsapp(telefone: string | null): string | null {
  if (!telefone || !telefoneValido(telefone)) return null;
  return `https://wa.me/55${apenasDigitos(telefone)}`;
}

// ---------------------------------------------------------------------
// CEP
// ---------------------------------------------------------------------

export function formatarCep(cep: string): string {
  const d = apenasDigitos(cep);
  if (d.length !== 8) return cep;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

// ---------------------------------------------------------------------
// Identificação e idade
// ---------------------------------------------------------------------

/** O nome social tem precedência sempre que preenchido. */
export function nomeExibido(paciente: {
  nome: string;
  nome_social?: string | null;
}): string {
  return paciente.nome_social?.trim() || paciente.nome;
}

/** Idade em anos completos no calendário da clínica. */
export function idadeEm(nascimento: Date): number {
  const nasc = partesDoDia(nascimento);
  const hoje = partesDoDia();
  let anos = hoje.ano - nasc.ano;
  if (hoje.mes < nasc.mes || (hoje.mes === nasc.mes && hoje.dia < nasc.dia)) {
    anos -= 1;
  }
  return anos;
}

/** Quantos dias faltam para o próximo aniversário — 0 quando é hoje. */
export function diasAteAniversario(nascimento: Date, referencia = new Date()): number {
  const nasc = partesDoDia(nascimento);
  const { ano } = partesDoDia(referencia);

  const dias = diferencaEmDias(
    instanteNaClinica(ano, nasc.mes, nasc.dia),
    referencia,
  );

  // Já passou neste ano: o próximo é o do ano seguinte.
  if (dias >= 0) return dias;
  return diferencaEmDias(instanteNaClinica(ano + 1, nasc.mes, nasc.dia), referencia);
}

// ---------------------------------------------------------------------
// Endereço
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
// Validação
// ---------------------------------------------------------------------

export type ErrosPaciente = Partial<
  Record<keyof ValoresPaciente | "geral", string>
>;

const LIMITE = {
  nome: 120,
  nome_social: 120,
  email: 160,
  origem: 60,
  observacoes: 2000,
  endereco: 120,
} as const;

function cortar(valor: string, limite: number): string {
  return valor.trim().slice(0, limite);
}

/**
 * Deixa os valores no formato que o banco guarda.
 *
 * Documento e telefone viram só dígitos, e-mail vira minúsculo, UF vira
 * maiúscula. A formatação é decisão de exibição e é refeita na leitura.
 *
 * `data_nascimento` já precisa chegar como "AAAA-MM-DD" — quem lê planilha
 * converte antes, com `interpretarDataBr`.
 */
export function normalizarPaciente(valores: ValoresPaciente): ValoresPaciente {
  return {
    nome: cortar(valores.nome, LIMITE.nome),
    nome_social: cortar(valores.nome_social, LIMITE.nome_social),
    cpf: apenasDigitos(valores.cpf),
    data_nascimento: valores.data_nascimento.trim().slice(0, 10),
    telefone: apenasDigitos(valores.telefone),
    email: cortar(valores.email, LIMITE.email).toLowerCase(),
    origem: cortar(valores.origem, LIMITE.origem),
    observacoes: cortar(valores.observacoes, LIMITE.observacoes),
    cep: apenasDigitos(valores.cep).slice(0, 8),
    logradouro: cortar(valores.logradouro, LIMITE.endereco),
    numero: cortar(valores.numero, 20),
    complemento: cortar(valores.complemento, 60),
    bairro: cortar(valores.bairro, LIMITE.endereco),
    cidade: cortar(valores.cidade, LIMITE.endereco),
    uf: cortar(valores.uf, 2).toUpperCase(),
  };
}

/**
 * As regras do cadastro, em um lugar só.
 *
 * O formulário, a ação de servidor e a importação em massa chamam esta mesma
 * função. Mudar uma regra aqui muda nos três — que é o ponto.
 *
 * Espera valores já normalizados.
 */
export function validarPaciente(v: ValoresPaciente): ErrosPaciente {
  const erros: ErrosPaciente = {};

  if (v.nome.length < 3) {
    erros.nome = "Informe o nome completo da paciente.";
  }

  if (v.cpf && !cpfValido(v.cpf)) {
    erros.cpf = "CPF inválido. Confira os números.";
  }

  if (v.telefone && !telefoneValido(v.telefone)) {
    erros.telefone = "Telefone inválido. Use DDD + número.";
  }

  // Checagem simples de forma. O que prova que o e-mail existe é o envio.
  if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) {
    erros.email = "E-mail inválido.";
  }

  if (v.data_nascimento) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v.data_nascimento)) {
      erros.data_nascimento = "Data inválida.";
    } else {
      const [ano, mes, dia] = v.data_nascimento.split("-").map(Number);
      const hoje = partesDoDia();
      const noFuturo =
        ano > hoje.ano ||
        (ano === hoje.ano && mes > hoje.mes) ||
        (ano === hoje.ano && mes === hoje.mes && dia > hoje.dia);

      if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
        erros.data_nascimento = "Data inválida.";
      } else if (noFuturo) {
        erros.data_nascimento = "A data de nascimento não pode estar no futuro.";
      } else if (ano < 1900) {
        erros.data_nascimento = "Confira o ano de nascimento.";
      }
    }
  }

  if (v.uf && !UFS.includes(v.uf as (typeof UFS)[number])) {
    erros.uf = "UF inválida. Use a sigla de duas letras.";
  }

  return erros;
}

/** A linha como o banco a guarda: opcional vazio vira `null`, nunca "". */
export type CamposDoBanco = {
  nome: string;
  nome_social: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: Endereco | null;
  observacoes: string | null;
  origem: string | null;
};

function ouNulo(valor: string): string | null {
  return valor === "" ? null : valor;
}

/** Converte os valores já validados no registro que vai para o `insert`. */
export function paraOBanco(v: ValoresPaciente): CamposDoBanco {
  const endereco: Endereco = {
    cep: v.cep,
    logradouro: v.logradouro,
    numero: v.numero,
    complemento: v.complemento,
    bairro: v.bairro,
    cidade: v.cidade,
    uf: v.uf,
  };

  return {
    nome: v.nome,
    nome_social: ouNulo(v.nome_social),
    cpf: ouNulo(v.cpf),
    data_nascimento: ouNulo(v.data_nascimento),
    telefone: ouNulo(v.telefone),
    email: ouNulo(v.email),
    endereco: enderecoVazio(endereco) ? null : endereco,
    observacoes: ouNulo(v.observacoes),
    origem: ouNulo(v.origem),
  };
}

/** Lê o jsonb do banco sem confiar no formato — dado antigo pode não bater. */
export function lerEndereco(valor: unknown): Endereco {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
    return { ...ENDERECO_VAZIO };
  }
  const bruto = valor as Record<string, unknown>;
  const texto = (chave: keyof Endereco) =>
    typeof bruto[chave] === "string" ? (bruto[chave] as string) : "";

  return {
    cep: texto("cep"),
    logradouro: texto("logradouro"),
    numero: texto("numero"),
    complemento: texto("complemento"),
    bairro: texto("bairro"),
    cidade: texto("cidade"),
    uf: texto("uf"),
  };
}

export function enderecoVazio(endereco: Endereco): boolean {
  return Object.values(endereco).every((valor) => valor.trim() === "");
}

/** "Rua das Flores, 120 — Apto 3 · Jardim Paulista · São Paulo/SP" */
export function formatarEndereco(endereco: Endereco): string {
  const rua = [endereco.logradouro, endereco.numero].filter(Boolean).join(", ");
  const linha1 = [rua, endereco.complemento].filter(Boolean).join(" — ");
  const cidadeUf = [endereco.cidade, endereco.uf].filter(Boolean).join("/");
  return [linha1, endereco.bairro, cidadeUf].filter(Boolean).join(" · ");
}
