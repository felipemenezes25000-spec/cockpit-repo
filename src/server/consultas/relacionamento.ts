import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, inicioDoDia, partesDoDia, somarDias } from "@/lib/dates";
import type { Prioridade, SituacaoAcompanhamento, SituacaoAtendimento, TipoPendencia } from "@/lib/dominio";
import { ORIGENS_CONTATO, TIPOS_TAREFA, tipoContatoDaOrigem, type TipoContato } from "@/lib/relacionamento";

export type PacienteContato = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  nascimento: string | null;
};

export type Confirmacao = {
  id: string;
  pacienteId: string;
  paciente: string;
  telefone: string | null;
  email: string | null;
  procedimento: string;
  inicio: Date;
  situacao: SituacaoAtendimento;
};

export type RetornoRelacionamento = {
  id: string;
  pacienteId: string;
  paciente: string;
  telefone: string | null;
  procedimento: string | null;
  sugeridoPara: Date;
  situacao: SituacaoAcompanhamento;
  observacoes: string | null;
};

export type TarefaRelacionamento = {
  id: string;
  pacienteId: string | null;
  paciente: string | null;
  tipo: TipoPendencia;
  descricao: string;
  prazo: Date | null;
  prioridade: Prioridade;
  situacao: "aberta" | "resolvida" | "cancelada";
};

export type AniversarioRelacionamento = PacienteContato & { dia: number };
export type AvaliacaoCandidata = PacienteContato & { ultimoAtendimento: Date };
export type ContatoRegistrado = {
  id: string;
  pacienteId: string;
  paciente: string;
  tipo: TipoContato;
  descricao: string;
  quando: Date;
};

export const pacientesParaRelacionamento = cache(async (): Promise<PacienteContato[]> => {
  const supabase = await clienteServidor();
  const pacientes: PacienteContato[] = [];
  const tamanho = 500;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nome, nome_social, telefone, email, data_nascimento")
      .eq("ativo", true)
      .order("id")
      .range(inicio, inicio + tamanho - 1);
    if (error) falhaDeConsulta("consulta relacionamento", error, "Não foi possível carregar as pacientes.");
    pacientes.push(...(data ?? []).map((p) => ({
      id: p.id,
      nome: p.nome_social || p.nome,
      telefone: p.telefone,
      email: p.email,
      nascimento: p.data_nascimento,
    })));
    if ((data?.length ?? 0) < tamanho) break;
  }
  return pacientes;
});

export const confirmacoesParaContato = cache(async (): Promise<Confirmacao[]> => {
  const supabase = await clienteServidor();
  const inicio = inicioDoDia();
  const fim = somarDias(inicio, 15);
  const { data, error } = await supabase
    .from("atendimentos")
    .select("id, paciente_id, inicio, situacao, pacientes(nome, nome_social, telefone, email), procedimentos(nome)")
    .in("situacao", ["agendado", "aguardando_confirmacao"])
    .gte("inicio", inicio.toISOString())
    .lt("inicio", fim.toISOString())
    .order("inicio");
  if (error) falhaDeConsulta("consulta relacionamento", error, "Não foi possível carregar as confirmações.");
  return (data ?? []).map((a) => ({
    id: a.id,
    pacienteId: a.paciente_id,
    paciente: a.pacientes?.nome_social || a.pacientes?.nome || "Paciente",
    telefone: a.pacientes?.telefone ?? null,
    email: a.pacientes?.email ?? null,
    procedimento: a.procedimentos?.nome ?? "Procedimento",
    inicio: new Date(a.inicio),
    situacao: a.situacao,
  }));
});

export const retornosParaContato = cache(async (): Promise<RetornoRelacionamento[]> => {
  const supabase = await clienteServidor();
  const retornos: RetornoRelacionamento[] = [];
  const tamanho = 500;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await supabase
      .from("retornos")
      .select("id, paciente_id, sugerido_para, situacao, observacoes, pacientes(nome, nome_social, telefone), procedimentos(nome)")
      .order("sugerido_para").order("id")
      .range(inicio, inicio + tamanho - 1);
    if (error) falhaDeConsulta("consulta relacionamento", error, "Não foi possível carregar os retornos.");
    retornos.push(...(data ?? []).map((r) => ({
      id: r.id,
      pacienteId: r.paciente_id,
      paciente: r.pacientes?.nome_social || r.pacientes?.nome || "Paciente",
      telefone: r.pacientes?.telefone ?? null,
      procedimento: r.procedimentos?.nome ?? null,
      sugeridoPara: dataDoBanco(r.sugerido_para),
      situacao: r.situacao,
      observacoes: r.observacoes,
    })));
    if ((data?.length ?? 0) < tamanho) break;
  }
  return retornos;
});

export const tarefasDeContato = cache(async (): Promise<TarefaRelacionamento[]> => {
  const supabase = await clienteServidor();
  const tarefas: TarefaRelacionamento[] = [];
  const tamanho = 500;
  for (let inicio = 0; ; inicio += tamanho) {
    const { data, error } = await supabase
      .from("pendencias")
      .select("id, paciente_id, tipo, descricao, prazo, prioridade, situacao, pacientes(nome, nome_social)")
      .in("tipo", [...TIPOS_TAREFA])
      // Registro de contato também mora em `pendencias`, mas não é tarefa (0025).
      .eq("origem", "tarefa")
      .order("prazo", { ascending: true, nullsFirst: false }).order("id")
      .range(inicio, inicio + tamanho - 1);
    if (error) falhaDeConsulta("consulta relacionamento", error, "Não foi possível carregar as tarefas de contato.");
    tarefas.push(...(data ?? []).map((t) => ({
      id: t.id,
      pacienteId: t.paciente_id,
      paciente: t.pacientes?.nome_social || t.pacientes?.nome || null,
      tipo: t.tipo,
      descricao: t.descricao,
      prazo: t.prazo ? dataDoBanco(t.prazo) : null,
      prioridade: t.prioridade,
      situacao: t.situacao,
    })));
    if ((data?.length ?? 0) < tamanho) break;
  }
  return tarefas;
});

export async function aniversariosDoMes(mes: number): Promise<AniversarioRelacionamento[]> {
  const pacientes = await pacientesParaRelacionamento();
  return pacientes
    .filter((p) => p.nascimento && partesDoDia(dataDoBanco(p.nascimento)).mes === mes)
    .map((p) => ({ ...p, dia: partesDoDia(dataDoBanco(p.nascimento!)).dia }))
    .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome, "pt-BR"));
}

export const candidatasAAvaliacao = cache(async (): Promise<AvaliacaoCandidata[]> => {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("atendimentos")
    .select("paciente_id, inicio, pacientes(id, nome, nome_social, telefone, email, data_nascimento, ativo)")
    .eq("situacao", "concluido")
    .order("inicio", { ascending: false })
    .limit(100);
  if (error) falhaDeConsulta("consulta relacionamento", error, "Não foi possível carregar as pacientes para avaliação.");

  const vistas = new Set<string>();
  return (data ?? []).flatMap((a) => {
    const p = a.pacientes;
    if (!p || !p.ativo || vistas.has(p.id)) return [];
    vistas.add(p.id);
    return [{
      id: p.id,
      nome: p.nome_social || p.nome,
      telefone: p.telefone,
      email: p.email,
      nascimento: p.data_nascimento,
      ultimoAtendimento: new Date(a.inicio),
    }];
  });
});

export const contatosRegistrados = cache(async (): Promise<ContatoRegistrado[]> => {
  const supabase = await clienteServidor();
  const { data, error } = await supabase.from("pendencias")
    .select("id, paciente_id, origem, descricao, resolvida_em, pacientes(nome, nome_social)")
    // Pela coluna `origem` (0025), não pelo texto: o banco garante que
    // registro de contato é concluído, com paciente e hora.
    .in("origem", ORIGENS_CONTATO)
    .not("resolvida_em", "is", null)
    .order("resolvida_em", { ascending: false })
    .limit(200);
  if (error) falhaDeConsulta("consulta relacionamento", error, "Não foi possível carregar os contatos registrados.");

  return (data ?? []).flatMap((t) => {
    const tipo = tipoContatoDaOrigem(t.origem);
    if (!tipo || !t.paciente_id || !t.resolvida_em) return [];
    return [{
      id: t.id,
      pacienteId: t.paciente_id,
      paciente: t.pacientes?.nome_social || t.pacientes?.nome || "Paciente",
      tipo,
      descricao: t.descricao,
      quando: new Date(t.resolvida_em),
    }];
  });
});
