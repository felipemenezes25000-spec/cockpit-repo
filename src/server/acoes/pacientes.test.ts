import { beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

// ---------------------------------------------------------------------
// Dublês: sessão, cliente do banco e as funções de navegação do Next
// ---------------------------------------------------------------------

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string; papel: "administradora" | "financeiro" | "recepcao" },
}));
const banco = vi.hoisted(() => ({ cliente: null as unknown }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, email: "x@clinica.local", nome: "Pessoa de Teste" },
}));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));
vi.mock("next/cache", () => ({
  revalidatePath: (caminho: string) => navegacao.revalidados.push(caminho),
}));
vi.mock("next/navigation", async () => {
  const { Redirecionou: R } = await import("../../../testes/supabase-falso");
  return {
    redirect: (destino: string) => {
      throw new R(destino);
    },
  };
});

const ID = "c0000000-0000-4000-8000-000000000001";
const PACIENTE = "b0000000-0000-4000-8000-000000000001";
const CPF = "52998224725";

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

const CADASTRO = {
  nome: "  Ana   Maria Souza ",
  nome_social: "",
  cpf: "529.982.247-25",
  data_nascimento: "1990-09-22",
  telefone: "(11) 98765-4321",
  email: "Ana@Exemplo.COM",
  cep: "01310-100",
  logradouro: "Av. Paulista",
  numero: "1000",
  complemento: "",
  bairro: "Bela Vista",
  cidade: "São Paulo",
  uf: "sp",
  origem: "",
  observacoes: "",
};

const TEXTO_TECNICO = /violates|constraint|relation|pacientes_|duplicate key|PGRST|Key \(/i;

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "recepcao" };
  navegacao.revalidados = [];
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

async function destino(promessa: Promise<unknown>): Promise<string | null> {
  try {
    await promessa;
    return null;
  } catch (erro) {
    if (erro instanceof Redirecionou) return erro.destino;
    throw erro;
  }
}

describe("cadastrarPaciente", () => {
  it("grava normalizado: só dígitos, e-mail minúsculo, UF maiúscula, endereço em jsonb", async () => {
    const falso = supabaseFalso({ pacientes: { data: { id: PACIENTE } } });
    banco.cliente = falso.cliente;
    const { cadastrarPaciente } = await import("./pacientes");

    expect(await destino(cadastrarPaciente({ erros: {} }, formulario(CADASTRO)))).toBe(
      `/pacientes/${PACIENTE}`,
    );

    const insercao = falso.passosDe("pacientes").find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toMatchObject({
      nome: "Ana Maria Souza",
      nome_social: null,
      cpf: CPF,
      telefone: "11987654321",
      email: "ana@exemplo.com",
      endereco: { cep: "01310100", uf: "SP", cidade: "São Paulo" },
      criado_por: ID,
    });
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/pacientes", "/"]));
  });

  it("CEP com dígito a mais volta como erro do campo, com o que foi digitado", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { cadastrarPaciente } = await import("./pacientes");

    const r = await cadastrarPaciente({ erros: {} }, formulario({ ...CADASTRO, cep: "01310-1000" }));
    expect(r.erros.cep).toMatch(/CEP inválido/);
    expect(r.valores?.cep).toBe("01310-1000");
    expect(falso.chamadas).toEqual([]);
  });

  it("CPF duplicado (inclusive em corrida) vira erro do campo CPF, sem vazar o valor", async () => {
    banco.cliente = supabaseFalso({
      pacientes: {
        error: {
          code: "23505",
          message: `duplicate key value violates unique constraint "pacientes_cpf_unico" Key (cpf)=(${CPF})`,
        },
      },
    }).cliente;
    const { cadastrarPaciente } = await import("./pacientes");

    const r = await cadastrarPaciente({ erros: {} }, formulario(CADASTRO));
    expect(r.erros.cpf).toBe("Já existe uma paciente cadastrada com este CPF.");
    expect(JSON.stringify(r.erros)).not.toContain(CPF);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("falha técnica vira frase geral segura", async () => {
    banco.cliente = supabaseFalso({
      pacientes: { error: { code: "23514", message: 'new row for relation "pacientes" violates check constraint' } },
    }).cliente;
    const { cadastrarPaciente } = await import("./pacientes");

    const r = await cadastrarPaciente({ erros: {} }, formulario(CADASTRO));
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
  });
});

describe("atualizarPaciente", () => {
  it("paciente que não existe (ou que a RLS esconde) não revalida", async () => {
    banco.cliente = supabaseFalso({ pacientes: { data: null } }).cliente;
    const { atualizarPaciente } = await import("./pacientes");

    const r = await atualizarPaciente({ erros: {} }, formulario({ ...CADASTRO, id: PACIENTE }));
    expect(r.erros.geral).toBe("Paciente não encontrada.");
    expect(navegacao.revalidados).toEqual([]);
  });

  it("falha ao ler a ficha não vira \"CEP inválido\" nem segue para o update", async () => {
    const falso = supabaseFalso({
      pacientes: { error: { code: "08006", message: "connection failure" } },
    });
    banco.cliente = falso.cliente;
    const { atualizarPaciente } = await import("./pacientes");

    const r = await atualizarPaciente(
      { erros: {} },
      formulario({ ...CADASTRO, id: PACIENTE, cep: "1310100" }),
    );
    expect(r.erros.cep).toBeUndefined();
    expect(r.erros.geral).toBeTruthy();
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(r.valores?.telefone).toBe("(11) 98765-4321");
    expect(falso.passosDe("pacientes").map((p) => p.metodo)).not.toContain("update");
    expect(navegacao.revalidados).toEqual([]);
  });

  it("id inválido não toca o banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { atualizarPaciente } = await import("./pacientes");

    const r = await atualizarPaciente({ erros: {} }, formulario({ ...CADASTRO, id: "abc" }));
    expect(r.erros.geral).toMatch(/não identificada/);
    expect(falso.chamadas).toEqual([]);
  });
});

describe("alternarArquivamento", () => {
  it("arquivar só troca `ativo` — não existe apagar", async () => {
    const falso = supabaseFalso({ pacientes: { data: { id: PACIENTE } } });
    banco.cliente = falso.cliente;
    const { alternarArquivamento } = await import("./pacientes");

    const r = await alternarArquivamento(ACAO_INICIAL, formulario({ id: PACIENTE, arquivar: "sim" }));
    expect(r).toEqual({ ok: true, mensagem: "Paciente arquivada." });
    const passos = falso.passosDe("pacientes");
    expect(passos.map((p) => p.metodo)).not.toContain("delete");
    expect(passos.find((p) => p.metodo === "update")?.argumentos[0]).toEqual({ ativo: false });
  });

  it("reativar volta `ativo` para true", async () => {
    const falso = supabaseFalso({ pacientes: { data: { id: PACIENTE } } });
    banco.cliente = falso.cliente;
    const { alternarArquivamento } = await import("./pacientes");

    const r = await alternarArquivamento(ACAO_INICIAL, formulario({ id: PACIENTE }));
    expect(r.mensagem).toBe("Paciente reativada.");
    expect(falso.passosDe("pacientes").find((p) => p.metodo === "update")?.argumentos[0]).toEqual({
      ativo: true,
    });
  });
});
