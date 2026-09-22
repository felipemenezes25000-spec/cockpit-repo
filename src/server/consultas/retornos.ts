import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { dataDoBanco, diferencaEmDias, somarDias } from "@/lib/dates";
import type { Database } from "@/lib/supabase/tipos-banco";

export type SituacaoAcompanhamento =
  Database["public"]["Enums"]["situacao_acompanhamento"];

export const ROTULO_ACOMPANHAMENTO: Record<SituacaoAcompanhamento, string> = {
  nao_iniciado: "Sem contato",
  em_contato: "Em contato",
  aguardando_resposta: "Aguardando resposta",
  agendado: "Agendado",
  recusado: "Recusado",
};

export type JanelaContato = {
  intervaloSugerido: number;
  /** Negativo quando o período sugerido já passou. */
  diasAteSugerido: number;
  /** Posição dentro da janela, de 0 a 1. */
  progresso: number;
  fase: "aguardando" | "no_periodo" | "passou";
};

export type RetornoEmAberto = {
  id: string;
  paciente: string;
  procedimento: string;
  ultimoAtendimento: Date;
  situacao: SituacaoAcompanhamento;
  janela: JanelaContato;
};

/**
 * Onde a paciente está dentro do período sugerido de contato.
 * A faixa "no período" começa a 85% do intervalo.
 *
 * Os prazos são demonstrativos e ainda serão definidos pela equipe — não são
 * recomendação clínica.
 */
function calcularJanela(intervalo: number, decorridos: number): JanelaContato {
  const razao = intervalo > 0 ? decorridos / intervalo : 1;

  return {
    intervaloSugerido: intervalo,
    diasAteSugerido: intervalo - decorridos,
    progresso: Math.max(0, Math.min(1, razao)),
    fase: razao >= 1.15 ? "passou" : razao >= 0.85 ? "no_periodo" : "aguardando",
  };
}

/** Mais urgente primeiro: quem passou mais do período sugerido. */
export const retornosEmAberto = cache(async (): Promise<RetornoEmAberto[]> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("retornos")
    .select(
      `id, sugerido_para, situacao,
       pacientes ( nome, nome_social ),
       procedimentos ( nome, retorno_sugerido_dias )`,
    )
    .not("situacao", "in", "(agendado,recusado)")
    .order("sugerido_para", { ascending: true });

  if (error) falhaDeConsulta("consulta retornos", error, "Não foi possível carregar os retornos.");

  return (data ?? [])
    .map((linha) => {
      const sugeridoPara = dataDoBanco(linha.sugerido_para);
      const intervalo = linha.procedimentos?.retorno_sugerido_dias ?? 90;
      // O último atendimento é o ponto de partida da janela.
      const ultimoAtendimento = somarDias(sugeridoPara, -intervalo);
      const decorridos = diferencaEmDias(new Date(), ultimoAtendimento);

      return {
        id: linha.id,
        paciente: linha.pacientes?.nome_social || linha.pacientes?.nome || "Paciente",
        procedimento: linha.procedimentos?.nome ?? "Procedimento",
        ultimoAtendimento,
        situacao: linha.situacao,
        janela: calcularJanela(intervalo, decorridos),
      };
    })
    .sort((a, b) => b.janela.progresso - a.janela.progresso);
});

export const totalAguardandoRetorno = cache(async (): Promise<number> => {
  const supabase = await clienteServidor();
  const { count, error } = await supabase
    .from("retornos")
    .select("id", { count: "exact", head: true })
    .not("situacao", "in", "(agendado,recusado)");

  if (error) falhaDeConsulta("consulta retornos", error, "Não foi possível contar os retornos.");
  return count ?? 0;
});
