import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabaseFalso } from "../../../testes/supabase-falso";
import type { EstadoImportacao } from "./importar-pacientes";

// ---------------------------------------------------------------------
// Dublês: sessão, cliente do banco e a revalidação do Next
// ---------------------------------------------------------------------

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string; papel: "administradora" | "financeiro" | "recepcao" },
}));
const banco = vi.hoisted(() => ({ cliente: null as unknown }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, email: "x@clinica.local", nome: "Pessoa de Teste" },
  ehAdministradora: async () => sessao.usuario?.papel === "administradora",
}));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));
vi.mock("next/cache", () => ({
  revalidatePath: (caminho: string) => navegacao.revalidados.push(caminho),
}));

const ID = "c0000000-0000-4000-8000-000000000001";

const INICIAL: EstadoImportacao = {
  etapa: "vazio",
  falha: null,
  arquivo: null,
  codificacao: null,
  separador: null,
  colunas: [],
  colunasIgnoradas: [],
  linhas: [],
  resumo: { total: 0, prontas: 0, comErro: 0, jaCadastradas: 0 },
  gravadas: 0,
  recusadas: [],
};

const CPF_ANA = "52998224725";
const CPF_BIA = "11144477735";

const PLANILHA = [
  "Nome;CPF;Telefone",
  "Ana Maria Souza;529.982.247-25;(11) 98765-4321",
  "Bia Lima Santos;111.444.777-35;(11) 91234-5678",
].join("\n");

function envio(conteudo: string | Uint8Array<ArrayBuffer>, confirmar = false, nome = "pacientes.csv"): FormData {
  const dados = new FormData();
  dados.set("arquivo", new File([conteudo], nome, { type: "text/csv" }));
  if (confirmar) dados.set("confirmar", "sim");
  return dados;
}

/** Nenhuma frase que chega à tela pode trazer texto do Postgres. */
const TEXTO_TECNICO = /violates|constraint|relation|policy|duplicate key|syntax|PGRST|pacientes_|Key \(/i;

let erroNoConsole: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  sessao.usuario = { id: ID, papel: "administradora" };
  navegacao.revalidados = [];
  erroNoConsole = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

/** Chamadas de `insert` feitas em `pacientes`, na ordem. */
function insercoes(chamadas: ReturnType<typeof supabaseFalso>["chamadas"]) {
  return chamadas
    .filter((c) => c.alvo === "pacientes")
    .flatMap((c) => c.passos.filter((p) => p.metodo === "insert"));
}

describe("importarPacientes — quem pode e o que chega", () => {
  it("sem sessão não toca o banco", async () => {
    sessao.usuario = null;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const estado = await importarPacientes(INICIAL, envio(PLANILHA));
    expect(estado.falha).toMatch(/Sessão expirada/);
    expect(falso.chamadas).toEqual([]);
  });

  it("recepção não importa em massa", async () => {
    sessao.usuario = { id: ID, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const estado = await importarPacientes(INICIAL, envio(PLANILHA, true));
    expect(estado.falha).toMatch(/administradora/);
    expect(falso.chamadas).toEqual([]);
  });

  it("sem arquivo, ou arquivo vazio, pede o CSV", async () => {
    banco.cliente = supabaseFalso().cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    expect((await importarPacientes(INICIAL, new FormData())).falha).toMatch(/Escolha um arquivo/);
    expect((await importarPacientes(INICIAL, envio(""))).falha).toMatch(/Escolha um arquivo/);
  });

  it("acima de 2 MB recusa antes de ler", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const grande = "Nome\n" + "x".repeat(2 * 1024 * 1024);
    const estado = await importarPacientes(INICIAL, envio(grande));
    expect(estado.falha).toMatch(/limite é 2 MB/);
    expect(falso.chamadas).toEqual([]);
  });

  it("planilha do Excel (.xlsx) falha com instrução e sem tocar o banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const xlsx = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const estado = await importarPacientes(INICIAL, envio(xlsx, false, "pacientes.xlsx"));
    expect(estado.falha).toMatch(/Excel/);
    expect(falso.chamadas).toEqual([]);
  });
});

describe("importarPacientes — prévia não grava", () => {
  it("sem confirmação só lê: marca o CPF já cadastrado e não insere nada", async () => {
    const falso = supabaseFalso({
      pacientes: { data: [{ id: "p1", nome: "Ana M. Souza", nome_social: null, cpf: CPF_ANA }] },
    });
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const estado = await importarPacientes(INICIAL, envio(PLANILHA));

    expect(estado.etapa).toBe("analisado");
    expect(estado.resumo).toEqual({ total: 2, prontas: 1, comErro: 0, jaCadastradas: 1 });
    expect(estado.linhas[0].jaCadastrada).toEqual({ id: "p1", nome: "Ana M. Souza" });
    expect(insercoes(falso.chamadas)).toEqual([]);
    expect(navegacao.revalidados).toEqual([]);
  });

  it("falha ao conferir CPFs existentes vira frase segura, sem prévia mentirosa", async () => {
    const falso = supabaseFalso({
      pacientes: {
        error: { code: "42501", message: 'permission denied for table pacientes' },
      },
    });
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const estado = await importarPacientes(INICIAL, envio(PLANILHA, true));
    expect(estado.falha).not.toMatch(TEXTO_TECNICO);
    expect(estado.linhas).toEqual([]);
    expect(insercoes(falso.chamadas)).toEqual([]);
  });
});

describe("importarPacientes — gravação", () => {
  it("na confirmação o servidor relê o arquivo e grava o que ele mesmo analisou", async () => {
    const falso = supabaseFalso({ pacientes: [{ data: [] }, { data: null }] });
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    // O navegador só manda o arquivo e a confirmação — nenhuma linha "pronta"
    // vinda do cliente é aceita.
    const dados = envio(PLANILHA, true);
    dados.set("linhas", JSON.stringify([{ nome: "Injetada" }]));
    const estado = await importarPacientes(INICIAL, dados);

    expect(estado.etapa).toBe("concluido");
    expect(estado.gravadas).toBe(2);
    const [lote] = insercoes(falso.chamadas);
    const registros = lote.argumentos[0] as { nome: string; cpf: string; criado_por: string }[];
    expect(registros.map((r) => r.cpf)).toEqual([CPF_ANA, CPF_BIA]);
    expect(registros.every((r) => r.criado_por === ID)).toBe(true);
    expect(JSON.stringify(registros)).not.toMatch(/Injetada/);
    expect(navegacao.revalidados).toEqual(expect.arrayContaining(["/pacientes", "/"]));
  });

  it("confirmar sem nenhuma linha pronta não grava", async () => {
    const falso = supabaseFalso({
      pacientes: { data: [{ id: "p1", nome: "Ana", nome_social: null, cpf: CPF_ANA }] },
    });
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const so = ["Nome;CPF", "Ana Maria Souza;529.982.247-25"].join("\n");
    const estado = await importarPacientes(INICIAL, envio(so, true));
    expect(estado.falha).toMatch(/Nenhuma linha está pronta/);
    expect(insercoes(falso.chamadas)).toEqual([]);
  });

  it("lote recusado cai para linha a linha: duplicidade simultânea e falha técnica viram frase segura", async () => {
    const falhaTecnica = {
      code: "23514",
      message:
        'new row for relation "pacientes" violates check constraint "pacientes_nome_tamanho" ' +
        `Key (cpf)=(${CPF_BIA})`,
      details: `Failing row contains (Bia Lima Santos, ${CPF_BIA}, (11) 91234-5678).`,
    };
    const falso = supabaseFalso({
      pacientes: [
        { data: [] }, // conferência de CPFs: nenhum existe
        { error: falhaTecnica }, // o lote inteiro cai
        {
          error: {
            code: "23505",
            message: `duplicate key value violates unique constraint "pacientes_cpf_unico" Key (cpf)=(${CPF_ANA})`,
          },
        }, // Ana: alguém cadastrou no meio da importação
        { error: falhaTecnica }, // Bia: falha que não é duplicidade
      ],
    });
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const estado = await importarPacientes(INICIAL, envio(PLANILHA, true));

    expect(estado.etapa).toBe("concluido");
    expect(estado.gravadas).toBe(0);
    expect(insercoes(falso.chamadas)).toHaveLength(3); // 1 lote + 2 linhas

    const [ana, bia] = estado.recusadas;
    expect(ana).toMatchObject({ numero: 2, motivo: expect.stringMatching(/CPF já cadastrado/) });
    expect(bia.numero).toBe(3);
    expect(bia.motivo).toMatch(/banco recusou/i);

    // Nada do Postgres chega à tela: nem tabela, nem constraint, nem o valor digitado.
    for (const r of estado.recusadas) {
      expect(r.motivo).not.toMatch(TEXTO_TECNICO);
      expect(r.motivo).not.toContain(CPF_ANA);
      expect(r.motivo).not.toContain(CPF_BIA);
      expect(r.motivo).not.toMatch(/pacientes/);
    }

    // O log registra a falha técnica, sanitizado: sem valor digitado e sem `details`.
    const registrado = JSON.stringify(erroNoConsole.mock.calls);
    expect(registrado).toMatch(/importação: gravar linha 3/);
    expect(registrado).toMatch(/23514/);
    expect(registrado).not.toContain(CPF_BIA);
    expect(registrado).not.toContain(CPF_ANA);
    expect(registrado).not.toMatch(/pacientes_nome_tamanho|Failing row/);
  });

  it("no fallback, a linha que o banco aceita conta como gravada", async () => {
    const falso = supabaseFalso({
      pacientes: [
        { data: [] },
        { error: { code: "23505", message: "duplicate key" } },
        { error: { code: "23505", message: "duplicate key" } }, // Ana recusada
        { data: null }, // Bia entra
      ],
    });
    banco.cliente = falso.cliente;
    const { importarPacientes } = await import("./importar-pacientes");

    const estado = await importarPacientes(INICIAL, envio(PLANILHA, true));
    expect(estado.gravadas).toBe(1);
    expect(estado.recusadas.map((r) => r.numero)).toEqual([2]);
  });
});
