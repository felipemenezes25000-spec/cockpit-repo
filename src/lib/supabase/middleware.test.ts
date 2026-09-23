import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * O middleware: quem passa sem sessão, para onde vai quem não passa, e o id
 * de correlação. O Supabase é trocado por um dublê que responde `getUser`.
 */

type CookieGravado = { name: string; value: string; options: { path?: string; maxAge?: number } };
type OpcoesCliente = { cookies: { setAll: (cookies: CookieGravado[]) => void } };

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string },
  /** Cookies que o getUser grava ao renovar (ou limpar) a sessão. */
  renovados: [] as CookieGravado[],
}));

vi.mock("./config", () => ({ SUPABASE_URL: "http://127.0.0.1:1", SUPABASE_ANON_KEY: "anon" }));
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

const { atualizarSessao } = await import("./middleware");

function pedido(caminho: string, cabecalhos: Record<string, string> = {}) {
  return new NextRequest(new URL(caminho, "http://localhost:3000"), { headers: cabecalhos });
}

beforeEach(() => {
  sessao.usuario = null;
  sessao.renovados = [];
});

describe("atualizarSessao — sem sessão", () => {
  it.each(["/entrar", "/sem-acesso", "/assinar/abc123", "/recuperar-senha", "/redefinir-senha"])(
    "rota pública %s passa",
    async (caminho) => {
      const resposta = await atualizarSessao(pedido(caminho));
      expect(resposta.headers.get("location")).toBeNull();
    },
  );

  it.each(["/", "/pacientes", "/prontuarios/1", "/rota-que-nao-existe", "/assinarfalso", "/entrarx"])(
    "%s vai para /entrar — rota inexistente também, sem revelar que não existe",
    async (caminho) => {
      const resposta = await atualizarSessao(pedido(caminho));
      const destino = new URL(resposta.headers.get("location") ?? "", "http://localhost:3000");
      expect(destino.pathname).toBe("/entrar");
    },
  );

  it("guarda só o caminho em ?proximo, sem a query da rota original", async () => {
    const resposta = await atualizarSessao(pedido("/pacientes?busca=Maria&situacao=todas"));
    const destino = new URL(resposta.headers.get("location") ?? "", "http://localhost:3000");
    expect(destino.searchParams.get("proximo")).toBe("/pacientes");
    expect(destino.searchParams.has("busca")).toBe(false);
  });

  it("a raiz não leva ?proximo", async () => {
    const resposta = await atualizarSessao(pedido("/"));
    expect(resposta.headers.get("location")).toMatch(/\/entrar$/);
  });
});

describe("atualizarSessao — com sessão", () => {
  it("abrir /entrar leva à Visão Geral", async () => {
    sessao.usuario = { id: "u1" };
    const resposta = await atualizarSessao(pedido("/entrar?proximo=/agenda"));
    const destino = new URL(resposta.headers.get("location") ?? "", "http://localhost:3000");
    expect(destino.pathname).toBe("/");
    expect(destino.search).toBe("");
  });

  it("rota do sistema passa (o layout e a RLS decidem o resto)", async () => {
    sessao.usuario = { id: "u1" };
    const resposta = await atualizarSessao(pedido("/financeiro"));
    expect(resposta.headers.get("location")).toBeNull();
  });
});

describe("atualizarSessao — id de correlação", () => {
  it("gera o id aqui e ignora o que o navegador mandou", async () => {
    const req = pedido("/entrar", { "x-id-requisicao": "id-forjado-pelo-navegador" });
    const resposta = await atualizarSessao(req);
    const id = resposta.headers.get("x-id-requisicao");
    expect(id).toMatch(/^[0-9a-f]{12}$/);
    expect(req.headers.get("x-id-requisicao")).toBe(id);
  });

  it("o redirecionamento também leva o id", async () => {
    const resposta = await atualizarSessao(pedido("/agenda"));
    expect(resposta.headers.get("x-id-requisicao")).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe("atualizarSessao — cookies renovados no redirecionamento", () => {
  it("com sessão, o redirect de /entrar leva o refresh token novo", async () => {
    sessao.usuario = { id: "u1" };
    sessao.renovados = [
      { name: "sb-teste-auth-token", value: "token-novo", options: { path: "/", maxAge: 3600 } },
    ];
    const resposta = await atualizarSessao(pedido("/entrar"));
    expect(resposta.headers.get("location")).not.toBeNull();
    const cookie = resposta.cookies.get("sb-teste-auth-token");
    expect(cookie?.value).toBe("token-novo");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBe(3600);
  });

  it("sem sessão, o redirect para /entrar leva a limpeza do cookie", async () => {
    sessao.renovados = [
      { name: "sb-teste-auth-token", value: "", options: { path: "/", maxAge: 0 } },
    ];
    const resposta = await atualizarSessao(pedido("/pacientes"));
    expect(resposta.headers.get("location")).toMatch(/\/entrar/);
    const cookie = resposta.cookies.get("sb-teste-auth-token");
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });
});
