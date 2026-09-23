/** Quantos itens de cada tipo a fila da visão geral mostra. */
export const LIMITE_DA_FILA = 5;

/**
 * Recorte da fila de acompanhamento da visão geral: até `limite` tarefas e até
 * `limite` retornos, e quantos de cada ficaram de fora — para a tela avisar em
 * vez de esconder itens sem dizer nada.
 */
export function recortarFila<T, R>(tarefas: T[], retornos: R[], limite: number = LIMITE_DA_FILA) {
  return {
    tarefas: tarefas.slice(0, limite),
    retornos: retornos.slice(0, limite),
    tarefasOcultas: Math.max(0, tarefas.length - limite),
    retornosOcultos: Math.max(0, retornos.length - limite),
  };
}
