import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { inicioDoDia, inicioDoDiaSeguinte } from "@/lib/dates";
import type { Database } from "@/lib/supabase/tipos-banco";

export type SituacaoAtendimento =
  Database["public"]["Enums"]["situacao_atendimento"];

export type AtendimentoDoDia = {
  id: string;
  inicio: Date;
  duracaoMin: number;
  situacao: SituacaoAtendimento;
  paciente: string;
  profissional: string;
  procedimento: string;
};

/**
 * Atendimentos de hoje, na ordem do relógio.
 *
 * O recorte do dia usa o calendário de São Paulo: perto da meia-noite o dia do
 * servidor e o da clínica são diferentes.
 */
export const atendimentosDeHoje = cache(async (): Promise<AtendimentoDoDia[]> => {
  const supabase = await clienteServidor();

  const { data, error } = await supabase
    .from("atendimentos")
    .select(
      `id, inicio, duracao_min, situacao,
       pacientes ( nome, nome_social ),
       profissionais ( nome ),
       procedimentos ( nome )`,
    )
    .gte("inicio", inicioDoDia().toISOString())
    .lt("inicio", inicioDoDiaSeguinte().toISOString())
    .order("inicio", { ascending: true });

  if (error) throw new Error(`Não foi possível carregar a agenda: ${error.message}`);

  return (data ?? []).map((linha) => ({
    id: linha.id,
    inicio: new Date(linha.inicio),
    duracaoMin: linha.duracao_min,
    situacao: linha.situacao,
    // Nome social tem precedência sempre que preenchido.
    paciente: linha.pacientes?.nome_social || linha.pacientes?.nome || "Paciente",
    profissional: linha.profissionais?.nome ?? "",
    procedimento: linha.procedimentos?.nome ?? "",
  }));
});
