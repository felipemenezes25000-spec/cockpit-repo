import { join } from "node:path";
import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança de toda resposta.
 *
 * - Nenhuma página do sistema pode ser embutida em outro site
 *   (`X-Frame-Options` aqui; `frame-ancestors 'none'` na CSP do middleware).
 *   Na tela de assinatura isso importa em dobro: embutida numa página
 *   maliciosa, ela poderia ser coberta por outra coisa e o clique em
 *   "Assinar" iria para onde a paciente não viu.
 * - O navegador não adivinha tipo de arquivo (`nosniff`).
 * - Sistema de clínica não é para buscador: `noindex` em tudo.
 * - Câmera, microfone e localização ficam desligados pela API — nada no
 *   sistema usa. (Escolher foto pelo `<input type="file">` não depende disso.)
 *
 * A CSP NÃO mora aqui: ela leva um nonce novo a cada requisição, então quem
 * a monta e envia é o middleware (`src/middleware.ts`, com a política em
 * `src/lib/politica-de-conteudo.ts`). Cabeçalho fixo do `next.config` não
 * tem como carregar valor por requisição — e duas CSPs na mesma resposta
 * valeriam as duas, a mais fechada barrando os scripts com nonce.
 */
export function cabecalhosDeSeguranca() {
  const comuns = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), " +
        "hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
    },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
    // Janela aberta por outro site não recebe referência a esta.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    // Só vale em https (o navegador ignora em http://localhost). Sem
    // `includeSubDomains`: o domínio final da clínica ainda não está decidido.
    { key: "Strict-Transport-Security", value: "max-age=63072000" },
  ];

  return [
    { source: "/:caminho*", headers: comuns },
    {
      // O token de assinatura está no caminho da URL. Sem isto, um link
      // externo clicado na página levaria o endereço inteiro — com o token
      // — no cabeçalho Referer para outro site. Nada da página vai para
      // cache compartilhado nem para o histórico de proxy (`no-store`). Vem
      // depois da regra geral de propósito: o último valor de uma mesma
      // chave vence.
      source: "/assinar/:token*",
      headers: [
        { key: "Referrer-Policy", value: "no-referrer" },
        // `private`: nem proxy nem CDN guardam a resposta. Em produção o Next
        // reescreve o Cache-Control das páginas dinâmicas com um valor que já
        // traz `private, no-store` — a página é `force-dynamic` justamente
        // para que isso valha sempre. Este valor vale no resto (dev, 404).
        { key: "Cache-Control", value: "no-store, private, max-age=0" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Há um package-lock.json na pasta do usuário, fora do projeto, e o Next
  // escolhia aquela pasta como raiz. A raiz é esta.
  outputFileTracingRoot: join(__dirname),
  experimental: {
    // A importação de pacientes envia a planilha para a ação de servidor. O
    // padrão do Next é 1 MB; a tela recusa acima de 2 MB com mensagem própria,
    // e este limite precisa ser maior que o dela para a mensagem aparecer em
    // vez de o envio morrer antes de chegar.
    serverActions: { bodySizeLimit: "3mb" },
  },
  // Sem `X-Powered-By: Next.js`: não há por que anunciar a pilha.
  poweredByHeader: false,
  async headers() {
    return cabecalhosDeSeguranca();
  },
};

export default nextConfig;
