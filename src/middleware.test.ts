import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O middleware de ponta: nonce e CSP por requisição, por cima da renovação de
 * sessão (que tem o próprio teste em `lib/supabase/middleware.test.ts`). O
 * Supabase é trocado por um dublê que responde `getUser`.
 */

type CookieGravado = { name: string; value: string; options: { path?: string; maxAge?: number } };
type OpcoesCliente = { cookies: { setAll: (cookies: CookieGravado[]) => void } };

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string },
  renovados: [] as CookieGravado[],
}));

vi.mock("@/lib/supabase/config", () => ({ SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_ANON_KEY: "anon" }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _chave: string, opcoes: OpcoesCliente) => ({
    auth: {
      getUser: async () => {
        if (sessao.renovados.length > 0) opcoes.cookies.setAll(sessao.renovados);
        return { data: { user: sessao.usuario }, error: null };
      },
    },
  }),
}));

const { config, middleware } = await import("./middleware");
const { default: robots } = await import("./app/robots");

function pedido(caminho: string, cabecalhos: Record<string, string> = {}) {
  return new NextRequest(new URL(caminho, "http://localhost:3000"), { headers: cabecalhos });
}

/** O nonce que a CSP libera em `script-src`. */
function nonceDa(csp: string | null): string | undefined {
  return csp?.match(/script-src[^;]*'nonce-([^']+)'/)?.[1];
}

/**
 * Os cabeçalhos que o Next repassa à renderização. `NextResponse.next({ request })`
 * os codifica em `x-middleware-request-*`; é dali que o Next lê a CSP.
 */
function repassado(resposta: Response, nome: string): string | null {
  return resposta.headers.get(`x-middleware-request-${nome.toLowerCase()}`);
}

beforeEach(() => {
  sessao.usuario = null;
  sessao.renovados = [];
});

describe("middleware — CSP com nonce", () => {
  it("a página sai com CSP de nonce, sem 'unsafe-inline' em script", async () => {
    const resposta = await middleware(pedido("/entrar"));
    const csp = resposta.headers.get("content-security-policy");
    expect(nonceDa(csp)).toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);
  });

  it("o Next recebe a mesma CSP e o mesmo nonce que vão para o navegador", async () => {
    const req = pedido("/entrar");
    const resposta = await middleware(req);
    const csp = resposta.headers.get("content-security-policy");
    expect(repassado(resposta, "content-security-policy")).toBe(csp);
    expect(repassado(resposta, "x-nonce")).toBe(nonceDa(csp));
    expect(req.headers.get("x-nonce")).toBe(nonceDa(csp));
  });

  it("cada requisição tem um nonce novo", async () => {
    const primeira = await middleware(pedido("/entrar"));
    const segunda = await middleware(pedido("/entrar"));
    expect(nonceDa(primeira.headers.get("content-security-policy"))).not.toBe(
      nonceDa(segunda.headers.get("content-security-policy")),
    );
  });

  it("nonce ou CSP mandados pelo navegador são descartados", async () => {
    const req = pedido("/entrar", {
      "x-nonce": "nonce-forjado",
      "content-security-policy": "script-src 'unsafe-inline'",
    });
    const resposta = await middleware(req);
    expect(req.headers.get("x-nonce")).not.toBe("nonce-forjado");
    expect(repassado(resposta, "content-security-policy")).not.toMatch(/script-src[^;]*'unsafe-inline'/);
    expect(nonceDa(repassado(resposta, "content-security-policy") ?? null)).toBe(
      req.headers.get("x-nonce"),
    );
  });

  it("o redirecionamento para /entrar também leva a CSP e os cookies renovados", async () => {
    sessao.renovados = [{ name: "sb-teste-auth-token", value: "", options: { path: "/", maxAge: 0 } }];
    const resposta = await middleware(pedido("/pacientes"));
    expect(resposta.headers.get("location")).toMatch(/\/entrar/);
    expect(nonceDa(resposta.headers.get("content-security-policy"))).toBeTruthy();
    expect(resposta.cookies.get("sb-teste-auth-token")?.maxAge).toBe(0);
  });

  it("com sessão renovada, a página segue com CSP, cookie novo e o id de correlação", async () => {
    sessao.usuario = { id: "u1" };
    sessao.renovados = [
      { name: "sb-teste-auth-token", value: "token-novo", options: { path: "/", maxAge: 3600 } },
    ];
    const resposta = await middleware(pedido("/agenda"));
    expect(resposta.headers.get("location")).toBeNull();
    expect(nonceDa(resposta.headers.get("content-security-policy"))).toBeTruthy();
    expect(resposta.cookies.get("sb-teste-auth-token")?.value).toBe("token-novo");
    expect(resposta.headers.get("x-id-requisicao")).toMatch(/^[0-9a-f]{12}$/);
    expect(repassado(resposta, "x-nonce")).toBeTruthy();
  });
});

describe("middleware — o que fica de fora", () => {
  // O matcher é uma expressão regular inteira (entre parênteses), testável
  // como o Next a usa: casada contra o caminho todo.
  const passaPeloMiddleware = (caminho: string) =>
    config.matcher.some((padrao) => new RegExp(`^${padrao}$`).test(caminho));

  it("robots.txt não passa pelo middleware: não vira 307 nem custa getUser", () => {
    expect(passaPeloMiddleware("/robots.txt")).toBe(false);
    expect(passaPeloMiddleware("/_next/static/chunks/x.js")).toBe(false);
  });

  it("caminho com cara de arquivo continua passando: a exclusão é exata, não por extensão", () => {
    // Antes, /assinar/abc.png renderizava a assinatura pública sem CSP.
    expect(passaPeloMiddleware("/assinar/abc.png")).toBe(true);
    expect(passaPeloMiddleware("/financeiro.svg")).toBe(true);
    expect(passaPeloMiddleware("/robots.txtx")).toBe(true);
    expect(passaPeloMiddleware("/robotsXtxt")).toBe(true);
    expect(passaPeloMiddleware("/favicon.ico")).toBe(false);
  });

  it("as imagens da marca não passam: quem as busca não tem sessão e levaria um 307", () => {
    expect(passaPeloMiddleware("/apple-icon.png")).toBe(false);
    expect(passaPeloMiddleware("/opengraph-image.png")).toBe(false);
    // Só no caminho exato da raiz — o resto continua com sessão e CSP.
    expect(passaPeloMiddleware("/assinar/apple-icon.png")).toBe(true);
    expect(passaPeloMiddleware("/assinar/opengraph-image.png")).toBe(true);
    expect(passaPeloMiddleware("/apple-icon.pngx")).toBe(true);
    expect(passaPeloMiddleware("/opengraph-imageXpng")).toBe(true);
  });

  it("as páginas continuam passando", () => {
    expect(passaPeloMiddleware("/")).toBe(true);
    expect(passaPeloMiddleware("/agenda")).toBe(true);
    expect(passaPeloMiddleware("/assinar/abc")).toBe(true);
  });

  it("robots.txt pede a todo robô que não rastreie nada", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});
