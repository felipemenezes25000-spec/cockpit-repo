"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { chaveDoDia, instanteNaClinica } from "@/lib/dates";
import { formatarHora } from "@/lib/format";
import {
  lerDuracao,
  lerValorEmReais,
  SITUACOES_VALIDAS,
} from "@/lib/atendimento";
import type { SituacaoAtendimento } from "@/lib/dominio";

/**
 * Marcar, remarcar e mudar a situação do atendimento.
 *
 * A RLS já barra quem não tem acesso; as checagens aqui devolvem mensagem em
 * vez de erro cru. A trilha de situações é gravada por gatilho no banco, com
 * autor e hora — a ação só atualiza a coluna.
 */

export type ErrosAtendimento = Partial<
  Record<
    | "paciente_id"
    | "profissional_id"
    | "procedimento_id"
    | "data"
    | "hora"
    | "duracao_min"
    | "valor"
    | "geral",
    string
  >
>;

export type EstadoAtendimento = {
  erros: ErrosAtendimento;
  valores?: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

function digitados(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of dados.entries()) {
    if (typeof valor === "string") valores[chave] = valor;
  }
  return valores;
}

type Campos = {
  paciente_id: string;
  profissional_id: string;
  procedimento_id: string;
  inicio: Date;
  duracao_min: number;
  valor: number;
  observacoes: string | null;
};

function validar(
  dados: FormData,
): { erros: ErrosAtendimento; valores: Record<string, string> } | { campos: Campos } {
  const erros: ErrosAtendimento = {};

  const pacienteId = texto(dados, "paciente_id");
  const profissionalId = texto(dados, "profissional_id");
  const procedimentoId = texto(dados, "procedimento_id");
  const data = texto(dados, "data");
  const hora = texto(dados, "hora");
  const duracao = lerDuracao(texto(dados, "duracao_min"));
  const valor = lerValorEmReais(texto(dados, "valor"));
  const observacoes = texto(dados, "observacoes").slice(0, 2000);

  if (!UUID.test(pacienteId)) erros.paciente_id = "Escolha a paciente.";
  if (!UUID.test(profissionalId)) erros.profissional_id = "Escolha quem atende.";
  if (!UUID.test(procedimentoId)) erros.procedimento_id = "Escolha o procedimento.";

  let inicio: Date | null = null;
  const dataOk = /^\d{4}-\d{2}-\d{2}$/.test(data);
  const horaOk = /^([01]\d|2[0-3]):[0-5]\d$/.test(hora);

  if (!dataOk) erros.data = "Informe a data.";
  if (!horaOk) erros.hora = "Informe a hora.";

  if (dataOk && horaOk) {
    const [ano, mes, dia] = data.split("-").map(Number);
    const [h, m] = hora.split(":").map(Number);
    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
      erros.data = "Data inválida.";
    } else {
      // Hora de parede da clínica, não do servidor.
      inicio = instanteNaClinica(ano, mes, dia, h, m);
    }
  }

  if (duracao === null) erros.duracao_min = "Duração em minutos, de 5 a 480.";
  if (valor === null) erros.valor = "Valor inválido. Use 150 ou 150,00.";

  if (Object.keys(erros).length > 0) {
    return { erros, valores: digitados(dados) };
  }

  return {
    campos: {
      paciente_id: pacienteId,
      profissional_id: profissionalId,
      procedimento_id: procedimentoId,
      inicio: inicio!,
      duracao_min: duracao!,
      valor: valor!,
      observacoes: observacoes || null,
    },
  };
}

/**
 * Choque de horário com outro atendimento do mesmo profissional.
 *
 * Cancelados e ausências liberam o horário. A comparação é feita aqui e não
 * no banco porque o PostgREST não filtra por `inicio + duracao`, e um dia de
 * agenda tem dezenas de linhas, não milhares.
 */
async function conflitoDeHorario(
  campos: Campos,
  ignorarId: string | null,
): Promise<string | null> {
  const supabase = await clienteServidor();

  const fim = new Date(campos.inicio.getTime() + campos.duracao_min * 60_000);
  // Só o dia do novo horário: atendimento não atravessa a madrugada.
  const { data } = await supabase
    .from("atendimentos")
    .select("id, inicio, duracao_min, pacientes ( nome, nome_social )")
    .eq("profissional_id", campos.profissional_id)
    .not("situacao", "in", "(cancelado,ausente)")
    .gte("inicio", new Date(campos.inicio.getTime() - 8 * 3_600_000).toISOString())
    .lt("inicio", fim.toISOString());

  for (const outro of data ?? []) {
    if (outro.id === ignorarId) continue;
    const outroInicio = new Date(outro.inicio).getTime();
    const outroFim = outroInicio + outro.duracao_min * 60_000;
    if (outroInicio < fim.getTime() && outroFim > campos.inicio.getTime()) {
      const nome = outro.pacientes?.nome_social || outro.pacientes?.nome || "outra paciente";
      return `Choca com o atendimento de ${nome} às ${formatarHora(new Date(outro.inicio))}.`;
    }
  }

  return null;
}

function paraAgendaDoDia(inicio: Date): never {
  revalidatePath("/agenda");
  revalidatePath("/");
  redirect(`/agenda?dia=${chaveDoDia(inicio)}`);
}

export async function marcarAtendimento(
  _anterior: EstadoAtendimento,
  dados: FormData,
): Promise<EstadoAtendimento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return resultado;

  const choque = await conflitoDeHorario(resultado.campos, null);
  if (choque) return { erros: { hora: choque }, valores: digitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("atendimentos").insert({
    ...resultado.campos,
    inicio: resultado.campos.inicio.toISOString(),
    criado_por: usuario.id,
  });

  if (error) {
    return {
      erros: { geral: `Não foi possível marcar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  paraAgendaDoDia(resultado.campos.inicio);
}

export async function atualizarAtendimento(
  _anterior: EstadoAtendimento,
  dados: FormData,
): Promise<EstadoAtendimento> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = texto(dados, "id");
  if (!UUID.test(id)) return { erros: { geral: "Atendimento não identificado." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return resultado;

  const choque = await conflitoDeHorario(resultado.campos, id);
  if (choque) return { erros: { hora: choque }, valores: digitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("atendimentos")
    .update({
      ...resultado.campos,
      inicio: resultado.campos.inicio.toISOString(),
    })
    .eq("id", id);

  if (error) {
    return {
      erros: { geral: `Não foi possível salvar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  revalidatePath(`/agenda/${id}/editar`);
  paraAgendaDoDia(resultado.campos.inicio);
}

export type PacienteParaSelecao = { id: string; nome: string; detalhe: string };

/**
 * Busca de paciente para o seletor do formulário.
 *
 * É uma ação de servidor porque o seletor é componente de cliente: ele chama
 * esta função direto, sem rota de API. Reusa a mesma consulta da listagem —
 * mesmo escape de termo, mesma RLS.
 */
export async function buscarPacientesParaSelecao(
  termo: string,
): Promise<PacienteParaSelecao[]> {
  const usuario = await usuarioAtual();
  if (!usuario) return [];

  const { listarPacientes } = await import("@/server/consultas/pacientes");
  const resultado = await listarPacientes({ busca: termo.slice(0, 80) });

  return resultado.itens.slice(0, 8).map((p) => ({
    id: p.id,
    nome: p.exibicao,
    detalhe:
      [p.telefone, p.email].filter(Boolean).join(" · ") || "sem contato cadastrado",
  }));
}

/**
 * Muda a situação. Aceita qualquer situação válida e diferente da atual —
 * engano precisa ter volta — e a interface é quem oferece só os caminhos que
 * fazem sentido. O gatilho no banco grava quem mudou e quando.
 */
export async function mudarSituacao(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  const id = texto(dados, "id");
  const para = texto(dados, "para") as SituacaoAtendimento;
  if (!UUID.test(id) || !SITUACOES_VALIDAS.includes(para)) return;

  const supabase = await clienteServidor();
  await supabase
    .from("atendimentos")
    .update({ situacao: para })
    .eq("id", id)
    .neq("situacao", para);

  revalidatePath("/agenda");
  revalidatePath("/");
}
