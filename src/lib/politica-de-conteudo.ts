/**
 * Política de segurança de conteúdo (CSP) — com nonce por requisição.
 *
 * Quem monta e envia é o middleware (`src/middleware.ts`): a cada requisição
 * ele sorteia um nonce, põe a CSP na resposta e repete a mesma CSP (e o
 * `x-nonce`) nos cabeçalhos da requisição. O Next lê a CSP da requisição
 * enquanto renderiza, extrai o `'nonce-…'` e o aplica sozinho aos próprios
 * scripts — o runtime do React/Next, os pedaços da página e os
 * `self.__next_f.push(…)` escritos no HTML.
 *
 * Por isso toda página precisa renderizar no servidor a cada acesso: HTML
 * gerado no build não tem nonce, e os scripts dele seriam recusados. Quem
 * garante isso é o `connection()` do layout raiz (`src/app/layout.tsx`).
 *
 * Fechado:
 *
 * - `script-src`: só o que traz o nonce desta resposta, e o que esses scripts
 *   carregarem (`'strict-dynamic'` — é assim que os pedaços de JS pedidos
 *   depois pelo runtime entram). Script inline sem nonce, script injetado por
 *   XSS e script de outro domínio não rodam. `'self'` fica só para navegador
 *   sem CSP 3, que ignora `'strict-dynamic'`; os atuais ignoram o `'self'`.
 * - `<style>` e `<link rel="stylesheet">` (`style-src`), em produção: o próprio
 *   site e o que traz o nonce. Um `<style>` injetado não entra.
 * - De onde vêm imagem, fonte, conexão, formulário, `<base>`, plugin
 *   (`object-src 'none'`) e moldura. Imagem e conexão abrem só para o próprio
 *   site e o Supabase do projeto (fotos assinadas do Storage, envio de fotos e
 *   as telas de senha).
 *
 * Aberto, e por quê:
 *
 * - `style-src-attr 'unsafe-inline'`: o atributo `style="…"`. Nonce não vale
 *   para atributo — só para elemento —, e o sistema usa `style={…}` onde a
 *   medida vem do dado (altura das barras do gráfico, largura da barra de
 *   retornos, altura dos blocos da agenda do dia); o Next também escreve
 *   `style` no anunciador de rota. Fica restrito ao atributo: um atributo de
 *   estilo não executa nada nem carrega recurso de fora (`img-src` e
 *   `font-src` continuam valendo para `url(…)`).
 * - SÓ em desenvolvimento: `'unsafe-eval'` em `script-src` (o recarregamento a
 *   quente e as pilhas de erro do React usam `eval`) e `'unsafe-inline'` em
 *   `style-src` no lugar do nonce (o Next injeta o CSS em `<style>` sem nonce
 *   para trocá-lo sem recarregar). Em produção nenhum dos dois entra.
 * - `upgrade-insecure-requests` só quando o Supabase é https: com o Supabase
 *   local em `http://127.0.0.1`, subir a conexão para https quebraria tudo.
 *
 * Se algo novo precisar de outro domínio (analytics, mapa, fonte externa),
 * a CSP recusa em silêncio no console — é aqui que se abre, e só o domínio.
 *
 * Sem `server-only` e sem API do Node: roda no middleware (Edge) e nos testes.
 */

/** Cabeçalho da requisição em que o middleware entrega o nonce ao servidor. */
export const CABECALHO_NONCE = "x-nonce";

/** 128 bits aleatórios em base64 — novo a cada requisição, nunca reaproveitado. */
export function gerarNonce(): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

export function politicaDeConteudo(
  supabaseUrl: string | undefined,
  desenvolvimento: boolean,
  nonce: string,
): string {
  const supabase = origemDe(supabaseUrl);
  const supabaseWs = supabase ? supabase.replace(/^http/, "ws") : null;
  const seguro = supabase?.startsWith("https://") ?? false;
  const doNonce = `'nonce-${nonce}'`;

  const diretivas: [string, ...(string | null | false)[]][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", doNonce, "'strict-dynamic'", desenvolvimento && "'unsafe-eval'"],
    // Em desenvolvimento o Next injeta o CSS da página em `<style>` sem nonce
    // (é o que permite trocar o estilo sem recarregar). Nonce e
    // 'unsafe-inline' não convivem — com nonce, o navegador ignora o outro —,
    // então lá entra só 'unsafe-inline'. Em produção o CSS vem em arquivo.
    ["style-src", "'self'", desenvolvimento ? "'unsafe-inline'" : doNonce],
    ["style-src-attr", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", supabase],
    ["font-src", "'self'", "data:"],
    ["connect-src", "'self'", supabase, supabaseWs],
    ["media-src", "'self'", "blob:"],
    ["worker-src", "'self'", "blob:"],
    ["manifest-src", "'self'"],
    ["frame-src", "'none'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
  ];
  if (seguro) diretivas.push(["upgrade-insecure-requests"]);

  return diretivas
    .map(([nome, ...fontes]) => [nome, ...fontes.filter((f): f is string => Boolean(f))].join(" "))
    .join("; ");
}

/** `https://abc.supabase.co/rest/v1` → `https://abc.supabase.co`; lixo → null. */
function origemDe(url: string | undefined): string | null {
  if (!url || !URL.canParse(url)) return null;
  const { protocol, origin } = new URL(url);
  return protocol === "http:" || protocol === "https:" ? origin : null;
}
