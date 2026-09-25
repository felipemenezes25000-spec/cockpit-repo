/**
 * Painéis que a pessoa recolheu (`CardRecolhivel`), guardados num cookie —
 * não no `localStorage` — para o servidor já montar a tela com o painel
 * fechado: sem abrir e fechar sozinho ao carregar. O cookie leva só os ids
 * dos painéis ("vg-pendencias.fin-movimentacoes"), nada da paciente.
 */

export const COOKIE_RECOLHIDOS = "cockpit_recolhidos";

/** Um ano: é preferência de uso, não sessão. */
export const VIDA_RECOLHIDOS_S = 60 * 60 * 24 * 365;

const ID_VALIDO = /^[a-z0-9-]{1,40}$/;

/** Lê o valor do cookie; ignora o que não parece id de painel. */
export function lerRecolhidos(valor: string | null | undefined): string[] {
  if (!valor) return [];
  return [...new Set(valor.split(".").filter((id) => ID_VALIDO.test(id)))].slice(0, 60);
}

export function escreverRecolhidos(ids: Iterable<string>): string {
  return [...new Set(ids)].filter((id) => ID_VALIDO.test(id)).slice(0, 60).join(".");
}
