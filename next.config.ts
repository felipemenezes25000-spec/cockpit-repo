import { join } from "node:path";
import type { NextConfig } from "next";

/**
 * Cabeçalhos de segurança de toda resposta.
 *
 * - Nenhuma página do sistema pode ser embutida em outro site
 *   (`frame-ancestors 'none'` e, para navegador antigo, `X-Frame-Options`).
 *   Na tela de assinatura isso importa em dobro: embutida numa página
 *   maliciosa, ela poderia ser coberta por outra coisa e o clique em
 *   "Assinar" iria para onde a paciente não viu.
 * - O navegador não adivinha tipo de arquivo (`nosniff`).
 * - Sistema de clínica não é para buscador: `noindex` em tudo.
 * - Câmera, microfone e localização ficam desligados — nada no sistema usa.
 *
 * Não há CSP completa (scripts) de propósito: o Next injeta scripts inline e
 * exigiria nonce por requisição. `frame-ancestors` é a parte da CSP que não
 * depende disso.
 */
const CABECALHOS_COMUNS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

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
  async headers() {
    return [
      { source: "/:caminho*", headers: CABECALHOS_COMUNS },
      {
        // O token de assinatura está no caminho da URL. Sem isto, um link
        // externo clicado na página levaria o endereço inteiro — com o token
        // — no cabeçalho Referer para outro site. Vem depois da regra geral
        // de propósito: o último valor de uma mesma chave vence.
        source: "/assinar/:token*",
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      },
    ];
  },
};

export default nextConfig;
