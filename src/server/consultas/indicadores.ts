import "server-only";

import { cache } from "react";
import { atendimentosDeHoje } from "./agenda";
import { resumoFinanceiro } from "./financeiro";
import { totalAguardandoRetorno } from "./retornos";

export type Indicadores = {
  atendimentosHoje: number;
  confirmados: number;
  confirmacoesPendentes: number;
  concluidos: number;
  aguardandoRetorno: number;
  recebidoNoMes: number;
  aReceber: number;
  vencido: number;
};

/**
 * Números da Visão Geral.
 *
 * Nenhum deles é escrito direto no componente: tudo passa por aqui, para a
 * tela continuar coerente quando as regras mudarem.
 *
 * "Atendimentos de hoje" desconsidera os cancelados — decisão pendente de
 * validação com a clínica.
 */
export const indicadores = cache(async (): Promise<Indicadores> => {
  const [agenda, financeiro, aguardandoRetorno] = await Promise.all([
    atendimentosDeHoje(),
    resumoFinanceiro(),
    totalAguardandoRetorno(),
  ]);

  return {
    atendimentosHoje: agenda.filter((a) => a.situacao !== "cancelado").length,
    confirmados: agenda.filter((a) => a.situacao === "confirmado").length,
    confirmacoesPendentes: agenda.filter((a) => a.situacao === "aguardando_confirmacao")
      .length,
    concluidos: agenda.filter((a) => a.situacao === "concluido").length,
    aguardandoRetorno,
    recebidoNoMes: financeiro.recebidoNoMes,
    aReceber: financeiro.aReceber,
    vencido: financeiro.vencido,
  };
});
