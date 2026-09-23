import { beforeEach, describe, expect, it, vi } from "vitest";
import { Redirecionou } from "../../../testes/supabase-falso";

/**
 * A ação `entrar`: para onde manda depois do login, e o que diz quando falha.
 * O Supabase Auth é trocado por um dublê que só responde o que cada caso pede.
 */

const auth = vi.hoisted(() => ({
  resposta: { error: null } as { error: null | { status?: number; code?: string; message?: string } },
  chamadas: 0,
}));
const registro = vi.hoisted(() => ({ entradas: [] as unknown[][] }));

vi.mock("@/lib/supabase/server", () => ({
  clienteServidor: async () => ({
    auth: {
      signInWithPassword: async () => {
        auth.chamadas += 1;
        return auth.resposta;
      },
    },
  }),
}));
vi.mock("@/lib/registro", () => ({
  registrarFalha: (...args: unknown[]) => registro.entradas.push(args),
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", async () => {
  const { Redirecionou: R } = await import("../../../testes/supabase-falso");
  return {
    redirect: (destino: string) => {
      throw new R(destino);
    },
  };
});

const { entrar } = await import("./actions");

function formulario(proximo: string, email = "equipe@clinica.local", senha = "senha-de-teste"): FormData {
  const dados = new FormData();
  dados.set("email", email);
  dados.set("senha", senha);
  dados.set("proximo", proximo);
  return dados;
}

async function destinoDoLogin(proximo: string): Promise<string> {
  const erro = await entrar({ erro: null }, formulario(proximo)).then(
    () => null,
    (e: unknown) => e,
  );
  if (!(erro instanceof Redirecionou)) throw new Error("a ação não redirecionou");
  return erro.destino;
}

beforeEach(() => {
  auth.resposta = { error: null };
  auth.chamadas = 0;
  registro.entradas = [];
});

describe("entrar — destino depois do login", () => {
  it("volta para o caminho interno pedido", async () => {
    expect(await destinoDoLogin("/agenda?dia=2026-09-23")).toBe("/agenda?dia=2026-09-23");
  });

  it.each(["//exemplo.com", "/\t/exemplo.com", "/%09/exemplo.com", "/%2F%2Fexemplo.com", "/\\exemplo.com", "https://exemplo.com"])(
    "nunca sai do sistema: %j vira /",
    async (proximo) => {
      expect(await destinoDoLogin(proximo)).toBe("/");
    },
  );
});

describe("entrar — recusa", () => {
  it("campo vazio não chega ao serviço", async () => {
    const estado = await entrar({ erro: null }, formulario("/", "", ""));
    expect(estado.erro).toBe("Preencha e-mail e senha.");
    expect(estado.invalidos).toEqual(["email", "senha"]);
    expect(auth.chamadas).toBe(0);
  });

  it("só a senha vazia marca só a senha", async () => {
    const estado = await entrar({ erro: null }, formulario("/", "equipe@clinica.local", ""));
    expect(estado.invalidos).toEqual(["senha"]);
  });

  it("credencial errada tem frase única e não vai para o log", async () => {
    auth.resposta = { error: { status: 400, code: "invalid_credentials", message: "Invalid login credentials" } };
    const estado = await entrar({ erro: null }, formulario("/"));
    expect(estado.erro).toBe("E-mail ou senha incorretos.");
    expect(estado.invalidos).toEqual(["email", "senha"]);
    expect(registro.entradas).toHaveLength(0);
  });

  it("falha do serviço vai para o log sem e-mail nem mensagem do Auth", async () => {
    auth.resposta = { error: { status: 500, message: "falhou para equipe@clinica.local" } };
    const estado = await entrar({ erro: null }, formulario("/"));
    expect(estado.erro).toMatch(/^O serviço de acesso não respondeu/);
    // O que foi digitado pode estar certo: nenhum campo fica marcado.
    expect(estado.invalidos).toEqual([]);
    expect(registro.entradas).toHaveLength(1);
    expect(JSON.stringify(registro.entradas)).not.toContain("equipe@clinica.local");
    expect(JSON.stringify(registro.entradas)).toContain("status 500");
  });

  it("limite de tentativas não marca campo nem vai para o log", async () => {
    auth.resposta = { error: { status: 429, code: "over_request_rate_limit" } };
    const estado = await entrar({ erro: null }, formulario("/"));
    expect(estado.erro).toMatch(/^Muitas tentativas/);
    expect(estado.invalidos).toEqual([]);
    expect(registro.entradas).toHaveLength(0);
  });
});
