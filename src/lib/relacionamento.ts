import { dataValida } from "@/lib/dates";
import type { Prioridade, SituacaoAcompanhamento, TipoPendencia } from "@/lib/dominio";

export { dataValida };

export const TIPOS_TAREFA = ["confirmacao", "retorno", "pesquisa", "outro"] as const satisfies readonly TipoPendencia[];
export type TipoTarefa = (typeof TIPOS_TAREFA)[number];

export const ROTULO_TAREFA: Record<TipoTarefa, string> = {
  confirmacao: "Confirmação",
  retorno: "Retorno",
  pesquisa: "Pesquisa / avaliação",
  outro: "Outra tarefa",
};

export const PRIORIDADES = ["baixa", "media", "alta"] as const satisfies readonly Prioridade[];
export const SITUACOES_RETORNO = [
  "nao_iniciado",
  "em_contato",
  "aguardando_resposta",
  "agendado",
  "recusado",
] as const satisfies readonly SituacaoAcompanhamento[];

export const UUID_RELACIONAMENTO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Link direto informado pela clínica para receber avaliações no Google. */
export const LINK_AVALIACAO_GOOGLE = "https://g.page/r/CYXDzsOMXUv5ECE/review";

export function telefoneParaWhatsApp(telefone: string | null): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") ? digitos.slice(2) : digitos;
  return /^\d{10,11}$/.test(numero) ? `55${numero}` : null;
}

export function mensagemAvaliacao(nome: string, link: string): string {
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Olá";
  return `Olá, ${primeiroNome}! Obrigada pela confiança no nosso atendimento. Se puder, conte como foi sua experiência avaliando a clínica no Google: ${link}`;
}

export type ErrosRelacionamento = Partial<Record<
  "geral" | "paciente_id" | "descricao" | "prazo" | "prioridade" | "tipo" |
  "sugerido_para" | "situacao" | "observacoes",
  string
>>;

export type EstadoRelacionamento = {
  erros: ErrosRelacionamento;
  valores?: Record<string, string>;
  mensagem?: string;
};

export function validarTarefa(valores: Record<string, string>) {
  const erros: ErrosRelacionamento = {};
  const tipo = valores.tipo as TipoTarefa;
  const prioridade = valores.prioridade as Prioridade;
  const descricao = (valores.descricao ?? "").trim();
  const pacienteId = (valores.paciente_id ?? "").trim();
  const prazo = (valores.prazo ?? "").trim();

  if (!TIPOS_TAREFA.includes(tipo)) erros.tipo = "Escolha o tipo da tarefa.";
  if (!PRIORIDADES.includes(prioridade)) erros.prioridade = "Escolha a prioridade.";
  if (descricao.length < 3 || descricao.length > 500) erros.descricao = "Descreva a tarefa em 3 a 500 caracteres.";
  if (pacienteId && !UUID_RELACIONAMENTO.test(pacienteId)) erros.paciente_id = "Escolha uma paciente válida.";
  if (prazo && !dataValida(prazo)) erros.prazo = "Informe uma data válida.";

  return Object.keys(erros).length > 0
    ? { erros }
    : { campos: { tipo, prioridade, descricao, paciente_id: pacienteId || null, prazo: prazo || null } };
}

export function validarRetorno(valores: Record<string, string>) {
  const erros: ErrosRelacionamento = {};
  const pacienteId = (valores.paciente_id ?? "").trim();
  const sugeridoPara = (valores.sugerido_para ?? "").trim();
  const observacoes = (valores.observacoes ?? "").trim();

  if (!UUID_RELACIONAMENTO.test(pacienteId)) erros.paciente_id = "Escolha uma paciente.";
  if (!dataValida(sugeridoPara)) erros.sugerido_para = "Informe uma data válida.";
  if (observacoes.length > 2000) erros.observacoes = "Use até 2.000 caracteres.";

  return Object.keys(erros).length > 0
    ? { erros }
    : { campos: { paciente_id: pacienteId, sugerido_para: sugeridoPara, observacoes: observacoes || null } };
}
