import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";
import { CABECALHO_NONCE, gerarNonce, politicaDeConteudo } from "@/lib/politica-de-conteudo";

/**
 * Toda requisição de página passa por aqui, nesta ordem:
 *
 * 1. Sorteia o nonce desta resposta e monta a CSP com ele
 *    (`lib/politica-de-conteudo.ts`). A CSP vai também nos cabeçalhos da
 *    requisição: é de lá que o Next tira o nonce para os próprios scripts.
 * 2. Renova a sessão do Supabase e barra quem não está autenticado
 *    (`atualizarSessao`, que devolve os cookies renovados até no redirect).
 * 3. Põe a CSP na resposta que sair — página ou redirecionamento.
 */
export async function middleware(request: NextRequest) {
  const nonce = gerarNonce();
  const csp = politicaDeConteudo(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NODE_ENV === "development",
    nonce,
  );
  // Sempre sobrescritos: um valor vindo do navegador não pode escolher o
  // nonce nem a política com que a página é renderizada.
  request.headers.set(CABECALHO_NONCE, nonce);
  request.headers.set("Content-Security-Policy", csp);

  const resposta = await atualizarSessao(request);
  resposta.headers.set("Content-Security-Policy", csp);
  return resposta;
}

export const config = {
  matcher: [
    /*
     * Tudo, menos os arquivos do próprio Next (`_next/static`, `_next/image`),
     * o `robots.txt` — que virava um 307 para /entrar (robô não tem sessão), e
     * cada robô que o buscasse custava um `getUser` no Auth — e as imagens da
     * marca que `src/app` publica (`scripts/gerar-marca.mjs`): `favicon.ico`,
     * `apple-icon.png` (ícone da tela de início do iPhone) e
     * `opengraph-image.png` (a prévia do link no WhatsApp). Quem as busca não
     * tem sessão — o celular da paciente, o robô da prévia —, e o 307 para
     * /entrar trocaria a imagem pela página de login.
     *
     * As exclusões são por caminho exato (ponto escapado, `$` no fim), nunca
     * por extensão: o projeto não tem `public/`, então "tudo que termina em
     * .png" não protegia arquivo nenhum e só criava páginas fora da CSP
     * (`/assinar/abc.png` renderizava a assinatura pública sem nonce). Se um
     * dia houver imagem estática, exclua pela pasta (`imagens/`), nunca pela
     * extensão.
     */
    "/((?!_next/static|_next/image|favicon\\.ico$|apple-icon\\.png$|opengraph-image\\.png$|robots\\.txt$).*)",
  ],
};
