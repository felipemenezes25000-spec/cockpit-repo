"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { usuarioAtual } from "@/lib/auth";
import { inicioDoDia } from "@/lib/dates";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { registrarFalha } from "@/lib/registro";
import {
  ORIGENS_CONFIRMACAO,
  ORIGENS_TAREFA,
  REGISTRO_CONTATO,
  TIPOS_TAREFA,
  destinoConfirmacaoValido,
  situacaoRetornoValida,
  situacaoTarefaValida,
  tipoContatoValido,
  validarRetorno,
  validarTarefa,
  type EstadoRelacionamento,
} from "@/lib/relacionamento";
import { clienteServidor } from "@/lib/supabase/server";

const SESSAO_EXPIRADA = "Sessão expirada. Entre novamente.";

function revalidarRelacionamento() {
  revalidatePath("/relacionamento");
  revalidatePath("/");
  revalidatePath("/agenda");
}

/**
 * A paciente existe e está ativa? `null` quando sim; senão, a frase da falha.
 * Erro de banco não vira "paciente não encontrada": a pessoa precisa saber
 * que o problema foi a consulta, não o cadastro.
 */
async function conferirPaciente(
  supabase: Awaited<ReturnType<typeof clienteServidor>>,
  pacienteId: string,
  contexto: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("ativo", true)
    .maybeSingle();
  if (error) {
    registrarFalha(`relacionamento: ${contexto} (paciente)`, error);
    return mensagemDoBanco(error, "Não foi possível conferir a paciente. Tente de novo.");
  }
  return data ? null : "Paciente não encontrada ou arquivada.";
}

// ---------------------------------------------------------------------
// Formulários (EstadoRelacionamento + useActionState + redirect)
// ---------------------------------------------------------------------

export async function criarTarefa(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: SESSAO_EXPIRADA } };

  const valores = valoresDigitados(dados);
  const resultado = validarTarefa(valores);
  if ("erros" in resultado) return { erros: resultado.erros ?? {}, valores };

  const supabase = await clienteServidor();
  if (resultado.campos.paciente_id) {
    const recusa = await conferirPaciente(supabase, resultado.campos.paciente_id, "criar tarefa");
    if (recusa) return { erros: { paciente_id: recusa }, valores };
  }
  const { error } = await supabase.from("pendencias").insert({
    ...resultado.campos,
    responsavel_id: usuario.id,
  });
  if (error) {
    registrarFalha("relacionamento: criar tarefa", error);
    return { erros: { geral: mensagemDoBanco(error, "Não foi possível criar a tarefa.") }, valores };
  }

  revalidarRelacionamento();
  redirect("/relacionamento?aba=tarefas");
}

export async function criarRetorno(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: SESSAO_EXPIRADA } };

  const valores = valoresDigitados(dados);
  const resultado = validarRetorno(valores);
  if ("erros" in resultado) return { erros: resultado.erros ?? {}, valores };

  const supabase = await clienteServidor();
  const recusa = await conferirPaciente(supabase, resultado.campos.paciente_id, "criar retorno");
  if (recusa) return { erros: { paciente_id: recusa }, valores };

  const { error } = await supabase.from("retornos").insert(resultado.campos);
  if (error) {
    registrarFalha("relacionamento: criar retorno", error);
    return { erros: { geral: mensagemDoBanco(error, "Não foi possível registrar o retorno.") }, valores };
  }

  revalidarRelacionamento();
  redirect("/relacionamento?aba=retornos");
}

// ---------------------------------------------------------------------
// Botões (ResultadoAcao + FormularioDeAcao)
// ---------------------------------------------------------------------

/** Concluir, cancelar ou reabrir uma tarefa de contato. */
export async function mudarSituacaoTarefa(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha(SESSAO_EXPIRADA);

  const id = campoTexto(dados, "id", 36);
  const para = campoTexto(dados, "para", 40);
  if (!uuidValido(id) || !situacaoTarefaValida(para)) {
    return falha("Tarefa ou situação inválida.");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("pendencias")
    .update({
      situacao: para,
      resolvida_em: para === "resolvida" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .in("tipo", [...TIPOS_TAREFA])
    // Registro de contato não é tarefa: não se reabre nem se cancela (0025).
    .eq("origem", "tarefa")
    .in("situacao", [...ORIGENS_TAREFA[para]])
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("relacionamento: mudar situação da tarefa", error);
    return falha(mensagemDoBanco(error, "Não foi possível atualizar a tarefa. Tente de novo."));
  }
  if (!data) {
    return falha("A tarefa já tinha mudado. A lista foi atualizada.");
  }

  revalidarRelacionamento();
  return sucesso("Tarefa atualizada.");
}

/** Em contato, aguardando, agendado, recusou, reabrir — o passo do retorno. */
export async function mudarSituacaoRetorno(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha(SESSAO_EXPIRADA);

  const id = campoTexto(dados, "id", 36);
  const para = campoTexto(dados, "para", 40);
  if (!uuidValido(id) || !situacaoRetornoValida(para)) {
    return falha("Retorno ou situação inválida.");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("retornos")
    .update({ situacao: para })
    .eq("id", id)
    // O retorno não tem trilha de transição definida pela clínica; a única
    // condição é não regravar a situação que já está lá (clique duplo).
    .neq("situacao", para)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("relacionamento: mudar situação do retorno", error);
    return falha(mensagemDoBanco(error, "Não foi possível atualizar o retorno. Tente de novo."));
  }
  if (!data) {
    return falha("O retorno já tinha mudado. A lista foi atualizada.");
  }

  revalidarRelacionamento();
  return sucesso("Retorno atualizado.");
}

/** Confirmar ou marcar "aguardando resposta" direto da lista de confirmações. */
export async function confirmarPelaLista(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha(SESSAO_EXPIRADA);

  const id = campoTexto(dados, "id", 36);
  const para = campoTexto(dados, "para", 40);
  if (!uuidValido(id) || !destinoConfirmacaoValido(para)) {
    return falha("Atendimento ou situação inválida.");
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("atendimentos")
    .update({ situacao: para })
    .eq("id", id)
    .in("situacao", [...ORIGENS_CONFIRMACAO[para]])
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("relacionamento: confirmar pela lista", error);
    return falha(mensagemDoBanco(error, "Não foi possível confirmar. Tente de novo."));
  }
  const pronto = para === "confirmado" ? "Atendimento confirmado." : "Aguardando resposta da paciente.";

  if (!data) {
    // Nenhuma linha mudou: ou a situação já é a pedida (clique repetido, outra
    // aba), ou saiu das origens aceitas. Relê para não responder que o
    // atendimento "já não espera confirmação" quando ele continua esperando.
    const { data: atual, error: erroLeitura } = await supabase
      .from("atendimentos")
      .select("situacao")
      .eq("id", id)
      .maybeSingle();
    if (erroLeitura) {
      registrarFalha("relacionamento: reler situação após confirmar", erroLeitura);
      return falha(mensagemDoBanco(erroLeitura, "Não foi possível conferir o atendimento. Recarregue a página."));
    }
    if (atual?.situacao === para) {
      revalidarRelacionamento();
      return sucesso(pronto);
    }
    return falha("A situação deste atendimento mudou. Confira na agenda.");
  }

  revalidarRelacionamento();
  return sucesso(pronto);
}

/**
 * Registro operacional: uma pendência concluída conserva data, paciente e
 * autor. O envio em si é manual (WhatsApp ou mensagem copiada); isto só
 * anota que a equipe diz ter enviado.
 *
 * Deduplicação: um registro da mesma origem para a mesma paciente no mesmo
 * dia da clínica. A conferência antes do INSERT dá a resposta amigável no
 * caso comum; a garantia é do banco (0025, `pendencias_contato_um_por_dia`):
 * dois cliques em abas diferentes no mesmo instante esbarram no índice
 * único, e a recusa (23505) vira a mesma resposta de "já registrado".
 */
export async function registrarContato(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha(SESSAO_EXPIRADA);

  const pacienteId = campoTexto(dados, "paciente_id", 36);
  const tipo = campoTexto(dados, "tipo", 20);
  if (!uuidValido(pacienteId) || !tipoContatoValido(tipo)) {
    return falha("Dados do contato inválidos.");
  }
  const registro = REGISTRO_CONTATO[tipo];

  const supabase = await clienteServidor();
  const recusa = await conferirPaciente(supabase, pacienteId, "registrar contato");
  if (recusa) return falha(recusa);

  const { data: jaRegistrado, error: erroConsulta } = await supabase
    .from("pendencias")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("origem", registro.origem)
    .gte("resolvida_em", inicioDoDia().toISOString())
    .limit(1)
    .maybeSingle();
  if (erroConsulta) {
    registrarFalha("relacionamento: conferir contatos de hoje", erroConsulta);
    return falha(mensagemDoBanco(erroConsulta, "Não foi possível conferir os contatos de hoje. Tente de novo."));
  }
  if (jaRegistrado) return sucesso("Este contato já foi registrado hoje.");

  const { data, error } = await supabase
    .from("pendencias")
    .insert({
      paciente_id: pacienteId,
      origem: registro.origem,
      tipo: registro.tipo,
      descricao: registro.descricao,
      prioridade: "baixa",
      situacao: "resolvida",
      resolvida_em: new Date().toISOString(),
      responsavel_id: usuario.id,
    })
    .select("id")
    .maybeSingle();
  // O mesmo contato gravado por outra aba entre a conferência e o INSERT.
  if (error?.code === "23505") return sucesso("Este contato já foi registrado hoje.");
  if (error) {
    registrarFalha("relacionamento: registrar contato", error);
    return falha(mensagemDoBanco(error, "Não foi possível registrar o contato. Tente de novo."));
  }
  if (!data) return falha("Não foi possível registrar o contato. Tente de novo.");

  revalidarRelacionamento();
  return sucesso("Contato registrado.");
}
