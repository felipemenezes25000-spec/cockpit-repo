import "server-only";

import { cache } from "react";
import { clienteServidor } from "@/lib/supabase/server";
import { aniversarioNesteAno, dataDoBanco, diferencaEmDias, partesDoDia } from "@/lib/dates";
import { todasAsLinhas } from "./todas-as-linhas";

/** Quantos ids de paciente cabem num `.in()` sem a URL passar do limite do gateway. */
const IDS_POR_LOTE = 100;

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
 * `extract(month from ...)` em filtro. Por isso as pacientes são lidas
 * inteiras, em blocos (`todasAsLinhas`): o PostgREST corta cada resposta em
 * 1000 linhas sem erro, e acima disso aniversariantes sumiriam do painel
 * calados — a importação por planilha sozinha passa desse número.
 */
export const aniversariantesDoMes = cache(async (): Promise<Aniversariante[]> => {
  const supabase = await clienteServidor();
  const { mes } = partesDoDia();
  const frase = "Não foi possível carregar os aniversariantes.";

  const pacientes = await todasAsLinhas(
    (inicio, fim) =>
      supabase
        .from("pacientes")
        .select("id, nome, nome_social, data_nascimento")
        .eq("ativo", true)
        .not("data_nascimento", "is", null)
        .order("id")
        .range(inicio, fim),
    "consulta aniversarios",
    frase,
  );

  const doMes = pacientes.filter((p) => {
    if (!p.data_nascimento) return false;
    return partesDoDia(dataDoBanco(p.data_nascimento)).mes === mes;
  });

  if (doMes.length === 0) return [];

  // Último atendimento de cada aniversariante. Também em blocos: são todos os
  // atendimentos concluídos dessas pacientes, e um corte aqui mostraria uma
  // data antiga como "último atendimento". A ordem de leitura é a do `id`
  // (estável entre blocos); o mais recente sai da comparação abaixo.
  //
  // Os ids vão em lotes: `.in()` vira query string, e cada id custa cerca de
  // 40 caracteres. Com algumas centenas de aniversariantes no mês a URL
  // passaria do limite do gateway (8 KB é o comum) e a Visão Geral inteira
  // cairia na tela de erro.
  const ids = doMes.map((p) => p.id);
  const atendimentos: { paciente_id: string; inicio: string }[] = [];
  for (let de = 0; de < ids.length; de += IDS_POR_LOTE) {
    const lote = ids.slice(de, de + IDS_POR_LOTE);
    atendimentos.push(
      ...(await todasAsLinhas(
        (inicio, fim) =>
          supabase
            .from("atendimentos")
            .select("paciente_id, inicio")
            .in("paciente_id", lote)
            .eq("situacao", "concluido")
            .order("id")
            .range(inicio, fim),
        "consulta aniversarios: último atendimento",
        frase,
      )),
    );
  }

  const ultimoPorPaciente = new Map<string, Date>();
  for (const a of atendimentos) {
    const quando = new Date(a.inicio);
    const anterior = ultimoPorPaciente.get(a.paciente_id);
    if (!anterior || quando.getTime() > anterior.getTime()) {
      ultimoPorPaciente.set(a.paciente_id, quando);
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
