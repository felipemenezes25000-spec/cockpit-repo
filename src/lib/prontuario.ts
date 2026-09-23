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

/**
 * Os limites de texto, com o par no banco (0010 e 0022): título com pelo
 * menos 3 (a tela corta em 160; o banco não tem máximo), motivo de 5 a 240 e
 * cada campo clínico até 6.000. Exportado para o formulário usar o mesmo
 * número no `maxLength`.
 */
export const LIMITES_PRONTUARIO = LIMITE;

/**
 * Só apara. Conteúdo clínico acima do limite NÃO é cortado aqui: cortar em
 * silêncio perderia o fim de uma evolução sem a pessoa saber. Quem recusa,
 * com mensagem, é `validarProntuario` — como o banco recusaria.
 */
function aparar(valor: string): string {
  // O corpo multipart do formulário chega com CRLF, mas o `maxLength` do
  // textarea conta cada quebra como 1. Sem normalizar, um texto dentro do
  // limite visível passaria de 6.000 aqui (e na CHECK da 0022).
  return valor.replace(/\r\n?/g, "\n").trim();
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
    // Identificador e data têm forma fixa: o que passa disso já é inválido,
    // e o corte só impede texto gigante de chegar à validação.
    paciente_id: valores.paciente_id.trim().slice(0, 36),
    atendimento_id: valores.atendimento_id.trim().slice(0, 36),
    data_registro: valores.data_registro.trim().slice(0, 10),
    titulo: aparar(valores.titulo),
    motivo: aparar(valores.motivo),
    queixa: aparar(valores.queixa),
    avaliacao: aparar(valores.avaliacao),
    conduta: aparar(valores.conduta),
    evolucao: aparar(valores.evolucao),
    orientacoes: aparar(valores.orientacoes),
    observacoes: aparar(valores.observacoes),
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
  } else if (valores.titulo.length > LIMITE.titulo) {
    erros.titulo = `O título aceita até ${LIMITE.titulo} caracteres.`;
  }

  if (opcoes.exigirMotivo && valores.motivo.length < 5) {
    erros.motivo = "Informe o motivo da nova versão.";
  } else if (valores.motivo.length > LIMITE.motivo) {
    erros.motivo = `O motivo aceita até ${LIMITE.motivo} caracteres.`;
  }

  if (!conteudoPreenchido(valores)) {
    erros.queixa = "Preencha pelo menos um campo clínico.";
  }

  // O banco recusa acima de 6.000 (CHECK da 0022). Recusar aqui dá a
  // mensagem no campo certo, em vez de uma recusa genérica depois de enviar.
  for (const campo of CAMPOS_DE_CONTEUDO) {
    if (valores[campo].length > LIMITE.conteudo) {
      erros[campo] = `Este campo aceita até ${LIMITE.conteudo.toLocaleString("pt-BR")} caracteres.`;
    }
  }

  return erros;
}
