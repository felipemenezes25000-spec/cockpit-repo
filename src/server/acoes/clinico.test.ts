import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ACAO_INICIAL } from "@/lib/acao";
import { Redirecionou, supabaseFalso } from "../../../testes/supabase-falso";

/**
 * Ações da área clínica: prontuário, fotos, documentos e o link público.
 *
 * Mesmo desenho de `acoes.test.ts`: sessão, banco e Next trocados por dublês,
 * para conferir o que a ação faz com cada resposta — quem pode, o que chega
 * ao banco, o que sobe para a tela e o que vai para o log.
 */

const sessao = vi.hoisted(() => ({
  usuario: null as null | { id: string; papel: "administradora" | "financeiro" | "recepcao" },
}));
/** `comSessao` conta os clientes pedidos COM os cookies da sessão. */
const banco = vi.hoisted(() => ({ cliente: null as unknown, comSessao: 0 }));
const navegacao = vi.hoisted(() => ({ revalidados: [] as string[] }));
const requisicao = vi.hoisted(() => ({ cabecalhos: {} as Record<string, string> }));
/** O que foi agendado com `after` (roda depois da resposta, no Next). */
const depois = vi.hoisted(() => ({ tarefas: [] as (() => Promise<void> | void)[] }));
const correio = vi.hoisted(() => ({
  disponivel: true,
  enviados: [] as { para: string; assunto: string; texto: string; html: string }[],
  resultado: { ok: true } as { ok: true } | { ok: false; motivo: string },
}));
const autoridade = vi.hoisted(() => ({
  pedidos: [] as string[],
  resposta: null as null | { autoridade: string; hora: Date; tokenBase64: string },
}));

const SEGREDO = "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres";

vi.mock("@/lib/auth", () => ({
  usuarioAtual: async () =>
    sessao.usuario && { ...sessao.usuario, email: "x@clinica.local", nome: "Pessoa de Teste" },
  ehAdministradora: async () => sessao.usuario?.papel === "administradora",
}));
vi.mock("@/lib/supabase/server", () => ({
  clienteServidor: async () => {
    banco.comSessao += 1;
    return banco.cliente;
  },
  clienteAnonimo: () => banco.cliente,
}));
vi.mock("next/cache", () => ({
  revalidatePath: (caminho: string) => navegacao.revalidados.push(caminho),
}));
vi.mock("next/headers", () => ({
  headers: async () => new Headers(requisicao.cabecalhos),
}));
vi.mock("next/server", () => ({
  after: (tarefa: () => Promise<void> | void) => {
    depois.tarefas.push(tarefa);
  },
}));
vi.mock("@/server/email", () => ({
  emailDisponivel: () => correio.disponivel,
  enviarEmail: async (mensagem: { para: string; assunto: string; texto: string; html: string }) => {
    correio.enviados.push(mensagem);
    return correio.resultado;
  },
  html: (texto: string) => texto,
}));
vi.mock("@/lib/assinatura/carimbo", () => ({
  carimbar: async (hash: string) => {
    autoridade.pedidos.push(hash);
    return { carimbo: autoridade.resposta, falhas: autoridade.resposta ? [] : ["DigiCert: HTTP 503"] };
  },
}));
vi.mock("@/server/assinatura/qr", () => ({
  qrEmSvg: async (texto: string) => `<svg data-texto="${texto}"></svg>`,
}));
vi.mock("next/navigation", async () => {
  const { Redirecionou: R } = await import("../../../testes/supabase-falso");
  return {
    redirect: (destino: string) => {
      throw new R(destino);
    },
  };
});

const ADMIN = "a0000000-0000-4000-8000-000000000001";
const PACIENTE = "b0000000-0000-4000-8000-000000000001";
const PRONTUARIO = "c0000000-0000-4000-8000-000000000001";
const OUTRO = "c0000000-0000-4000-8000-000000000002";
const FOTO = "e0000000-0000-4000-8000-000000000001";
const DOCUMENTO = "d0000000-0000-4000-8000-000000000001";
const LINK = "f0000000-0000-4000-8000-000000000001";
const ARQUIVO = "0b2f8a3e-4c1d-4f2a-9b3c-1d2e3f4a5b6c";
const TOKEN = "A".repeat(43);

/** Nenhuma frase que chega à tela pode trazer texto do Postgres. */
const TEXTO_TECNICO = /violates|constraint|relation|policy|duplicate key|syntax|PGRST|42501|23505/i;

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0, 0, 0]);

function formulario(campos: Record<string, string>): FormData {
  const dados = new FormData();
  for (const [chave, valor] of Object.entries(campos)) dados.set(chave, valor);
  return dados;
}

/** Se alguma chamada a `prontuario_imagens` chegou a inserir. */
function inseriuFoto(falso: ReturnType<typeof supabaseFalso>): boolean {
  return falso.chamadas.some(
    (c) => c.alvo === "prontuario_imagens" && c.passos.some((p) => p.metodo === "insert"),
  );
}

/** Tudo o que foi para o log, numa string só, para procurar o que não pode estar lá. */
function logado(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

beforeEach(() => {
  sessao.usuario = { id: ADMIN, papel: "administradora" };
  banco.comSessao = 0;
  navegacao.revalidados = [];
  requisicao.cabecalhos = {};
  depois.tarefas = [];
  correio.disponivel = true;
  correio.enviados = [];
  correio.resultado = { ok: true };
  autoridade.pedidos = [];
  autoridade.resposta = null;
  vi.stubEnv("ASSINATURA_SEGREDO_SERVIDOR", SEGREDO);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------
// Prontuário
// ---------------------------------------------------------------------

describe("prontuários", () => {
  const valido = {
    paciente_id: PACIENTE,
    data_registro: "2026-09-22",
    titulo: "Avaliação inicial",
    queixa: "Queixa principal",
  };

  it("só a administradora registra, e a recusa não toca o banco", async () => {
    sessao.usuario = { id: ADMIN, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarProntuario } = await import("./prontuarios");

    const r = await criarProntuario({ erros: {} }, formulario(valido));
    expect(r.erros.geral).toMatch(/administradora/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("campo clínico acima do limite é recusado no campo, sem cortar em silêncio", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarProntuario } = await import("./prontuarios");

    const longo = "x".repeat(6001);
    const r = await criarProntuario(
      { erros: {} },
      formulario({ ...valido, evolucao: longo }),
    );
    expect(r.erros.evolucao).toMatch(/6\.000/);
    expect(r.valores?.evolucao).toBe(longo);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("sem atendimento, manda nulo; no sucesso revalida e vai para a ficha", async () => {
    const falso = supabaseFalso({ "rpc:prontuario_registrar": { data: PRONTUARIO } });
    banco.cliente = falso.cliente;
    const { criarProntuario } = await import("./prontuarios");

    await expect(criarProntuario({ erros: {} }, formulario(valido))).rejects.toEqual(
      new Redirecionou(`/prontuarios/${PRONTUARIO}`),
    );
    const [argumentos] = falso.passosDe("rpc:prontuario_registrar")[0].argumentos as [
      Record<string, unknown>,
    ];
    expect(argumentos.p_atendimento_id).toBeNull();
    expect(navegacao.revalidados).toContain("/");
  });

  it("atendimento de outra paciente (FK composta) vira frase segura e nada é revalidado", async () => {
    banco.cliente = supabaseFalso({
      "rpc:prontuario_registrar": {
        error: {
          code: "23503",
          message: 'insert or update on table "prontuarios" violates foreign key constraint "prontuarios_atendimento_da_paciente"',
        },
      },
    }).cliente;
    const { criarProntuario } = await import("./prontuarios");

    const r = await criarProntuario(
      { erros: {} },
      formulario({ ...valido, atendimento_id: OUTRO }),
    );
    expect(r.erros.geral).toBe("Paciente ou atendimento não encontrado.");
    expect(r.erros.geral).not.toMatch(TEXTO_TECNICO);
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("nova versão exige motivo e nunca manda paciente ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarNovaVersao } = await import("./prontuarios");

    const semMotivo = await registrarNovaVersao(
      { erros: {} },
      formulario({ ...valido, prontuario_id: PRONTUARIO }),
    );
    expect(semMotivo.erros.motivo).toBeDefined();
    expect(falso.chamadas).toHaveLength(0);

    await expect(
      registrarNovaVersao(
        { erros: {} },
        formulario({ ...valido, prontuario_id: PRONTUARIO, motivo: "corrigir a conduta" }),
      ),
    ).rejects.toEqual(new Redirecionou(`/prontuarios/${PRONTUARIO}`));

    const [argumentos] = falso.passosDe("rpc:prontuario_nova_versao")[0].argumentos as [
      Record<string, unknown>,
    ];
    // A versão é conteúdo novo; o cabeçalho não troca de paciente (0022).
    expect(argumentos).not.toHaveProperty("p_paciente_id");
    expect(argumentos.p_prontuario_id).toBe(PRONTUARIO);
  });
});

// ---------------------------------------------------------------------
// Fotos de evolução
// ---------------------------------------------------------------------

describe("fotos de evolução", () => {
  const balde = "storage:prontuario-imagens";
  const caminho = `${PRONTUARIO}/${ARQUIVO}.jpg`;
  const entrada = {
    prontuarioId: PRONTUARIO,
    caminho,
    nomeOriginal: "maria-silva-antes.jpg",
    dataCaptura: "2026-09-01",
    legenda: "antes",
    largura: 800,
    altura: 600,
  };
  const noBucket = { data: [{ name: `${ARQUIVO}.jpg`, metadata: { size: JPEG.length, mimetype: "image/jpeg" } }] };

  it("recepção não registra foto, nem fala com o Storage", async () => {
    sessao.usuario = { id: ADMIN, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r.ok).toBe(false);
    expect(falso.chamadasStorage).toHaveLength(0);
  });

  it("caminho de outro prontuário, em maiúsculas ou sem ponto é recusado antes do Storage", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    for (const forjado of [
      `${OUTRO}/${ARQUIVO}.jpg`,
      `${PRONTUARIO}/${ARQUIVO.toUpperCase()}.jpg`,
      `${PRONTUARIO}/${ARQUIVO}Xjpg`,
    ]) {
      const r = await registrarImagem({ ...entrada, caminho: forjado });
      expect(r).toEqual({ ok: false, erro: "Caminho do arquivo inválido." });
    }
    expect(falso.chamadasStorage).toHaveLength(0);
  });

  it("o que não chegou ao bucket não vira linha", async () => {
    const falso = supabaseFalso({ [`${balde}:list`]: { data: [] } });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r.ok).toBe(false);
    expect(inseriuFoto(falso)).toBe(false);
  });

  it("conteúdo que não é o tipo declarado sai do bucket e não vira linha", async () => {
    const falso = supabaseFalso({
      [`${balde}:list`]: noBucket,
      [`${balde}:download`]: { data: new Blob([GIF]) },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r).toEqual({ ok: false, erro: "O conteúdo do arquivo não é uma imagem JPEG, PNG ou WebP válida." });
    expect(falso.chamadasStorage.map((c) => c.alvo)).toContain(`${balde}:remove`);
    expect(inseriuFoto(falso)).toBe(false);
  });

  it("PNG com extensão .jpg: a mensagem diz o que é, não que não é imagem", async () => {
    const falso = supabaseFalso({
      [`${balde}:list`]: { data: [{ name: `${ARQUIVO}.jpg`, metadata: { size: PNG.length, mimetype: "image/jpeg" } }] },
      [`${balde}:download`]: { data: new Blob([PNG]) },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r).toEqual({
      ok: false,
      erro: "O arquivo é PNG, mas foi enviado como JPEG. Salve com a extensão .png e envie de novo.",
    });
    expect(inseriuFoto(falso)).toBe(false);
  });

  it("caminho já registrado neste prontuário: nada muda e o arquivo da foto fica", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { data: { prontuario_id: PRONTUARIO } },
      [`${balde}:download`]: { error: { message: "timeout" } },
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    expect(await registrarImagem(entrada)).toEqual({ ok: true });
    expect(falso.chamadasStorage).toHaveLength(0);
    expect(inseriuFoto(falso)).toBe(false);
  });

  it("caminho já registrado em outro prontuário é recusado sem tocar no Storage", async () => {
    const falso = supabaseFalso({ prontuario_imagens: { data: { prontuario_id: OUTRO } } });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    expect(await registrarImagem(entrada)).toEqual({ ok: false, erro: "Caminho do arquivo inválido." });
    expect(falso.chamadasStorage).toHaveLength(0);
  });

  it("insert recusado por caminho repetido (23505) não apaga o arquivo da linha que já existe", async () => {
    const falso = supabaseFalso({
      [`${balde}:list`]: noBucket,
      [`${balde}:download`]: { data: new Blob([JPEG]) },
      prontuario_imagens: [
        { data: null },
        { data: { ordem: 1 } },
        { error: { code: "23505", message: 'duplicate key value violates unique constraint "prontuario_imagens_caminho_key"' } },
      ],
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).not.toMatch(TEXTO_TECNICO);
    expect(falso.chamadasStorage.map((c) => c.alvo)).not.toContain(`${balde}:remove`);
  });

  it("tipo e tamanho gravados são os do objeto, não os do navegador", async () => {
    const falso = supabaseFalso({
      [`${balde}:list`]: noBucket,
      [`${balde}:download`]: { data: new Blob([JPEG]) },
      prontuario_imagens: [{ data: null }, { data: { ordem: 2 } }, { data: null }],
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    expect(await registrarImagem(entrada)).toEqual({ ok: true });
    const insercao = falso.passosDe("prontuario_imagens", 2).find((p) => p.metodo === "insert");
    expect(insercao?.argumentos[0]).toMatchObject({
      tipo_mime: "image/jpeg",
      tamanho_bytes: JPEG.length,
      ordem: 3,
      criado_por: ADMIN,
    });
  });

  it("falha parcial (linha falhou e o arquivo não saiu) fica no log, sem dado da paciente", async () => {
    const falso = supabaseFalso({
      [`${balde}:list`]: noBucket,
      [`${balde}:download`]: { data: new Blob([JPEG]) },
      [`${balde}:remove`]: { error: { message: "Internal error" } },
      prontuario_imagens: [
        { data: null },
        { data: { ordem: 0 } },
        { error: { code: "XX000", message: 'relation "prontuario_imagens" is broken' } },
        // Releitura antes de remover: sem linha, então tenta remover.
        { data: null },
      ],
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).not.toMatch(TEXTO_TECNICO);
    expect(falso.chamadasStorage.map((c) => c.alvo)).toContain(`${balde}:remove`);
    expect(logado()).toMatch(/arquivo órfão/);
    expect(logado()).toContain(caminho);
    expect(logado()).not.toMatch(/maria|antes/i);
  });

  it("INSERT sem resposta (rede) mas com a linha gravada: o arquivo da foto fica", async () => {
    // O PostgREST gravou e a conexão caiu antes da resposta: o supabase-js
    // devolve erro sem SQLSTATE. Remover aqui deixaria a linha sem arquivo.
    const falso = supabaseFalso({
      [`${balde}:list`]: noBucket,
      [`${balde}:download`]: { data: new Blob([JPEG]) },
      prontuario_imagens: [
        { data: null },
        { data: { ordem: 0 } },
        { error: { code: "", message: "TypeError: fetch failed" } },
        { data: { id: FOTO } },
      ],
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).not.toMatch(TEXTO_TECNICO);
    expect(falso.chamadasStorage.map((c) => c.alvo)).not.toContain(`${balde}:remove`);
  });

  it("sem conseguir reler a linha antes de remover, o arquivo fica e o caminho vai para o log", async () => {
    const falso = supabaseFalso({
      [`${balde}:list`]: noBucket,
      [`${balde}:download`]: { data: new Blob([JPEG]) },
      prontuario_imagens: [
        { data: null },
        { data: { ordem: 0 } },
        { error: { code: "", message: "TypeError: fetch failed" } },
        { error: { code: "57014", message: "canceling statement due to statement timeout" } },
      ],
    });
    banco.cliente = falso.cliente;
    const { registrarImagem } = await import("./prontuario-imagens");

    const r = await registrarImagem(entrada);
    expect(r.ok).toBe(false);
    expect(falso.chamadasStorage.map((c) => c.alvo)).not.toContain(`${balde}:remove`);
    expect(logado()).toMatch(/registro não conferido/);
    expect(logado()).toContain(caminho);
  });

  it("correção de legenda confere que alcançou a foto deste prontuário", async () => {
    const falso = supabaseFalso({ prontuario_imagens: { data: null } });
    banco.cliente = falso.cliente;
    const { atualizarImagem } = await import("./prontuario-imagens");

    const r = await atualizarImagem(
      { erro: null },
      formulario({ id: FOTO, prontuario_id: PRONTUARIO, data_captura: "2026-09-01", legenda: "x" }),
    );
    expect(r.erro).toBe("Foto não encontrada neste prontuário.");
    expect(falso.passosDe("prontuario_imagens")).toContainEqual({
      metodo: "eq",
      argumentos: ["prontuario_id", PRONTUARIO],
    });
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("eliminação: sem motivo ou confirmação não toca em nada", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { eliminarImagem } = await import("./prontuario-imagens");

    const semConfirmar = await eliminarImagem(
      { erro: null },
      formulario({ id: FOTO, prontuario_id: PRONTUARIO, motivo: "pedido da titular por escrito" }),
    );
    expect(semConfirmar.erro).toMatch(/confirmação/);

    const semMotivo = await eliminarImagem(
      { erro: null },
      formulario({ id: FOTO, prontuario_id: PRONTUARIO, confirmacao: "sim", motivo: "curto" }),
    );
    expect(semMotivo.erro).toMatch(/10 caracteres/);
    expect(falso.chamadas).toHaveLength(0);
    expect(falso.chamadasStorage).toHaveLength(0);
  });

  it("eliminação: Storage recusou, a linha fica e o banco não é chamado", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { data: { id: FOTO, caminho, prontuario_id: PRONTUARIO } },
      [`${balde}:remove`]: { error: { message: "Internal error" } },
    });
    banco.cliente = falso.cliente;
    const { eliminarImagem } = await import("./prontuario-imagens");

    const r = await eliminarImagem(
      { erro: null },
      formulario({ id: FOTO, prontuario_id: PRONTUARIO, confirmacao: "sim", motivo: "pedido da titular por escrito" }),
    );
    expect(r.erro).toBeTruthy();
    expect(falso.chamadas.some((c) => c.alvo === "rpc:prontuario_imagem_eliminar")).toBe(false);
    expect(logado()).toMatch(/remover o arquivo/);
  });

  it("eliminação: arquivo saiu e o registro falhou — a inconsistência vai para o log", async () => {
    const falso = supabaseFalso({
      prontuario_imagens: { data: { id: FOTO, caminho, prontuario_id: PRONTUARIO } },
      "rpc:prontuario_imagem_eliminar": { error: { code: "P0001", message: "Motivo obrigatório" } },
    });
    banco.cliente = falso.cliente;
    const { eliminarImagem } = await import("./prontuario-imagens");

    const r = await eliminarImagem(
      { erro: null },
      formulario({ id: FOTO, prontuario_id: PRONTUARIO, confirmacao: "sim", motivo: "pedido da titular por escrito" }),
    );
    expect(r.erro).toBeTruthy();
    expect(logado()).toMatch(/linha sem arquivo/);
    expect(logado()).not.toMatch(/titular/);
  });
});

// ---------------------------------------------------------------------
// Documentos e anamnese
// ---------------------------------------------------------------------

describe("documentos", () => {
  it("emissão não leva corpo nem hash: quem congela é o banco", async () => {
    const falso = supabaseFalso({ "rpc:documento_emitir": { data: DOCUMENTO } });
    banco.cliente = falso.cliente;
    const { emitirDocumento } = await import("./documentos");

    await expect(
      emitirDocumento(
        { erros: {} },
        formulario({
          paciente_id: PACIENTE,
          modelo_id: PRONTUARIO,
          titulo: "Contrato",
          corpo: "texto forjado",
          corpo_hash: "0".repeat(64),
          documento_anterior_id: OUTRO,
        }),
      ),
    ).rejects.toEqual(new Redirecionou(`/formularios/${DOCUMENTO}`));

    const [argumentos] = falso.passosDe("rpc:documento_emitir")[0].argumentos as [
      Record<string, unknown>,
    ];
    expect(Object.keys(argumentos).sort()).toEqual([
      "p_documento_anterior_id",
      "p_modelo_id",
      "p_paciente_id",
      "p_titulo",
    ]);
    // O anterior vira `substituido` na mesma transação: a ficha dele muda.
    expect(navegacao.revalidados).toContain(`/formularios/${OUTRO}`);
  });

  it("recepção não emite anamnese: a ação recusa antes de chegar ao banco", async () => {
    sessao.usuario = { id: ADMIN, papel: "recepcao" };
    const falso = supabaseFalso({ "modelos_documento": { data: { tipo: "anamnese" } } });
    banco.cliente = falso.cliente;
    const { emitirDocumento } = await import("./documentos");

    const r = await emitirDocumento(
      { erros: {} },
      formulario({ paciente_id: PACIENTE, modelo_id: PRONTUARIO, titulo: "Anamnese" }),
    );
    expect(r.erros.tipo).toMatch(/administradora/);
    expect(falso.passosDe("rpc:documento_emitir")).toHaveLength(0);
  });

  it("recepção emite contrato normalmente", async () => {
    sessao.usuario = { id: ADMIN, papel: "recepcao" };
    const falso = supabaseFalso({
      "modelos_documento": { data: { tipo: "contrato" } },
      "rpc:documento_emitir": { data: DOCUMENTO },
    });
    banco.cliente = falso.cliente;
    const { emitirDocumento } = await import("./documentos");

    await expect(
      emitirDocumento(
        { erros: {} },
        formulario({ paciente_id: PACIENTE, modelo_id: PRONTUARIO, titulo: "Contrato" }),
      ),
    ).rejects.toEqual(new Redirecionou(`/formularios/${DOCUMENTO}`));
  });

  it("só a administradora cria modelo", async () => {
    sessao.usuario = { id: ADMIN, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarModelo } = await import("./documentos");

    const r = await criarModelo({ erros: {} }, formulario({ tipo: "contrato", nome: "Contrato" }));
    expect(r.erros.geral).toMatch(/administradora/);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("assinatura no balcão: IP vem do cabeçalho, nunca do formulário", async () => {
    requisicao.cabecalhos = {
      "x-forwarded-for": "203.0.113.7, 10.0.0.1",
      "user-agent": "Navegador",
      "x-vercel-ip-city": "S%C3%A3o%20Paulo",
      "x-vercel-ip-country-region": "SP",
      "x-vercel-ip-country": "BR",
    };
    const falso = supabaseFalso({ "rpc:documento_assinar": { data: "ABCD-EFGH-JKLM" } });
    banco.cliente = falso.cliente;
    const { assinarDocumento } = await import("./documentos");

    const r = await assinarDocumento(
      { erros: {} },
      formulario({
        documento_id: DOCUMENTO,
        confirmacao: "sim",
        nome: "Ana Maria Souza",
        cpf: "",
        verificacao: "RG conferido",
        rubrica: "M100 200L300 220L500 180",
        ip: "1.1.1.1",
        localizacao: "Lugar Inventado",
      }),
    );
    expect(r.erros).toEqual({});
    const [argumentos] = falso.passosDe("rpc:documento_assinar")[0].argumentos as [
      Record<string, unknown>,
    ];
    expect(argumentos.p_ip).toBe("203.0.113.7");
    expect(argumentos.p_localizacao).toBe("São Paulo, SP, BR");
    expect(argumentos.p_rubrica).toBe("M100 200L300 220L500 180");
    expect(argumentos.p_rubrica_dispensada).toBe(false);
    expect(argumentos.p_servidor).toBe(SEGREDO);
    // O carimbo fica para depois da resposta.
    expect(depois.tarefas).toHaveLength(1);
  });

  it("assinatura no balcão: sem rubrica nem dispensa, ou com traçado inválido, não chega ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { assinarDocumento } = await import("./documentos");
    const base = { documento_id: DOCUMENTO, confirmacao: "sim", nome: "Ana Maria Souza", cpf: "", verificacao: "RG conferido" };

    const semRubrica = await assinarDocumento({ erros: {} }, formulario(base));
    expect(semRubrica.erros.rubrica).toMatch(/rubricar/);

    const invalida = await assinarDocumento({ erros: {} }, formulario({ ...base, rubrica: '<svg onload="x">' }));
    expect(invalida.erros.rubrica).toBeDefined();
    expect(falso.chamadas).toHaveLength(0);

    // Dispensada: vai, e registrada como dispensa.
    const dispensada = supabaseFalso({ "rpc:documento_assinar": { data: "ABCD-EFGH-JKLM" } });
    banco.cliente = dispensada.cliente;
    const r = await assinarDocumento({ erros: {} }, formulario({ ...base, rubrica_dispensada: "sim" }));
    expect(r.erros).toEqual({});
    const [argumentos] = dispensada.passosDe("rpc:documento_assinar")[0].argumentos as [Record<string, unknown>];
    expect(argumentos.p_rubrica).toBe("");
    expect(argumentos.p_rubrica_dispensada).toBe(true);
  });

  it("assinatura no balcão: sem o segredo do servidor, avisa em vez de gravar", async () => {
    vi.stubEnv("ASSINATURA_SEGREDO_SERVIDOR", "");
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { assinarDocumento } = await import("./documentos");

    const r = await assinarDocumento(
      { erros: {} },
      formulario({ documento_id: DOCUMENTO, confirmacao: "sim", nome: "Ana Maria Souza", cpf: "", verificacao: "RG conferido", rubrica_dispensada: "sim" }),
    );
    expect(r.erros.geral).toMatch(/não está configurada/);
    expect(falso.chamadas).toHaveLength(0);
    expect(logado()).toMatch(/ASSINATURA_SEGREDO_SERVIDOR/);
  });

  it("cancelar: assinado não cancela, e a situação vai na condição do UPDATE", async () => {
    const assinado = supabaseFalso({ documentos: { data: { situacao: "assinado" } } });
    banco.cliente = assinado.cliente;
    const { cancelarDocumento } = await import("./documentos");

    const recusa = await cancelarDocumento(
      { erro: null },
      formulario({ id: DOCUMENTO, motivo: "emitido por engano" }),
    );
    expect(recusa.erro).toMatch(/assinado/);
    expect(assinado.chamadas).toHaveLength(1);

    // Alguém assinou entre a leitura e o clique: zero linhas não é sucesso.
    const corrida = supabaseFalso({
      documentos: [{ data: { situacao: "emitido" } }, { data: null }],
    });
    banco.cliente = corrida.cliente;
    const r = await cancelarDocumento(
      { erro: null },
      formulario({ id: DOCUMENTO, motivo: "emitido por engano" }),
    );
    expect(r.erro).toMatch(/mudou de situação/);
    expect(corrida.passosDe("documentos", 1)).toContainEqual({
      metodo: "eq",
      argumentos: ["situacao", "emitido"],
    });
    expect(navegacao.revalidados).toHaveLength(0);
  });

  it("anamnese: só a administradora responde, e envio gigante nem chega ao banco", async () => {
    sessao.usuario = { id: ADMIN, papel: "recepcao" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { responderAnamnese } = await import("./documentos");

    expect((await responderAnamnese({ documentoId: DOCUMENTO, respostas: {} })).ok).toBe(false);

    sessao.usuario = { id: ADMIN, papel: "administradora" };
    const muitas = Object.fromEntries(Array.from({ length: 201 }, (_, i) => [`c${i}`, "x"]));
    const r = await responderAnamnese({ documentoId: DOCUMENTO, respostas: muitas });
    expect(r).toEqual({ ok: false, erro: "Respostas inválidas." });
    expect(falso.chamadas).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------
// Link público
// ---------------------------------------------------------------------

describe("link de assinatura", () => {
  it("a origem configurada vence o cabeçalho Host", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "https://cockpit.exemplo.com.br");
    requisicao.cabecalhos = { host: "atacante.exemplo" };
    const falso = supabaseFalso({ "rpc:documento_link_criar": { data: LINK } });
    banco.cliente = falso.cliente;
    const { criarLinkAssinatura } = await import("./assinatura-link");

    const r = await criarLinkAssinatura({ documentoId: DOCUMENTO, dias: 7 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.endereco).toMatch(/^https:\/\/cockpit\.exemplo\.com\.br\/assinar\/[A-Za-z0-9_-]{43}$/);

    // O token que vira endereço é o mesmo que o banco recebe (e guarda só o hash).
    const [argumentos] = falso.passosDe("rpc:documento_link_criar")[0].argumentos as [
      Record<string, unknown>,
    ];
    expect(r.endereco.endsWith(`/assinar/${String(argumentos.p_token)}`)).toBe(true);
    expect(argumentos.p_dias).toBe(7);
  });

  it("origem configurada inválida: nenhum link é criado, e o log não leva token", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "https://cockpit.exemplo.com.br/caminho?x=1");
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLinkAssinatura } = await import("./assinatura-link");

    const r = await criarLinkAssinatura({ documentoId: DOCUMENTO, dias: 15 });
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
    expect(logado()).toMatch(/ORIGEM_PUBLICA/);
    expect(logado()).not.toMatch(/[A-Za-z0-9_-]{43}/);
  });

  it("sem origem configurada, Host malformado é recusado", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "");
    requisicao.cabecalhos = { host: "evil.com/phish?x=" };
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLinkAssinatura } = await import("./assinatura-link");

    expect((await criarLinkAssinatura({ documentoId: DOCUMENTO, dias: 15 })).ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);
  });

  it("recusa do banco (sem data de nascimento) passa como frase nossa", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "http://localhost:3000");
    banco.cliente = supabaseFalso({
      "rpc:documento_link_criar": {
        error: { code: "P0001", message: "Cadastre a data de nascimento da paciente antes de enviar o link" },
      },
    }).cliente;
    const { criarLinkAssinatura } = await import("./assinatura-link");

    const r = await criarLinkAssinatura({ documentoId: DOCUMENTO, dias: 15 });
    expect(r).toEqual({
      ok: false,
      erro: "Cadastre a data de nascimento da paciente antes de enviar o link",
    });
  });

  it("revogar confere que o link ficou revogado — zero linhas não é sucesso", async () => {
    const semLinha = supabaseFalso({ documento_links: { data: null } });
    banco.cliente = semLinha.cliente;
    const { revogarLinkAssinatura } = await import("./assinatura-link");

    const campos = { link_id: LINK, documento_id: DOCUMENTO };
    const r = await revogarLinkAssinatura(ACAO_INICIAL, formulario(campos));
    expect(r).toEqual({ ok: false, mensagem: "Link não encontrado." });
    expect(navegacao.revalidados).toHaveLength(0);

    banco.cliente = supabaseFalso({ documento_links: { data: { id: LINK } } }).cliente;
    const ok = await revogarLinkAssinatura(ACAO_INICIAL, formulario(campos));
    expect(ok.ok).toBe(true);
    expect(navegacao.revalidados).toContain(`/formularios/${DOCUMENTO}`);
  });

  it("canal fora do formato da CHECK não é gravado; erro do UPDATE vai para o log", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { registrarCanalDoLink } = await import("./assinatura-link");

    await registrarCanalDoLink({ linkId: LINK, documentoId: DOCUMENTO, canal: "E-mail ana@x" });
    expect(falso.chamadas).toHaveLength(0);

    banco.cliente = supabaseFalso({
      documento_links: { error: { code: "23514", message: "violates check constraint" } },
    }).cliente;
    await registrarCanalDoLink({ linkId: LINK, documentoId: DOCUMENTO, canal: "WhatsApp (11) 91234-5678" });
    expect(logado()).toMatch(/registrar canal/);
  });

  it("as três portas públicas falam com o banco sem a sessão de quem estiver no navegador", async () => {
    // A paciente abre o link no tablet do balcão, com alguém da equipe logado:
    // com os cookies, o banco gravaria a funcionária como autora da resposta.
    const falso = supabaseFalso({
      "rpc:documento_link_codigo_enviar": { data: [{ situacao: "ok", email: "ana@exemplo.com", email_mascarado: "a•••a@exemplo.com", codigo: "123456", reenviar_em: null }] },
      "rpc:documento_para_assinatura": { data: [{ situacao: "ok", campos: [] }] },
      "rpc:documento_assinar_por_link": { data: [{ situacao: "ok", codigo_verificacao: "ABCD-EFGH-JKLM" }] },
      "rpc:documento_responder_por_link": { data: "ok" },
    });
    banco.cliente = falso.cliente;
    const { abrirDocumentoParaAssinatura, assinarPorLink, enviarCodigoDeVerificacao, responderPorLink } = await import("./assinatura-link");

    await enviarCodigoDeVerificacao(TOKEN, "1990-01-01");
    await abrirDocumentoParaAssinatura(TOKEN, "1990-01-01");
    await assinarPorLink({ token: TOKEN, nascimento: "1990-01-01", nome: "Ana Maria Souza", cpf: "", confirmou: true, rubricaDispensada: true });
    await responderPorLink({ token: TOKEN, nascimento: "1990-01-01", respostas: { alergia: "nao" } });

    for (const funcao of ["documento_link_codigo_enviar", "documento_para_assinatura", "documento_assinar_por_link", "documento_responder_por_link"]) {
      const passos = falso.passosDe(`rpc:${funcao}`);
      expect(passos).not.toHaveLength(0);
      // Toda porta pública leva o segredo do servidor (0032).
      const [argumentos] = passos[0].argumentos as [Record<string, unknown>];
      expect(argumentos.p_servidor).toBe(SEGREDO);
    }
    expect(banco.comSessao).toBe(0);
  });

  it("sem o segredo do servidor: 'falhou' sem chamar o banco, e o log diz o motivo", async () => {
    vi.stubEnv("ASSINATURA_SEGREDO_SERVIDOR", "curto-demais");
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { abrirDocumentoParaAssinatura, enviarCodigoDeVerificacao, responderPorLink } = await import("./assinatura-link");

    expect((await abrirDocumentoParaAssinatura(TOKEN, "1990-01-01")).situacao).toBe("falhou");
    expect((await enviarCodigoDeVerificacao(TOKEN, "1990-01-01")).situacao).toBe("falhou");
    expect(await responderPorLink({ token: TOKEN, nascimento: "1990-01-01", respostas: {} })).toBe("falhou");
    expect(falso.chamadas).toHaveLength(0);
    expect(logado()).toMatch(/ASSINATURA_SEGREDO_SERVIDOR/);
  });

  it("segredo que não confere com o banco ('nao_autorizado') vira 'falhou' e vai para o log", async () => {
    banco.cliente = supabaseFalso({
      "rpc:documento_para_assinatura": { data: [{ situacao: "nao_autorizado", campos: [] }] },
    }).cliente;
    const { abrirDocumentoParaAssinatura } = await import("./assinatura-link");

    const r = await abrirDocumentoParaAssinatura(TOKEN, "1990-01-01");
    expect(r.situacao).toBe("falhou");
    expect(logado()).toMatch(/segredo do servidor não confere/);
  });

  it("código por e-mail: o código vai só para o e-mail; a tela recebe o endereço mascarado", async () => {
    const falso = supabaseFalso({
      "rpc:documento_link_codigo_enviar": {
        data: [{ situacao: "ok", email: "ana@exemplo.com", email_mascarado: "a•••a@exemplo.com", codigo: "482913", reenviar_em: "2026-09-26T12:00:45Z" }],
      },
    });
    banco.cliente = falso.cliente;
    const { enviarCodigoDeVerificacao } = await import("./assinatura-link");

    const r = await enviarCodigoDeVerificacao(TOKEN, "1990-01-01");
    expect(r).toEqual({ situacao: "ok", emailMascarado: "a•••a@exemplo.com", reenviarEm: "2026-09-26T12:00:45Z" });
    expect(JSON.stringify(r)).not.toContain("482913");
    expect(JSON.stringify(r)).not.toContain("ana@exemplo.com");
    expect(correio.enviados).toHaveLength(1);
    expect(correio.enviados[0].para).toBe("ana@exemplo.com");
    expect(correio.enviados[0].texto).toContain("482913");
    expect(logado()).not.toContain("482913");
  });

  it("código por e-mail: envio que falha vira 'email_falhou'; 'aguarde' não envia de novo", async () => {
    correio.resultado = { ok: false, motivo: "SMTP recusou" };
    banco.cliente = supabaseFalso({
      "rpc:documento_link_codigo_enviar": [
        { data: [{ situacao: "ok", email: "ana@exemplo.com", email_mascarado: "a•••a@exemplo.com", codigo: "482913", reenviar_em: null }] },
        { data: [{ situacao: "aguarde", email: null, email_mascarado: "a•••a@exemplo.com", codigo: null, reenviar_em: "2026-09-26T12:00:45Z" }] },
      ],
    }).cliente;
    const { enviarCodigoDeVerificacao } = await import("./assinatura-link");

    expect((await enviarCodigoDeVerificacao(TOKEN, "1990-01-01")).situacao).toBe("email_falhou");
    expect(logado()).toMatch(/SMTP recusou/);

    correio.enviados = [];
    const espera = await enviarCodigoDeVerificacao(TOKEN, "1990-01-01");
    expect(espera.situacao).toBe("aguarde");
    expect(correio.enviados).toHaveLength(0);
  });

  it("criar link com código por e-mail sem envio configurado: recusa antes do banco", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "http://localhost:3000");
    correio.disponivel = false;
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { criarLinkAssinatura } = await import("./assinatura-link");

    const r = await criarLinkAssinatura({ documentoId: DOCUMENTO, dias: 15, verificacao: "nascimento_email" });
    expect(r.ok).toBe(false);
    expect(falso.chamadas).toHaveLength(0);

    correio.disponivel = true;
    const ok = supabaseFalso({ "rpc:documento_link_criar": { data: LINK } });
    banco.cliente = ok.cliente;
    expect((await criarLinkAssinatura({ documentoId: DOCUMENTO, dias: 15, verificacao: "nascimento_email" })).ok).toBe(true);
    const [argumentos] = ok.passosDe("rpc:documento_link_criar")[0].argumentos as [Record<string, unknown>];
    expect(argumentos.p_verificacao).toBe("nascimento_email");
  });

  it("carimbo: pede à autoridade o SHA-256 do manifesto que está no banco e grava", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "http://localhost:3000");
    requisicao.cabecalhos = { "x-real-ip": "198.51.100.9" };
    autoridade.resposta = { autoridade: "DigiCert", hora: new Date("2026-09-26T12:00:02Z"), tokenBase64: "MIIB" };
    const falso = supabaseFalso({
      "rpc:documento_assinar_por_link": { data: [{ situacao: "ok", codigo_verificacao: "ABCD-EFGH-JKLM" }] },
      "rpc:documento_verificar": { data: [{ situacao: "valido", manifesto_hash: "c".repeat(64), carimbo_em: null }] },
      "rpc:documento_assinatura_carimbar": { data: "ok" },
    });
    banco.cliente = falso.cliente;
    const { assinarPorLink } = await import("./assinatura-link");

    const r = await assinarPorLink({ token: TOKEN, nascimento: "1990-01-01", nome: "Ana Maria Souza", cpf: "", confirmou: true, rubrica: "M100 200L300 220L500 180" });
    expect(r).toEqual({ situacao: "ok", erros: {} });
    // Nada de autoridade antes da resposta.
    expect(autoridade.pedidos).toHaveLength(0);
    expect(depois.tarefas).toHaveLength(1);

    await depois.tarefas[0]();
    expect(autoridade.pedidos).toEqual(["c".repeat(64)]);
    const [gravacao] = falso.passosDe("rpc:documento_assinatura_carimbar")[0].argumentos as [Record<string, unknown>];
    expect(gravacao).toMatchObject({
      p_codigo_verificacao: "ABCD-EFGH-JKLM",
      p_token_base64: "MIIB",
      p_autoridade: "DigiCert",
      p_carimbo_em: "2026-09-26T12:00:02.000Z",
      p_servidor: SEGREDO,
    });
  });

  it("carimbar agora: autoridade fora do ar diz para tentar depois, e o log registra", async () => {
    banco.cliente = supabaseFalso({
      documento_assinaturas: { data: { codigo_verificacao: "ABCD-EFGH-JKLM" } },
      "rpc:documento_verificar": { data: [{ situacao: "valido", manifesto_hash: "c".repeat(64), carimbo_em: null }] },
    }).cliente;
    const { carimbarAgora } = await import("./assinatura-link");

    const r = await carimbarAgora(ACAO_INICIAL, formulario({ documento_id: DOCUMENTO }));
    expect(r.ok).toBe(false);
    expect(r.mensagem).toMatch(/Tente de novo/);
    expect(logado()).toMatch(/DigiCert: HTTP 503/);
  });

  it("a via lida pelo link traz código de verificação, endereço e QR", async () => {
    vi.stubEnv("ORIGEM_PUBLICA", "https://cockpit.exemplo.com.br");
    banco.cliente = supabaseFalso({
      "rpc:documento_para_assinatura": {
        data: [{ situacao: "ja_assinado", campos: [], codigo_verificacao: "ABCD-EFGH-JKLM", fatores: ["posse_do_link"], rubrica_dispensada: false }],
      },
    }).cliente;
    const { abrirDocumentoParaAssinatura } = await import("./assinatura-link");

    const r = await abrirDocumentoParaAssinatura(TOKEN, "1990-01-01", "12 34 56");
    expect(r.codigoVerificacao).toBe("ABCD-EFGH-JKLM");
    expect(r.enderecoVerificacao).toBe("https://cockpit.exemplo.com.br/verificar/ABCD-EFGH-JKLM");
    expect(r.qrVerificacao).toContain("/verificar/ABCD-EFGH-JKLM");
    expect(r.fatores).toEqual(["posse_do_link"]);
  });

  it("abrir: token malformado e data inválida nem chegam ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { abrirDocumentoParaAssinatura } = await import("./assinatura-link");

    expect((await abrirDocumentoParaAssinatura("%E0%A4%A", "1990-01-01")).situacao).toBe("nao_encontrado");
    expect((await abrirDocumentoParaAssinatura(TOKEN, "1990-02-30")).situacao).toBe("data_incorreta");
    expect(falso.chamadas).toHaveLength(0);
  });

  it("abrir: falha de infraestrutura é 'falhou', e o token não vai para o log", async () => {
    banco.cliente = supabaseFalso({
      "rpc:documento_para_assinatura": { error: { code: "08006", message: "connection failure" } },
    }).cliente;
    const { abrirDocumentoParaAssinatura } = await import("./assinatura-link");

    const r = await abrirDocumentoParaAssinatura(TOKEN, "1990-01-01");
    expect(r.situacao).toBe("falhou");
    expect(r.corpo).toBeNull();
    expect(logado()).not.toContain(TOKEN);
    expect(logado()).not.toContain("1990-01-01");
  });

  it("assinar pelo link: sem confirmação não chama o banco; IP vem do cabeçalho", async () => {
    requisicao.cabecalhos = { "x-forwarded-for": "198.51.100.4" };
    const falso = supabaseFalso({ "rpc:documento_assinar_por_link": { data: [{ situacao: "ok", codigo_verificacao: "ABCD-EFGH-JKLM" }] } });
    banco.cliente = falso.cliente;
    const { assinarPorLink } = await import("./assinatura-link");

    const base = { token: TOKEN, nascimento: "1990-01-01", nome: "Ana Maria Souza", cpf: "", rubricaDispensada: true };
    const semConfirmar = await assinarPorLink({ ...base, confirmou: false });
    expect(semConfirmar.erros.confirmacao).toBeDefined();
    expect(falso.chamadas).toHaveLength(0);

    const r = await assinarPorLink({ ...base, confirmou: true, leituraSegundos: 93.4, leituraCompleta: true });
    expect(r).toEqual({ situacao: "ok", erros: {} });
    const [argumentos] = falso.passosDe("rpc:documento_assinar_por_link")[0].argumentos as [
      Record<string, unknown>,
    ];
    expect(argumentos.p_ip).toBe("198.51.100.4");
    expect(argumentos.p_leitura_segundos).toBe(93);
    expect(argumentos.p_leitura_completa).toBe(true);
    expect(argumentos.p_rubrica_dispensada).toBe(true);
  });

  it("assinar pelo link: sem rubrica nem dispensa, ou traçado que não é traçado, não chega ao banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { assinarPorLink } = await import("./assinatura-link");

    const base = { token: TOKEN, nascimento: "1990-01-01", nome: "Ana Maria Souza", cpf: "", confirmou: true };
    expect((await assinarPorLink(base)).erros.rubrica).toBeDefined();
    expect((await assinarPorLink({ ...base, rubrica: "M1 1 <script>" })).erros.rubrica).toBeDefined();
    expect(falso.chamadas).toHaveLength(0);
  });

  it("responder pelo link: envio fora do tamanho vira 'respostas_invalidas' sem banco", async () => {
    const falso = supabaseFalso();
    banco.cliente = falso.cliente;
    const { responderPorLink } = await import("./assinatura-link");

    const enorme = { c1: "x".repeat(200_001) };
    expect(await responderPorLink({ token: TOKEN, nascimento: "1990-01-01", respostas: enorme })).toBe(
      "respostas_invalidas",
    );
    expect(falso.chamadas).toHaveLength(0);
  });
});
