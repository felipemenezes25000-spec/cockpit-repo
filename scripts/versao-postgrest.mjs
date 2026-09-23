/**
 * `supabase gen types --local` não emite o bloco `__InternalSupabase`; o
 * `--linked` emite. Sem ele, o `createClient<Database>` do supabase-js passa a
 * tipar o cliente como PostgREST 12, e o arquivo oscila a cada geração
 * local/linked. Esta função reinjeta o bloco quando ele falta.
 *
 * Mantenha `VERSAO_POSTGREST` igual à do projeto de produção (a que o
 * `npm run db:tipos` escreve).
 */

export const VERSAO_POSTGREST = "14.5";

const ABERTURA = "export type Database = {\n";

/**
 * @param {string} saida conteúdo gerado pelo Supabase CLI
 * @param {string} [versao]
 * @returns {string}
 */
export function garantirVersaoPostgrest(saida, versao = VERSAO_POSTGREST) {
  if (saida.includes("__InternalSupabase: {")) return saida;
  const quebra = saida.includes("\r\n") ? "\r\n" : "\n";
  const abertura = ABERTURA.replace("\n", quebra);
  if (!saida.includes(abertura)) return saida;
  const bloco = [
    "  // Allows to automatically instantiate createClient with right options",
    "  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)",
    "  __InternalSupabase: {",
    `    PostgrestVersion: "${versao}"`,
    "  }",
    "",
  ].join(quebra);
  return saida.replace(abertura, abertura + bloco);
}
