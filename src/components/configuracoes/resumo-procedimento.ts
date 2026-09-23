import { formatarMoeda } from "@/lib/format";
import type { Procedimento } from "@/server/consultas/procedimentos";

type DadosDoResumo = Pick<Procedimento, "duracaoMin" | "valorPadrao" | "retornoSugeridoDias" | "usos">;

/**
 * A linha de detalhes de um procedimento na tabela: duração, valor, retorno e
 * uso. Singular e plural contam — "retorno em 1 dias" parecia erro de digitação.
 */
export function resumoDoProcedimento(p: DadosDoResumo): string {
  const partes = [`${p.duracaoMin} min`];
  partes.push(p.valorPadrao > 0 ? formatarMoeda(p.valorPadrao) : "sem valor de tabela");
  partes.push(
    p.retornoSugeridoDias
      ? `retorno em ${p.retornoSugeridoDias} ${p.retornoSugeridoDias === 1 ? "dia" : "dias"}`
      : "sem retorno sugerido",
  );
  if (p.usos > 0) partes.push(`${p.usos} ${p.usos === 1 ? "atendimento" : "atendimentos"}`);
  return partes.join(" · ");
}
