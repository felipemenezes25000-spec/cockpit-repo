"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import {
  SITUACOES_RETORNO,
  UUID_RELACIONAMENTO,
  validarRetorno,
  validarTarefa,
  type EstadoRelacionamento,
} from "@/lib/relacionamento";
import type { SituacaoAcompanhamento } from "@/lib/dominio";
import { inicioDoDia } from "@/lib/dates";

function valoresDoFormulario(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [campo, valor] of dados.entries()) {
    if (typeof valor === "string") valores[campo] = valor.trim();
  }
  return valores;
}

function revalidarRelacionamento() {
  revalidatePath("/relacionamento");
  revalidatePath("/");
  revalidatePath("/agenda");
}

export async function criarTarefa(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const valores = valoresDoFormulario(dados);
  const resultado = validarTarefa(valores);
  if ("erros" in resultado) return { erros: resultado.erros ?? {}, valores };

  const supabase = await clienteServidor();
  if (resultado.campos.paciente_id) {
    const { data: paciente, error: erroPaciente } = await supabase.from("pacientes")
      .select("id").eq("id", resultado.campos.paciente_id).eq("ativo", true).maybeSingle();
    if (erroPaciente || !paciente) return { erros: { paciente_id: "Paciente não encontrada ou arquivada." }, valores };
  }
  const { error } = await supabase.from("pendencias").insert({
    ...resultado.campos,
    responsavel_id: usuario.id,
  });
  if (error) return { erros: { geral: "Não foi possível criar a tarefa." }, valores };

  revalidarRelacionamento();
  redirect("/relacionamento?aba=tarefas");
}

export async function criarRetorno(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const valores = valoresDoFormulario(dados);
  const resultado = validarRetorno(valores);
  if ("erros" in resultado) return { erros: resultado.erros ?? {}, valores };

  const supabase = await clienteServidor();
  const { data: paciente, error: erroPaciente } = await supabase.from("pacientes")
    .select("id").eq("id", resultado.campos.paciente_id).eq("ativo", true).maybeSingle();
  if (erroPaciente || !paciente) return { erros: { paciente_id: "Paciente não encontrada ou arquivada." }, valores };
  const { error } = await supabase.from("retornos").insert(resultado.campos);
  if (error) return { erros: { geral: "Não foi possível registrar o retorno." }, valores };

  revalidarRelacionamento();
  redirect("/relacionamento?aba=retornos");
}

export async function mudarSituacaoTarefa(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = String(dados.get("id") ?? "");
  const para = String(dados.get("para") ?? "");
  if (!UUID_RELACIONAMENTO.test(id) || !["aberta", "resolvida", "cancelada"].includes(para)) {
    return { erros: { geral: "Tarefa ou situação inválida." } };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("pendencias")
    .update({
      situacao: para as "aberta" | "resolvida" | "cancelada",
      resolvida_em: para === "resolvida" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .in("tipo", ["confirmacao", "retorno", "pesquisa", "outro"])
    .select("id")
    .maybeSingle();
  if (error || !data) return { erros: { geral: "Não foi possível atualizar a tarefa." } };

  revalidarRelacionamento();
  return { erros: {}, mensagem: "Tarefa atualizada." };
}

export async function mudarSituacaoRetorno(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = String(dados.get("id") ?? "");
  const para = String(dados.get("para") ?? "") as SituacaoAcompanhamento;
  if (!UUID_RELACIONAMENTO.test(id) || !SITUACOES_RETORNO.includes(para)) {
    return { erros: { geral: "Retorno ou situação inválida." } };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("retornos")
    .update({ situacao: para })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { erros: { geral: "Não foi possível atualizar o retorno." } };

  revalidarRelacionamento();
  return { erros: {}, mensagem: "Retorno atualizado." };
}

export async function confirmarPelaLista(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = String(dados.get("id") ?? "");
  const para = String(dados.get("para") ?? "");
  if (!UUID_RELACIONAMENTO.test(id) || !["confirmado", "aguardando_confirmacao"].includes(para)) {
    return { erros: { geral: "Atendimento ou situação inválida." } };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("atendimentos")
    .update({ situacao: para as "confirmado" | "aguardando_confirmacao" })
    .eq("id", id)
    .in("situacao", ["agendado", "aguardando_confirmacao"])
    .select("id")
    .maybeSingle();
  if (error || !data) return { erros: { geral: "Não foi possível confirmar. Confira a situação na agenda." } };

  revalidarRelacionamento();
  return { erros: {}, mensagem: para === "confirmado" ? "Atendimento confirmado." : "Aguardando resposta da paciente." };
}

/** Registro operacional: uma pendência concluída conserva data, paciente e autor. */
export async function registrarContato(
  _anterior: EstadoRelacionamento,
  dados: FormData,
): Promise<EstadoRelacionamento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const pacienteId = String(dados.get("paciente_id") ?? "");
  const tipo = String(dados.get("tipo") ?? "");
  if (!UUID_RELACIONAMENTO.test(pacienteId) || !["avaliacao", "aniversario"].includes(tipo)) {
    return { erros: { geral: "Dados do contato inválidos." } };
  }
  const descricao = tipo === "avaliacao"
    ? "Convite para avaliação no Google enviado pela equipe"
    : "Mensagem de aniversário enviada pela equipe";

  const supabase = await clienteServidor();
  const { data: paciente, error: erroPaciente } = await supabase.from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .eq("ativo", true)
    .maybeSingle();
  if (erroPaciente || !paciente) return { erros: { geral: "Paciente não encontrada ou arquivada." } };

  const { data: jaRegistrado, error: erroConsulta } = await supabase.from("pendencias")
    .select("id")
    .eq("paciente_id", pacienteId)
    .eq("descricao", descricao)
    .gte("resolvida_em", inicioDoDia().toISOString())
    .limit(1)
    .maybeSingle();
  if (erroConsulta) return { erros: { geral: "Não foi possível conferir os contatos de hoje." } };
  if (jaRegistrado) return { erros: {}, mensagem: "Este contato já foi registrado hoje." };

  const agora = new Date().toISOString();
  const { error } = await supabase.from("pendencias").insert({
    paciente_id: pacienteId,
    tipo: tipo === "avaliacao" ? "pesquisa" : "outro",
    descricao,
    prioridade: "baixa",
    situacao: "resolvida",
    resolvida_em: agora,
    responsavel_id: usuario.id,
  });
  if (error) return { erros: { geral: "Não foi possível registrar o contato." } };

  revalidarRelacionamento();
  return { erros: {}, mensagem: "Contato registrado." };
}
