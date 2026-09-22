import "server-only";

import { falhaDeConsulta } from "@/lib/registro";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { aniversarioNesteAno, dataDoBanco, diferencaEmDias, partesDoDia } from "@/lib/dates";

export type Aniversariante = {
  id: string;
  nome: string;
  data: Date;
  /** Negativo quando já passou neste mês. */
  emDias: number;
  ultimoAtendimento: Date | null;
};

/**
 * Aniversariantes do mês corrente, das datas mais próximas para as distantes.
 *
 * O filtro por mês é feito aqui e não no banco porque o PostgREST não expõe
 * `extract(month from ...)` em filtro. O volume de pacientes de uma clínica
 * torna isso irrelevante em desempenho.
 */
export const aniversariantesDoMes = cache(async (): Promise<Aniversariante[]> => {
  const supabase = await clienteServidor();
  const { mes } = partesDoDia();

  const { data, error } = await supabase
    .from("pacientes")
    .select("id, nome, nome_social, data_nascimento")
    .eq("ativo", true)
    .not("data_nascimento", "is", null);

  if (error) {
    falhaDeConsulta("consulta aniversarios", error, "Não foi possível carregar os aniversariantes.");
  }

  const doMes = (data ?? []).filter((p) => {
    if (!p.data_nascimento) return false;
    return partesDoDia(dataDoBanco(p.data_nascimento)).mes === mes;
  });

  if (doMes.length === 0) return [];

  // Último atendimento de cada aniversariante, em uma consulta só.
  const { data: atendimentos, error: erroAtendimentos } = await supabase
    .from("atendimentos")
    .select("paciente_id, inicio")
    .in(
      "paciente_id",
      doMes.map((p) => p.id),
    )
    .eq("situacao", "concluido")
    .order("inicio", { ascending: false });

  if (erroAtendimentos) {
    falhaDeConsulta(
      "consulta aniversarios: último atendimento",
      erroAtendimentos,
      "Não foi possível carregar os aniversariantes.",
    );
  }

  const ultimoPorPaciente = new Map<string, Date>();
  for (const a of atendimentos ?? []) {
    if (!ultimoPorPaciente.has(a.paciente_id)) {
      ultimoPorPaciente.set(a.paciente_id, new Date(a.inicio));
    }
  }

  return doMes
    .map((p) => {
      const data = aniversarioNesteAno(dataDoBanco(p.data_nascimento!));
      return {
        id: p.id,
        nome: p.nome_social || p.nome,
        data,
        emDias: diferencaEmDias(data),
        ultimoAtendimento: ultimoPorPaciente.get(p.id) ?? null,
      };
    })
    .sort((a, b) => partesDoDia(a.data).dia - partesDoDia(b.data).dia);
});
