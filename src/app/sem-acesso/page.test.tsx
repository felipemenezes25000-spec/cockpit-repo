import { beforeEach, describe, expect, it, vi } from "vitest";
import { Redirecionou } from "../../../testes/supabase-falso";

/**
 * /sem-acesso é pública no middleware. A mensagem "o login funcionou, mas a
 * conta não está liberada" só vale para quem tem sessão e não tem perfil ativo.
 */

const estado = vi.hoisted(() => ({
  sessao: null as null | { id: string },
  perfilAtivo: false,
}));

vi.mock("@/lib/supabase/server", () => ({
  clienteServidor: async () => ({
    auth: { getUser: async () => ({ data: { user: estado.sessao } }) },
  }),
}));
vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    estado.sessao && estado.perfilAtivo
      ? { id: estado.sessao.id, email: null, nome: "Equipe", papel: "recepcao" }
      : null,
}));
vi.mock("@/components/layout/botao-sair", () => ({ BotaoSair: () => null }));
vi.mock("next/navigation", async () => {
  const { Redirecionou: R } = await import("../../../testes/supabase-falso");
  return {
    redirect: (destino: string) => {
      throw new R(destino);
    },
  };
});

const { default: PaginaSemAcesso } = await import("./page");

async function destino(): Promise<string | null> {
  try {
    await PaginaSemAcesso();
    return null;
  } catch (e) {
    if (e instanceof Redirecionou) return e.destino;
    throw e;
  }
}

describe("/sem-acesso", () => {
  beforeEach(() => {
    estado.sessao = null;
    estado.perfilAtivo = false;
  });

  it("sem sessão manda para o login em vez de dizer que o login funcionou", async () => {
    expect(await destino()).toBe("/entrar");
  });

  it("com perfil ativo manda para a Visão Geral", async () => {
    estado.sessao = { id: "u1" };
    estado.perfilAtivo = true;
    expect(await destino()).toBe("/");
  });

  it("com sessão e perfil inativo mostra o aviso", async () => {
    estado.sessao = { id: "u1" };
    expect(await destino()).toBeNull();
  });
});
