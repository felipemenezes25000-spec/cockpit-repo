import { dataValida } from "@/lib/dates";
import { UUID } from "@/lib/formulario";
import type { OrigemPendencia, Prioridade, SituacaoAcompanhamento, TipoPendencia } from "@/lib/dominio";

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

/** O mesmo UUID de `lib/formulario.ts`; o nome antigo fica para quem já importa. */
export const UUID_RELACIONAMENTO = UUID;

/** Link direto informado pela clínica para receber avaliações no Google. */
export const LINK_AVALIACAO_GOOGLE = "https://g.page/r/CYXDzsOMXUv5ECE/review";

/**
 * Número no formato do `wa.me`: `55` + DDD + número, só dígitos.
 *
 * O `55` inicial só é tratado como código do país quando sobram 10 ou 11
 * dígitos depois dele (12 ou 13 no total). Antes ele saía sempre, e um
 * telefone de DDD 55 (RS) gravado sem o código do país — `(55) 99123-4567` —
 * perdia o DDD e era recusado.
 */
export function telefoneParaWhatsApp(telefone: string | null): string | null {
  if (!telefone) return null;
  const digitos = telefone.replace(/\D/g, "");
  const numero = digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)
    ? digitos.slice(2)
    : digitos;
  return /^\d{10,11}$/.test(numero) ? `55${numero}` : null;
}

/** Link do WhatsApp com a mensagem pronta; nulo sem telefone válido. */
export function linkWhatsApp(telefone: string | null, mensagem: string): string | null {
  const numero = telefoneParaWhatsApp(telefone);
  return numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;
}

/**
 * Pedido de confirmação de um atendimento; `dia` e `hora` já formatados.
 *
 * Sem o nome do procedimento: é dado de saúde, e a mensagem vai na URL do
 * wa.me e para o telefone cadastrado (que pode estar desatualizado ou ser de
 * outra pessoa). Dia e hora bastam para confirmar.
 */
export function mensagemConfirmacao(nome: string, dia: string, hora: string): string {
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Olá";
  return `Olá, ${primeiroNome}! Aqui é da clínica da Dra. Érika Passos. Podemos confirmar o seu atendimento em ${dia} às ${hora}?`;
}

/**
 * Chamada para o retorno. Também sem o procedimento (a mesma razão da
 * confirmação): quem abre a conversa só precisa saber que é hora de voltar.
 */
export function mensagemRetorno(nome: string): string {
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Olá";
  return `Olá, ${primeiroNome}! Aqui é da clínica da Dra. Érika Passos. Já está chegando a hora do seu retorno. Qual o melhor dia e horário para você?`;
}

export function mensagemAniversario(nome: string): string {
  const primeiroNome = nome.trim().split(/\s+/)[0] || "Olá";
  return `Olá, ${primeiroNome}! A equipe da Dra. Érika Passos deseja a você um feliz aniversário!`;
}

// ---------------------------------------------------------------------
// Situações que os botões da tela mudam
// ---------------------------------------------------------------------

export const SITUACOES_TAREFA = ["aberta", "resolvida", "cancelada"] as const;
export type SituacaoTarefa = (typeof SITUACOES_TAREFA)[number];

/**
 * De onde cada situação de tarefa pode vir — a condição do UPDATE.
 *
 * É o que a tela já oferece: aberta conclui ou cancela; concluída ou
 * cancelada só reabre. Dois cliques (ou duas abas) não gravam duas vezes, e
 * uma tarefa que outra pessoa já concluiu não é "cancelada por cima".
 */
export const ORIGENS_TAREFA: Record<SituacaoTarefa, readonly SituacaoTarefa[]> = {
  aberta: ["resolvida", "cancelada"],
  resolvida: ["aberta"],
  cancelada: ["aberta"],
};

/**
 * Confirmação pela lista: só mexe em atendimento que ainda espera resposta.
 * "Aguardando resposta" só sai de "agendado"; "confirmado" sai dos dois.
 */
export const DESTINOS_CONFIRMACAO = ["confirmado", "aguardando_confirmacao"] as const;
export type DestinoConfirmacao = (typeof DESTINOS_CONFIRMACAO)[number];
export const ORIGENS_CONFIRMACAO: Record<DestinoConfirmacao, readonly ("agendado" | "aguardando_confirmacao")[]> = {
  confirmado: ["agendado", "aguardando_confirmacao"],
  aguardando_confirmacao: ["agendado"],
};

export function situacaoTarefaValida(valor: string): valor is SituacaoTarefa {
  return (SITUACOES_TAREFA as readonly string[]).includes(valor);
}

export function situacaoRetornoValida(valor: string): valor is SituacaoAcompanhamento {
  return (SITUACOES_RETORNO as readonly string[]).includes(valor);
}

export function destinoConfirmacaoValido(valor: string): valor is DestinoConfirmacao {
  return (DESTINOS_CONFIRMACAO as readonly string[]).includes(valor);
}

// ---------------------------------------------------------------------
// Registro de contato (convite de avaliação, mensagem de aniversário)
// ---------------------------------------------------------------------

export const TIPOS_CONTATO = ["avaliacao", "aniversario"] as const;
export type TipoContato = (typeof TIPOS_CONTATO)[number];

export function tipoContatoValido(valor: string): valor is TipoContato {
  return (TIPOS_CONTATO as readonly string[]).includes(valor);
}

/**
 * Como cada contato vira `pendencia` concluída.
 *
 * Desde a migração 0025 o registro de contato é reconhecido pela coluna
 * `origem`, não pelo texto: a ação grava a origem daqui, a deduplicação e
 * as consultas filtram por ela, e a descrição é só o que a equipe lê. Os
 * registros gravados antes da coluna foram reconhecidos pelo texto antigo
 * na própria migração (`private.pendencia_origem_pelo_texto`). O banco
 * confere a combinação origem/tipo (`pendencias_origem_coerente`) e
 * recusa o segundo registro da mesma origem para a mesma paciente no mesmo
 * dia da clínica (`pendencias_contato_um_por_dia`).
 */
export const REGISTRO_CONTATO: Record<
  TipoContato,
  { origem: Exclude<OrigemPendencia, "tarefa">; tipo: TipoPendencia; descricao: string }
> = {
  avaliacao: {
    origem: "contato_avaliacao",
    tipo: "pesquisa",
    descricao: "Convite para avaliação no Google enviado pela equipe",
  },
  aniversario: {
    origem: "contato_aniversario",
    tipo: "outro",
    descricao: "Mensagem de aniversário enviada pela equipe",
  },
};

/** As origens que são registro de contato, na ordem de `TIPOS_CONTATO`. */
export const ORIGENS_CONTATO = TIPOS_CONTATO.map((tipo) => REGISTRO_CONTATO[tipo].origem);

/** De volta da coluna `origem` para o tipo de contato; tarefa não é contato. */
export function tipoContatoDaOrigem(origem: OrigemPendencia): TipoContato | null {
  return TIPOS_CONTATO.find((tipo) => REGISTRO_CONTATO[tipo].origem === origem) ?? null;
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
