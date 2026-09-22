import { dataValida } from "./dates";
/**
 * Regras do prontuário que valem no formulário e no servidor.
 *
 * Conteúdo clínico nunca é salvo só pela validação da interface. A ação de
 * servidor chama estas mesmas regras antes de falar com o banco.
 */

export type ValoresProntuario = {
  paciente_id: string;
  atendimento_id: string;
  data_registro: string;
  titulo: string;
  motivo: string;
  queixa: string;
  avaliacao: string;
  conduta: string;
  evolucao: string;
  orientacoes: string;
  observacoes: string;
};

export type CampoDeConteudo =
  | "queixa"
  | "avaliacao"
  | "conduta"
  | "evolucao"
  | "orientacoes"
  | "observacoes";

export type ErrosProntuario = Partial<
  Record<keyof ValoresProntuario | "prontuario_id" | "geral", string>
>;

export const PRONTUARIO_EM_BRANCO: ValoresProntuario = {
  paciente_id: "",
  atendimento_id: "",
  data_registro: "",
  titulo: "",
  motivo: "",
  queixa: "",
  avaliacao: "",
  conduta: "",
  evolucao: "",
  orientacoes: "",
  observacoes: "",
};

export const CAMPOS_DE_CONTEUDO: CampoDeConteudo[] = [
  "queixa",
  "avaliacao",
  "conduta",
  "evolucao",
  "orientacoes",
  "observacoes",
];

const LIMITE = {
  titulo: 160,
  motivo: 240,
  conteudo: 6000,
} as const;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cortar(valor: string, limite: number): string {
  return valor.trim().slice(0, limite);
}

/** Data no formato do banco (AAAA-MM-DD) que existe de verdade no calendário. */
export { dataValida };

export function uuidValido(valor: string): boolean {
  return UUID.test(valor);
}

export function normalizarProntuario(
  valores: ValoresProntuario,
): ValoresProntuario {
  return {
    paciente_id: valores.paciente_id.trim().slice(0, 36),
    atendimento_id: valores.atendimento_id.trim().slice(0, 36),
    data_registro: valores.data_registro.trim().slice(0, 10),
    titulo: cortar(valores.titulo, LIMITE.titulo),
    motivo: cortar(valores.motivo, LIMITE.motivo),
    queixa: cortar(valores.queixa, LIMITE.conteudo),
    avaliacao: cortar(valores.avaliacao, LIMITE.conteudo),
    conduta: cortar(valores.conduta, LIMITE.conteudo),
    evolucao: cortar(valores.evolucao, LIMITE.conteudo),
    orientacoes: cortar(valores.orientacoes, LIMITE.conteudo),
    observacoes: cortar(valores.observacoes, LIMITE.conteudo),
  };
}

export function conteudoPreenchido(valores: ValoresProntuario): boolean {
  return CAMPOS_DE_CONTEUDO.some((campo) => valores[campo].trim().length > 0);
}

export function validarProntuario(
  valores: ValoresProntuario,
  opcoes: { exigirMotivo?: boolean } = {},
): ErrosProntuario {
  const erros: ErrosProntuario = {};

  if (!uuidValido(valores.paciente_id)) {
    erros.paciente_id = "Selecione a paciente do prontuário.";
  }

  if (valores.atendimento_id && !uuidValido(valores.atendimento_id)) {
    erros.atendimento_id = "Atendimento inválido.";
  }

  if (!valores.data_registro) {
    erros.data_registro = "Informe a data do registro.";
  } else if (!dataValida(valores.data_registro)) {
    erros.data_registro = "Data inválida.";
  }

  if (valores.titulo.length < 3) {
    erros.titulo = "Informe um título com pelo menos 3 caracteres.";
  }

  if (opcoes.exigirMotivo && valores.motivo.length < 5) {
    erros.motivo = "Informe o motivo da nova versão.";
  }

  if (!conteudoPreenchido(valores)) {
    erros.queixa = "Preencha pelo menos um campo clínico.";
  }

  return erros;
}
