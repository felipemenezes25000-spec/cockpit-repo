import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PacienteDaLista, PaginaDePacientes } from "@/server/consultas/pacientes";

/**
 * `buscarPacientesParaSelecao` é chamada pelo navegador (a caixa de busca do
 * formulário de atendimento) — é uma porta aberta do servidor. As
 * invariantes: sem sessão não lista ninguém, o termo chega ao banco com
 * tamanho limitado, a resposta é curta e só leva o que a caixa mostra.
 *
 * A consulta em si (filtro, RLS, paginação) é de `consultas/pacientes` e do
 * banco; aqui ela é substituída para conferir só o que a ação faz com ela.
 */

const sessao = vi.hoisted(() => ({ logada: true }));
const consulta = vi.hoisted(() => ({
  pedidos: [] as { busca?: string }[],
  pagina: null as unknown,
}));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.logada ? { id: "u", papel: "recepcao", email: "x@clinica.local", nome: "Pessoa de Teste" } : null,
}));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => null }));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: () => undefined }));
vi.mock("@/server/consultas/pacientes", () => ({
  listarPacientes: async (opcoes: { busca?: string }) => {
    consulta.pedidos.push(opcoes);
    return consulta.pagina;
  },
}));

function paciente(n: number, contato: Partial<Pick<PacienteDaLista, "telefone" | "email">> = {}): PacienteDaLista {
  return {
    id: `a0000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    nome: `Pessoa ${n}`,
    nomeSocial: null,
    exibicao: `Pessoa ${n}`,
    telefone: contato.telefone ?? null,
    email: contato.email ?? null,
    dataNascimento: new Date("1990-01-01T12:00:00Z"),
    ativo: true,
    exemplo: false,
  };
}

function pagina(itens: PacienteDaLista[]): PaginaDePacientes {
  return { itens, total: itens.length, pagina: 1, paginas: 1 };
}

beforeEach(() => {
  sessao.logada = true;
  consulta.pedidos = [];
  consulta.pagina = pagina([]);
});

describe("buscarPacientesParaSelecao", () => {
  it("sem sessão devolve lista vazia e nem consulta", async () => {
    sessao.logada = false;
    consulta.pagina = pagina([paciente(1)]);
    const { buscarPacientesParaSelecao } = await import("./agenda");

    expect(await buscarPacientesParaSelecao("Pessoa")).toEqual([]);
    expect(consulta.pedidos).toHaveLength(0);
  });

  it("o termo chega à consulta cortado em 80 caracteres", async () => {
    const { buscarPacientesParaSelecao } = await import("./agenda");

    await buscarPacientesParaSelecao("a".repeat(500));
    expect(consulta.pedidos[0].busca).toHaveLength(80);
  });

  it("termo que não é texto (chamada forjada) não quebra a ação", async () => {
    const { buscarPacientesParaSelecao } = await import("./agenda");

    await buscarPacientesParaSelecao(null as unknown as string);
    expect(consulta.pedidos[0].busca).toBe("");
  });

  it("devolve no máximo 8 e só o que a caixa de seleção mostra", async () => {
    consulta.pagina = pagina(Array.from({ length: 20 }, (_, i) => paciente(i + 1, { telefone: "(11) 90000-0000" })));
    const { buscarPacientesParaSelecao } = await import("./agenda");

    const lista = await buscarPacientesParaSelecao("Pessoa");
    expect(lista).toHaveLength(8);
    for (const item of lista) {
      expect(Object.keys(item).sort()).toEqual(["detalhe", "id", "nome", "telefone"]);
    }
  });

  it("o detalhe junta telefone e e-mail, e avisa quando não há contato", async () => {
    consulta.pagina = pagina([
      paciente(1, { telefone: "(11) 90000-0001", email: "um@exemplo.test" }),
      paciente(2, { email: "dois@exemplo.test" }),
      paciente(3),
    ]);
    const { buscarPacientesParaSelecao } = await import("./agenda");

    const [ambos, soEmail, nenhum] = await buscarPacientesParaSelecao("Pessoa");
    expect(ambos.detalhe).toBe("(11) 90000-0001 · um@exemplo.test");
    expect(soEmail).toMatchObject({ detalhe: "dois@exemplo.test", telefone: null });
    expect(nenhum.detalhe).toBe("sem contato cadastrado");
  });
});
