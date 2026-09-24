"use server";

import { revalidatePath } from "next/cache";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { ehFinanceira, usuarioAtual } from "@/lib/auth";
import {
  ETAPAS_FUNIL,
  lerValoresMeta,
  normalizarLead,
  validarLead,
  type ErrosLead,
  type ErrosMeta,
  type ValoresLead,
  type ValoresMeta,
} from "@/lib/captacao";
import { comoClienteCaptacao, type EtapaLead } from "@/lib/captacao-banco";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";

export type EstadoLead = {
  erros: ErrosLead;
  valores?: Record<string, string>;
  sucesso?: string;
};

export type EstadoMeta = {
  erros: ErrosMeta;
  valores?: Record<string, string>;
  sucesso?: string;
};

async function exigirOperadorDeLeads(): Promise<string | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return "Sessão expirada. Entre novamente.";
  if (usuario.papel !== "administradora" && usuario.papel !== "recepcao") {
    return "Seu perfil pode acompanhar a captação, mas não altera leads.";
  }
  return null;
}

function revalidarCaptacao() {
  revalidatePath("/captacao");
  revalidatePath("/");
}

function lerLead(dados: FormData): ValoresLead {
  return normalizarLead({
    nome: campoTexto(dados, "nome", 120),
    telefone: campoTexto(dados, "telefone", 30),
    email: campoTexto(dados, "email", 160),
    origem: campoTexto(dados, "origem", 60),
    campanha: campoTexto(dados, "campanha", 120),
    procedimento_interesse_id: campoTexto(dados, "procedimento_interesse_id", 36),
    observacoes: campoTexto(dados, "observacoes", 2000),
  });
}

export async function criarLead(
  _anterior: EstadoLead,
  dados: FormData,
): Promise<EstadoLead> {
  const barrado = await exigirOperadorDeLeads();
  if (barrado) return { erros: { geral: barrado }, valores: valoresDigitados(dados) };

  const valores = lerLead(dados);
  const erros = validarLead(valores);
  if (valores.procedimento_interesse_id && !uuidValido(valores.procedimento_interesse_id)) {
    erros.procedimento_interesse_id = "Procedimento inválido.";
  }
  if (Object.keys(erros).length > 0) return { erros, valores: valoresDigitados(dados) };

  const base = await clienteServidor();
  const supabase = comoClienteCaptacao(base);
  const { error } = await supabase.from("leads").insert({
    nome: valores.nome,
    telefone: valores.telefone || null,
    email: valores.email || null,
    origem: valores.origem,
    campanha: valores.campanha || null,
    procedimento_interesse_id: valores.procedimento_interesse_id || null,
    observacoes: valores.observacoes || null,
  });

  if (error) {
    registrarFalha("captação: criar lead", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível adicionar o lead. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidarCaptacao();
  return { erros: {}, valores: {}, sucesso: "Lead adicionado ao topo do funil." };
}

export async function salvarMetaComercial(
  _anterior: EstadoMeta,
  dados: FormData,
): Promise<EstadoMeta> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };
  if (!(await ehFinanceira())) {
    return { erros: { geral: "Só a administradora ou o financeiro altera a meta." } };
  }

  const competencia = campoTexto(dados, "competencia", 10);
  if (!/^\d{4}-\d{2}-01$/.test(competencia)) {
    return { erros: { geral: "Período da meta inválido." }, valores: valoresDigitados(dados) };
  }

  const valores: ValoresMeta = {
    meta_faturamento: campoTexto(dados, "meta_faturamento", 30),
    ticket_medio_planejado: campoTexto(dados, "ticket_medio_planejado", 30),
    taxa_lead_qualificado: campoTexto(dados, "taxa_lead_qualificado", 10),
    taxa_qualificado_agendamento: campoTexto(dados, "taxa_qualificado_agendamento", 10),
    taxa_agendamento_venda: campoTexto(dados, "taxa_agendamento_venda", 10),
  };
  const leitura = lerValoresMeta(valores);
  if ("erros" in leitura) return { erros: leitura.erros, valores: valoresDigitados(dados) };

  const base = await clienteServidor();
  const supabase = comoClienteCaptacao(base);
  const existente = await supabase
    .from("metas_comerciais")
    .select("id")
    .eq("competencia", competencia)
    .is("procedimento_id", null)
    .maybeSingle();

  if (existente.error) {
    registrarFalha("captação: localizar meta", existente.error);
    return {
      erros: { geral: mensagemDoBanco(existente.error, "Não foi possível salvar a meta. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }

  const campos = {
    meta_faturamento: leitura.valor.metaFaturamento,
    ticket_medio_planejado: leitura.valor.ticketMedio,
    taxa_lead_qualificado: leitura.valor.taxaLeadQualificado,
    taxa_qualificado_agendamento: leitura.valor.taxaQualificadoAgendamento,
    taxa_agendamento_venda: leitura.valor.taxaAgendamentoVenda,
  };

  const resposta = existente.data
    ? await supabase
        .from("metas_comerciais")
        .update(campos)
        .eq("id", existente.data.id)
        .select("id")
        .maybeSingle()
    : await supabase
        .from("metas_comerciais")
        .insert({ competencia, ...campos })
        .select("id")
        .maybeSingle();

  if (resposta.error) {
    registrarFalha("captação: salvar meta", resposta.error);
    return {
      erros: { geral: mensagemDoBanco(resposta.error, "Não foi possível salvar a meta. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }
  if (!resposta.data) return { erros: { geral: "A meta não foi localizada depois de salvar." } };

  revalidarCaptacao();
  return { erros: {}, sucesso: "Meta e premissas atualizadas." };
}

/**
 * Cria o cadastro clínico a partir dos dados que o lead já tem e vincula os
 * dois na mesma transação do banco. O RPC também torna `novo` em `qualificado`.
 */
export async function converterLeadEmPaciente(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const barrado = await exigirOperadorDeLeads();
  if (barrado) return falha(barrado);

  const leadId = campoTexto(dados, "id", 36);
  if (!uuidValido(leadId)) return falha("Lead não identificado.");

  const base = await clienteServidor();
  const supabase = comoClienteCaptacao(base);
  const { data: pacienteId, error } = await supabase.rpc("lead_converter_em_paciente", {
    p_lead_id: leadId,
  });

  if (error) {
    registrarFalha("captação: converter lead em paciente", error);
    return falha(
      mensagemDoBanco(
        error,
        "Não foi possível criar a paciente a partir do lead. Tente de novo.",
      ),
    );
  }
  if (!pacienteId || !uuidValido(pacienteId)) {
    return falha("O cadastro foi processado, mas a paciente não foi identificada.");
  }

  revalidarCaptacao();
  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${pacienteId}`);
  return sucesso("Paciente criada e vinculada ao lead.");
}

/**
 * Liga a oportunidade comercial ao cadastro clínico existente. A partir daqui
 * agenda e venda conseguem avançar o lead pelos gatilhos do banco.
 */
export async function vincularPacienteLead(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const barrado = await exigirOperadorDeLeads();
  if (barrado) return falha(barrado);

  const leadId = campoTexto(dados, "id", 36);
  const pacienteId = campoTexto(dados, "paciente_id", 36);
  if (!uuidValido(leadId)) return falha("Lead não identificado.");
  if (!uuidValido(pacienteId)) return falha("Escolha uma paciente para vincular.");

  const base = await clienteServidor();
  const paciente = await base
    .from("pacientes")
    .select("id")
    .eq("id", pacienteId)
    .maybeSingle();

  if (paciente.error) {
    registrarFalha("captação: localizar paciente do lead", paciente.error);
    return falha(
      mensagemDoBanco(paciente.error, "Não foi possível localizar a paciente. Tente de novo."),
    );
  }
  if (!paciente.data) return falha("Paciente não encontrada.");

  const supabase = comoClienteCaptacao(base);
  const { data, error } = await supabase
    .from("leads")
    .update({ paciente_id: pacienteId })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("captação: vincular paciente", error);
    return falha(
      mensagemDoBanco(
        error,
        "Não foi possível vincular a paciente ao lead. Tente de novo.",
        { "23503": "A paciente selecionada não existe mais." },
      ),
    );
  }
  if (!data) return falha("Lead não encontrado ou sem permissão para alteração.");

  revalidarCaptacao();
  revalidatePath(`/pacientes/${pacienteId}`);
  return sucesso("Paciente vinculada ao lead.");
}

export async function mudarEtapaLead(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const barrado = await exigirOperadorDeLeads();
  if (barrado) return falha(barrado);

  const id = campoTexto(dados, "id", 36);
  const para = campoTexto(dados, "para", 20) as EtapaLead;
  const motivo = campoTexto(dados, "motivo", 300);
  if (!uuidValido(id)) return falha("Lead não identificado.");
  if (!(ETAPAS_FUNIL as readonly string[]).includes(para)) return falha("Etapa inválida.");
  if (para === "perdido" && motivo.length < 3) return falha("Informe o motivo da perda.");

  const base = await clienteServidor();
  const supabase = comoClienteCaptacao(base);
  const { data, error } = await supabase
    .from("leads")
    .update({
      etapa: para,
      motivo_perda: para === "perdido" ? motivo : null,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("captação: mudar etapa", error);
    return falha(mensagemDoBanco(error, "Não foi possível mover o lead. Tente de novo."));
  }
  if (!data) return falha("Lead não encontrado ou sem permissão para alteração.");

  revalidarCaptacao();
  return sucesso("Lead movido no funil.");
}
