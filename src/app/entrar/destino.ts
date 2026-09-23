/**
 * Para onde a pessoa vai depois do login (`?proximo=`).
 *
 * O valor chega da URL — qualquer um pode montar um link
 * `/entrar?proximo=…` e mandar para a equipe. Se o destino pudesse ser outro
 * site, o login da clínica viraria trampolim para uma página falsa que pede a
 * senha de novo. Por isso só passa caminho interno, e a dúvida vira `/`.
 *
 * Não basta olhar o começo do texto. O navegador descarta tabulação e quebra
 * de linha no meio do endereço (`/\t/site.com` vira `//site.com`) e trata `\`
 * como `/`; um proxy no caminho pode decodificar `%2F`. A regra é:
 *
 * 1. nada de espaço cru, caractere de controle, barra invertida ou barra
 *    codificados (`%09`, `%0A`, `%5C`, `%2F`…);
 * 2. começa com uma barra só;
 * 3. resolvido contra uma origem fictícia, continua nela — é o próprio parser
 *    de URL que diz se o texto escapou para outro host ou esquema;
 * 4. o caminho resolvido também começa com uma barra só (`/..//site.com`
 *    passa na regra 2, mas resolve para `//site.com`).
 *
 * Mora fora de `actions.ts` porque arquivo `"use server"` só exporta função
 * assíncrona; a página também passa o valor por aqui antes de pô-lo no
 * formulário.
 */

const TAMANHO_MAXIMO = 300;
const ORIGEM_FICTICIA = "http://cockpit.invalido";

/** Espaço, controle (C0 e DEL) e barra invertida, crus. */
const CARACTERE_PROIBIDO = /[\s\u0000-\u001f\u007f\\]/;

/** Controle, barras e barra invertida codificados em `%XX` (`%20` é só espaço). */
const CODIFICADO_PROIBIDO = /%(?:[01][0-9a-f]|7f|2f|5c)/i;

/** Começa com uma barra só: nem `//` nem `/\` (host relativo ao esquema). */
const CAMINHO_INTERNO = /^\/(?![/\\])/;

export function destinoSeguro(valor: unknown): string {
  if (typeof valor !== "string") return "/";
  if (valor.length === 0 || valor.length > TAMANHO_MAXIMO) return "/";
  if (CARACTERE_PROIBIDO.test(valor) || CODIFICADO_PROIBIDO.test(valor)) return "/";
  if (!valor.startsWith("/") || valor.startsWith("//")) return "/";

  const url = URL.canParse(valor, ORIGEM_FICTICIA) ? new URL(valor, ORIGEM_FICTICIA) : null;
  if (!url || url.origin !== ORIGEM_FICTICIA) return "/";

  // O parser resolve `.`/`..` (crus ou `%2e`) DEPOIS da checagem acima:
  // `/..//site.com` sai como `//site.com`, que o navegador lê como outro host.
  // Por isso a saída passa de novo pela regra da barra única.
  const destino = `${url.pathname}${url.search}${url.hash}`;
  if (!CAMINHO_INTERNO.test(destino)) return "/";

  return destino;
}
