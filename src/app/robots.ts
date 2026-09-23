import type { MetadataRoute } from "next";

/**
 * Nenhum robô indexa o sistema: é ferramenta interna da clínica, com dado de
 * saúde atrás do login. O `X-Robots-Tag: noindex` (next.config.ts) já vale
 * para cada resposta; este arquivo diz o mesmo a quem pergunta antes de
 * rastrear. Fica fora do middleware (`src/middleware.ts`): sem sessão, ele
 * virava um redirecionamento para /entrar.
 */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
