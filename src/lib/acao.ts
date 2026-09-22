/**
 * O contrato das ações de botão — arquivar, mudar situação, ativar,
 * revogar, pagar.
 *
 * Antes elas devolviam `Promise<void>`: se o banco recusasse, a página
 * revalidava, nada mudava na tela e ninguém era avisado (AGENTS.md §13, dívida
 * 2). Agora toda ação de botão devolve o que aconteceu, e o
 * `FormularioDeAcao` mostra a frase ao lado do botão.
 *
 * Mora fora dos arquivos `"use server"` porque eles só podem exportar função
 * assíncrona — a constante do estado inicial quebraria a ação em tempo de
 * execução.
 */

export type ResultadoAcao = {
  ok: boolean;
  /** Frase para a pessoa ler. Nula quando não há nada a dizer. */
  mensagem: string | null;
};

export const ACAO_INICIAL: ResultadoAcao = { ok: true, mensagem: null };

export function sucesso(mensagem: string | null = null): ResultadoAcao {
  return { ok: true, mensagem };
}

export function falha(mensagem: string): ResultadoAcao {
  return { ok: false, mensagem };
}

export type AcaoDeBotao = (anterior: ResultadoAcao, dados: FormData) => Promise<ResultadoAcao>;
