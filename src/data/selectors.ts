import { hoje, mesmoMes, somarDias } from "@/lib/dates";
import { ATENDIMENTOS_HOJE } from "./appointments";
import { DESPESAS, RECEBIMENTOS } from "./finance";
import { RETORNOS } from "./returns";

/**
 * Indicadores derivados dos dados fictícios.
 *
 * Nenhum número da Visão Geral é escrito direto no componente: tudo passa por
 * aqui, para que a tela continue coerente quando os mocks mudarem.
 */

export function totalAtendimentosHoje(): number {
  return ATENDIMENTOS_HOJE.filter((a) => a.situacao !== "cancelado").length;
}

export function atendimentosConfirmados(): number {
  return ATENDIMENTOS_HOJE.filter((a) => a.situacao === "confirmado").length;
}

export function confirmacoesPendentes(): number {
  return ATENDIMENTOS_HOJE.filter((a) => a.situacao === "aguardando_confirmacao").length;
}

export function pacientesAguardandoRetorno(): number {
  return RETORNOS.length;
}

/** Soma dos recebimentos já quitados dentro do mês corrente. */
export function recebidoNoMes(): number {
  const referencia = hoje();
  return RECEBIMENTOS.filter(
    (r) => r.situacao === "recebido" && mesmoMes(somarDias(referencia, r.emDias), referencia),
  ).reduce((total, r) => total + r.valor, 0);
}

/** Tudo que está em aberto, inclusive vencido. */
export function valoresAReceber(): number {
  return RECEBIMENTOS.filter((r) => r.situacao === "em_aberto").reduce(
    (total, r) => total + r.valor,
    0,
  );
}

export function valoresVencidos(): number {
  return RECEBIMENTOS.filter((r) => r.situacao === "em_aberto" && r.emDias < 0).reduce(
    (total, r) => total + r.valor,
    0,
  );
}

export function despesasDoMes(): number {
  const referencia = hoje();
  return DESPESAS.filter((d) => mesmoMes(somarDias(referencia, d.emDias), referencia)).reduce(
    (total, d) => total + d.valor,
    0,
  );
}

export function atendimentosConcluidosHoje(): number {
  return ATENDIMENTOS_HOJE.filter((a) => a.situacao === "concluido").length;
}
