import { describe, expect, it } from "vitest";
import nextConfig, { cabecalhosDeSeguranca } from "../next.config";
import { gerarNonce, politicaDeConteudo } from "../src/lib/politica-de-conteudo";

/**
 * Os cabeçalhos de segurança: os fixos de `next.config.ts` e a CSP com nonce
 * de `src/lib/politica-de-conteudo.ts` (enviada pelo middleware).
 *
 * O que se prova aqui é a configuração; que o Next realmente os envia é
 * conferido abrindo a página (curl/E2E). Cada asserção corresponde a uma
 * defesa: moldura, tipo de arquivo, origem de script, token no Referer.
 */

const SUPABASE_NUVEM = "https://abcdefgh.supabase.co";
const SUPABASE_LOCAL = "http://127.0.0.1:55321";
const NONCE = "bm9uY2UtZGUtdGVzdGU=";

function diretivas(csp: string): Map<string, string[]> {
  return new Map(
    csp.split(";").map((parte) => {
      const [nome, ...fontes] = parte.trim().split(/\s+/);
      return [nome, fontes];
    }),
  );
}

describe("politicaDeConteudo", () => {
  it("em produção não permite eval e fecha plugin, moldura, base e formulário", () => {
    const csp = diretivas(politicaDeConteudo(SUPABASE_NUVEM, false, NONCE));
    expect(csp.get("script-src")).not.toContain("'unsafe-eval'");
    expect(csp.get("object-src")).toEqual(["'none'"]);
    expect(csp.get("frame-ancestors")).toEqual(["'none'"]);
    expect(csp.get("frame-src")).toEqual(["'none'"]);
    expect(csp.get("base-uri")).toEqual(["'self'"]);
    expect(csp.get("form-action")).toEqual(["'self'"]);
    expect(csp.get("default-src")).toEqual(["'self'"]);
  });

  it("script só com o nonce da resposta (e o que ele carregar): nada de 'unsafe-inline'", () => {
    const csp = diretivas(politicaDeConteudo(SUPABASE_NUVEM, false, NONCE));
    expect(csp.get("script-src")).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'"]);
    expect(csp.get("default-src")).not.toContain("'unsafe-inline'");
  });

  it("<style> também exige o nonce; 'unsafe-inline' só no atributo style", () => {
    const csp = diretivas(politicaDeConteudo(SUPABASE_NUVEM, false, NONCE));
    // Com nonce na diretiva, o navegador ignoraria um 'unsafe-inline' ali —
    // e ele abriria <style> injetado nos navegadores antigos. Não entra.
    expect(csp.get("style-src")).toEqual(["'self'", `'nonce-${NONCE}'`]);
    expect(csp.get("style-src-attr")).toEqual(["'unsafe-inline'"]);
  });

  it("abre imagem e conexão só para o Supabase do projeto", () => {
    const csp = diretivas(politicaDeConteudo(`${SUPABASE_NUVEM}/rest/v1`, false, NONCE));
    expect(csp.get("img-src")).toContain(SUPABASE_NUVEM);
    expect(csp.get("connect-src")).toEqual(["'self'", SUPABASE_NUVEM, "wss://abcdefgh.supabase.co"]);
    expect(csp.has("upgrade-insecure-requests")).toBe(true);
  });

  it("com o Supabase local em http, não força https (quebraria a conexão)", () => {
    const csp = diretivas(politicaDeConteudo(SUPABASE_LOCAL, false, NONCE));
    expect(csp.get("connect-src")).toContain("ws://127.0.0.1:55321");
    expect(csp.has("upgrade-insecure-requests")).toBe(false);
  });

  it("em desenvolvimento libera eval e o <style> do recarregamento a quente, e nada mais", () => {
    const dev = diretivas(politicaDeConteudo(SUPABASE_LOCAL, true, NONCE));
    const producao = diretivas(politicaDeConteudo(SUPABASE_LOCAL, false, NONCE));
    // O script continua exigindo o nonce também em desenvolvimento.
    expect(dev.get("script-src")).toEqual([...(producao.get("script-src") ?? []), "'unsafe-eval'"]);
    expect(dev.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    for (const [nome, fontes] of producao) {
      if (nome !== "script-src" && nome !== "style-src") expect(dev.get(nome)).toEqual(fontes);
    }
  });

  it("URL do Supabase ausente ou estranha não vira fonte da CSP", () => {
    for (const url of [undefined, "", "nao-e-url", "javascript:alert(1)"]) {
      const csp = diretivas(politicaDeConteudo(url, false, NONCE));
      expect(csp.get("connect-src")).toEqual(["'self'"]);
    }
  });
});

describe("gerarNonce", () => {
  it("é base64 de 128 bits e não se repete", () => {
    const nonces = new Set(Array.from({ length: 50 }, () => gerarNonce()));
    expect(nonces.size).toBe(50);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
      expect(atob(nonce)).toHaveLength(16);
    }
  });
});

describe("cabecalhosDeSeguranca", () => {
  const regras = cabecalhosDeSeguranca();
  const geral = regras.find((r) => r.source === "/:caminho*");
  const assinar = regras.find((r) => r.source === "/assinar/:token*");
  const valor = (headers: { key: string; value: string }[] | undefined, chave: string) =>
    headers?.find((h) => h.key === chave)?.value;

  it("toda resposta leva anti-moldura, nosniff, referrer e permissões", () => {
    expect(valor(geral?.headers, "X-Frame-Options")).toBe("DENY");
    expect(valor(geral?.headers, "X-Content-Type-Options")).toBe("nosniff");
    expect(valor(geral?.headers, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(valor(geral?.headers, "Permissions-Policy")).toMatch(/camera=\(\).*microphone=\(\).*geolocation=\(\)/);
    expect(valor(geral?.headers, "X-Robots-Tag")).toContain("noindex");
  });

  it("a CSP não é cabeçalho fixo: leva nonce por requisição e vem do middleware", () => {
    // Duas CSPs na mesma resposta valeriam as duas: uma fixa, sem o nonce,
    // barraria os scripts que a do middleware libera.
    for (const regra of regras) {
      expect(regra.headers.map((h) => h.key.toLowerCase())).not.toContain("content-security-policy");
    }
  });

  it("/assinar não manda o token no Referer, não vai para cache e não é indexado", () => {
    expect(valor(assinar?.headers, "Referrer-Policy")).toBe("no-referrer");
    expect(valor(assinar?.headers, "Cache-Control")).toContain("no-store");
    expect(valor(assinar?.headers, "X-Robots-Tag")).toContain("noindex");
  });

  it("a regra de /assinar vem depois da geral (o último valor vence)", () => {
    const posicao = (source: string) => regras.findIndex((r) => r.source === source);
    expect(posicao("/:caminho*")).toBe(0);
    expect(posicao("/assinar/:token*")).toBeGreaterThan(posicao("/:caminho*"));
  });

  it("o next.config usa estes cabeçalhos e não anuncia a pilha", async () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    const emUso = await nextConfig.headers?.();
    expect(emUso?.map((r) => r.source)).toEqual(["/:caminho*", "/assinar/:token*"]);
  });
});
