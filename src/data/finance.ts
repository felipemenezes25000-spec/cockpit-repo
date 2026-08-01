import { hoje, somarDias, somarMeses } from "@/lib/dates";
import type { Despesa, PontoMensal, Recebimento } from "./types";

/**
 * Financeiro fictício.
 *
 * Os recebimentos já quitados são distribuídos entre o dia 1º e hoje, para que
 * o mês corrente tenha sempre movimento na demonstração, independentemente do
 * dia em que o sistema for aberto. Os valores em aberto ficam à frente de hoje.
 */

type RascunhoRecebimento = Omit<Recebimento, "emDias">;

const QUITADOS: RascunhoRecebimento[] = [
  { id: "rec-1", pacienteId: "pac-10", procedimentoId: "proc-8", valor: 0, situacao: "recebido", forma: "Pix" },
  { id: "rec-2", pacienteId: "pac-2", procedimentoId: "proc-4", valor: 320, situacao: "recebido", forma: "Pix" },
  { id: "rec-3", pacienteId: "pac-4", procedimentoId: "proc-3", valor: 1200, situacao: "recebido", forma: "Cartão de crédito" },
  { id: "rec-4", pacienteId: "pac-8", procedimentoId: "proc-7", valor: 2600, situacao: "recebido", forma: "Cartão de crédito" },
  { id: "rec-5", pacienteId: "pac-1", procedimentoId: "proc-1", valor: 1450, situacao: "recebido", forma: "Pix" },
  { id: "rec-6", pacienteId: "pac-6", procedimentoId: "proc-6", valor: 540, situacao: "recebido", forma: "Cartão de débito" },
  { id: "rec-7", pacienteId: "pac-13", procedimentoId: "proc-1", valor: 1450, situacao: "recebido", forma: "Cartão de crédito" },
  { id: "rec-8", pacienteId: "pac-9", procedimentoId: "proc-3", valor: 1200, situacao: "recebido", forma: "Pix" },
  { id: "rec-9", pacienteId: "pac-14", procedimentoId: "proc-4", valor: 320, situacao: "recebido", forma: "Dinheiro" },
  { id: "rec-10", pacienteId: "pac-11", procedimentoId: "proc-9", valor: 260, situacao: "recebido", forma: "Pix" },
  { id: "rec-11", pacienteId: "pac-12", procedimentoId: "proc-5", valor: 680, situacao: "recebido", forma: "Cartão de crédito" },
  { id: "rec-12", pacienteId: "pac-16", procedimentoId: "proc-6", valor: 540, situacao: "recebido", forma: "Pix" },
  { id: "rec-13", pacienteId: "pac-5", procedimentoId: "proc-5", valor: 680, situacao: "recebido", forma: "Cartão de débito" },
  { id: "rec-14", pacienteId: "pac-7", procedimentoId: "proc-2", valor: 2100, situacao: "recebido", forma: "Cartão de crédito" },
];

const EM_ABERTO: Array<RascunhoRecebimento & { emDias: number }> = [
  { id: "rec-15", pacienteId: "pac-16", procedimentoId: "proc-6", valor: 270, situacao: "em_aberto", forma: "Pix", emDias: -3 },
  { id: "rec-16", pacienteId: "pac-5", procedimentoId: "proc-5", valor: 340, situacao: "em_aberto", forma: "Pix", emDias: 4 },
  { id: "rec-17", pacienteId: "pac-3", procedimentoId: "proc-1", valor: 725, situacao: "em_aberto", forma: "Cartão de crédito", emDias: 9 },
  { id: "rec-18", pacienteId: "pac-15", procedimentoId: "proc-7", valor: 1300, situacao: "em_aberto", forma: "Cartão de crédito", emDias: 14 },
  { id: "rec-19", pacienteId: "pac-1", procedimentoId: "proc-1", valor: 725, situacao: "em_aberto", forma: "Cartão de crédito", emDias: 21 },
];

/** Espalha os recebimentos quitados entre o dia 1º e hoje. */
function distribuirNoMes(itens: RascunhoRecebimento[]): Recebimento[] {
  const diaAtual = hoje().getDate();
  const ultimo = Math.max(itens.length - 1, 1);

  return itens.map((item, i) => {
    const dia = 1 + Math.round((i * (diaAtual - 1)) / ultimo);
    return { ...item, emDias: dia - diaAtual };
  });
}

export const RECEBIMENTOS: Recebimento[] = [...distribuirNoMes(QUITADOS), ...EM_ABERTO];

const DESPESAS_BASE: Array<Omit<Despesa, "emDias">> = [
  { id: "des-1", descricao: "Reposição de toxina e preenchedores", categoria: "Produtos", valor: 4820 },
  { id: "des-2", descricao: "Aluguel da sala", categoria: "Estrutura", valor: 3200 },
  { id: "des-3", descricao: "Equipe de apoio", categoria: "Equipe", valor: 2900 },
  { id: "des-4", descricao: "Descartáveis e higienização", categoria: "Produtos", valor: 760 },
  { id: "des-5", descricao: "Gestão de redes sociais", categoria: "Marketing", valor: 1100 },
  { id: "des-6", descricao: "Energia, água e internet", categoria: "Estrutura", valor: 690 },
  { id: "des-7", descricao: "Impostos do mês", categoria: "Impostos", valor: 1840 },
];

export const DESPESAS: Despesa[] = DESPESAS_BASE.map((d, i) => {
  const diaAtual = hoje().getDate();
  const dia = 1 + Math.round((i * (diaAtual - 1)) / Math.max(DESPESAS_BASE.length - 1, 1));
  return { ...d, emDias: dia - diaAtual };
});

/** Recebido nos cinco meses anteriores. O mês corrente é somado a partir dos lançamentos. */
const HISTORICO_ANTERIOR = [21400, 24950, 19800, 27300, 25150];

export function serieMensal(): PontoMensal[] {
  const referencia = hoje();
  const doMes = RECEBIMENTOS.filter(
    (r) => r.situacao === "recebido" && r.emDias <= 0,
  ).reduce((total, r) => total + r.valor, 0);

  const anteriores: PontoMensal[] = HISTORICO_ANTERIOR.map((recebido, i) => ({
    data: somarMeses(referencia, i - 5),
    recebido,
  }));

  return [...anteriores, { data: somarMeses(referencia, 0), recebido: doMes }];
}

export function dataDoRecebimento(r: Recebimento): Date {
  return somarDias(hoje(), r.emDias);
}

export function dataDaDespesa(d: Despesa): Date {
  return somarDias(hoje(), d.emDias);
}
