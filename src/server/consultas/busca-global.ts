import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { chaveDoDia, dataDoBanco, inicioDoDia, inicioDoDiaSeguinte } from "@/lib/dates";
import { dataDaBusca } from "@/lib/busca";
import { apenasDigitos } from "@/lib/paciente";
import { clienteServidor } from "@/lib/supabase/server";
import { listarPacientes, type PaginaDePacientes } from "./pacientes";
import { EstruturaDocumentoPendenteError, listarDocumentos, type PaginaDeDocumentos } from "./documentos";
import { EstruturaProntuarioPendenteError, listarProntuarios, type PaginaDeProntuarios } from "./prontuarios";
import type { SituacaoAtendimento } from "@/lib/dominio";

export type AtendimentoEncontrado = {
  id: string;
  paciente: string;
  procedimento: string;
  inicio: Date;
  situacao: SituacaoAtendimento;
  href: string;
};

export type ResultadoBuscaGlobal = {
  pacientes: PaginaDePacientes;
  atendimentos: AtendimentoEncontrado[];
  maisAtendimentos: boolean;
  documentos: PaginaDeDocumentos | null;
  prontuarios: PaginaDeProntuarios | null;
};

/** Prévia de atendimentos. Nunca retorna a agenda inteira ao navegador. */
const buscarAtendimentos = cache(async (termo: string): Promise<{ itens: AtendimentoEncontrado[]; mais: boolean }> => {
  const supabase = await clienteServidor();
  const data = dataDaBusca(termo);
  let consulta = supabase.from("atendimentos")
    .select("id, inicio, situacao, pacientes(nome, nome_social), procedimentos(nome)");

  if (data) {
    const dia = dataDoBanco(data);
    consulta = consulta.gte("inicio", inicioDoDia(dia).toISOString())
      .lt("inicio", inicioDoDiaSeguinte(dia).toISOString());
  } else {
    const digitos = apenasDigitos(termo);
    const alvos = [
      `nome.ilike.%${termo}%`, `nome_social.ilike.%${termo}%`,
      `telefone.ilike.%${termo}%`, `email.ilike.%${termo}%`,
    ];
    if (digitos.length >= 3) alvos.push(`cpf.ilike.%${digitos}%`, `telefone.ilike.%${digitos}%`);

    const [pacientes, procedimentos] = await Promise.all([
      supabase.from("pacientes").select("id").or(alvos.join(",")).limit(101),
      supabase.from("procedimentos").select("id").ilike("nome", `%${termo}%`).limit(101),
    ]);
    if (pacientes.error || procedimentos.error) {
      falhaDeConsulta(
        "consulta busca-global",
        pacientes.error ?? procedimentos.error,
        "Não foi possível buscar os atendimentos.",
      );
    }
    const parcial = (pacientes.data?.length ?? 0) > 100 || (procedimentos.data?.length ?? 0) > 100;
    const filtros: string[] = [];
    if (pacientes.data?.length) filtros.push(`paciente_id.in.(${pacientes.data.slice(0, 100).map((p) => p.id).join(",")})`);
    if (procedimentos.data?.length) filtros.push(`procedimento_id.in.(${procedimentos.data.slice(0, 100).map((p) => p.id).join(",")})`);
    if (filtros.length === 0) return { itens: [], mais: false };
    consulta = consulta.or(filtros.join(","));
    const { data: linhas, error } = await consulta.order("inicio", { ascending: false }).limit(9);
    if (error) falhaDeConsulta("consulta busca-global", error, "Não foi possível buscar os atendimentos.");
    return apresentarAtendimentos(linhas ?? [], parcial);
  }

  const { data: linhas, error } = await consulta.order("inicio", { ascending: false }).limit(9);
  if (error) falhaDeConsulta("consulta busca-global", error, "Não foi possível buscar os atendimentos.");
  return apresentarAtendimentos(linhas ?? [], false);
});

function apresentarAtendimentos(
  linhas: Array<{
    id: string;
    inicio: string;
    situacao: SituacaoAtendimento;
    pacientes: { nome: string; nome_social: string | null } | null;
    procedimentos: { nome: string } | null;
  }>,
  parcial: boolean,
): { itens: AtendimentoEncontrado[]; mais: boolean } {
  return {
    itens: linhas.slice(0, 8).map((linha) => {
      const inicio = new Date(linha.inicio);
      return {
        id: linha.id,
        paciente: linha.pacientes?.nome_social || linha.pacientes?.nome || "Paciente",
        procedimento: linha.procedimentos?.nome ?? "Procedimento",
        inicio,
        situacao: linha.situacao,
        href: `/agenda?dia=${chaveDoDia(inicio)}#atendimento-${linha.id}`,
      };
    }),
    mais: linhas.length > 8 || parcial,
  };
}

export const buscarGlobalmente = cache(async (termo: string, administradora: boolean): Promise<ResultadoBuscaGlobal> => {
  const [pacientes, agenda, documentos, prontuarios] = await Promise.all([
    listarPacientes({ busca: termo, situacao: "todas" }),
    buscarAtendimentos(termo),
    listarDocumentos({ busca: termo }).catch((erro: unknown) => {
      if (erro instanceof EstruturaDocumentoPendenteError) return null;
      throw erro;
    }),
    administradora
      ? listarProntuarios({ busca: termo }).catch((erro: unknown) => {
          if (erro instanceof EstruturaProntuarioPendenteError) return null;
          throw erro;
        })
      : Promise.resolve(null),
  ]);
  return {
    pacientes,
    atendimentos: agenda.itens,
    maisAtendimentos: agenda.mais,
    documentos,
    prontuarios,
  };
});
