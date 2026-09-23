import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { linhaDeRegistro } from "../../testes/supabase-falso";
import { falhaDeConsulta, registrarFalha, type EventoDeRegistro } from "./registro";

/** Espiona o `console.error` e devolve as linhas emitidas já como objeto. */
function espiarRegistro() {
  const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
  return {
    log,
    eventos: (): EventoDeRegistro[] =>
      log.mock.calls.map((chamada) => {
        // Uma linha, um argumento, uma string: é o que o log drain espera.
        expect(chamada).toHaveLength(1);
        const [linha] = chamada as [string];
        expect(typeof linha).toBe("string");
        expect(linha).not.toMatch(/[\r\n]/);
        return JSON.parse(linha) as EventoDeRegistro;
      }),
  };
}

describe("registrarFalha", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("emite UMA linha JSON com nível, contexto, código, mensagem sanitizada, id, instante e ambiente", () => {
    const { log, eventos } = espiarRegistro();
    vi.stubEnv("VERCEL_ENV", "production");

    const antes = Date.now();
    const id = registrarFalha("ação x", {
      code: "23505",
      message: 'duplicate key value violates unique constraint "pacientes_cpf_key"',
    });

    expect(id).toMatch(/^[0-9a-f]{12}$/);
    expect(log).toHaveBeenCalledTimes(1);
    const [evento] = eventos();
    expect(evento).toEqual({
      instante: expect.any(String),
      nivel: "erro",
      app: "cockpit",
      ambiente: "production",
      contexto: "ação x",
      codigo: "23505",
      mensagem: 'duplicate key value violates unique constraint "…"',
      id,
    });
    // Ordem fixa das chaves: a linha também é lida a olho em Logs da função.
    expect(Object.keys(evento ?? {})).toEqual([
      "instante",
      "nivel",
      "app",
      "ambiente",
      "contexto",
      "codigo",
      "mensagem",
      "id",
    ]);
    // ISO 8601 em UTC, do momento do registro.
    expect(evento?.instante).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Date.parse(evento?.instante ?? "")).toBeGreaterThanOrEqual(antes);
  });

  it("fora da Vercel o ambiente é o NODE_ENV, e só como rótulo", () => {
    const { eventos } = espiarRegistro();
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NODE_ENV", "test");
    registrarFalha("a", { code: "XX000", message: "x" });
    vi.stubEnv("VERCEL_ENV", 'preview"} injetado\n');
    registrarFalha("b", { code: "XX000", message: "x" });

    expect(eventos().map((e) => e.ambiente)).toEqual(["test", "previewinjetado"]);
  });

  it("o contexto não quebra a linha do log nem leva e-mail, CPF ou token, mas mantém ids e caminhos", () => {
    const { eventos } = espiarRegistro();
    const caminho = "c0000000-0000-4000-8000-000000000001/5c2d9e8f-1a3b-4c5d-8e6f-7a8b9c0d1e2f.jpg";
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2VncmVkbw";

    registrarFalha("entrar fulana@exemplo.com\nfalso", { code: "XX000", message: "x" });
    registrarFalha(`fotos: arquivo órfão no bucket (teste) ${caminho}`, { code: "XX000", message: "x" });
    registrarFalha("importação: linha 3 cpf 123.456.789-09 e 98765432100", { code: "XX000", message: "x" });
    registrarFalha(`link: ${jwt} Bearer abc.def chave ${"a".repeat(40)}`, { code: "XX000", message: "x" });

    const contextos = eventos().map((e) => e.contexto);
    expect(contextos[0]).toBe("entrar [e-mail] falso");
    // É pelo caminho que se acha o arquivo órfão; um uuid não é dado pessoal.
    expect(contextos[1]).toBe(`fotos: arquivo órfão no bucket (teste) ${caminho}`);
    // O número da linha importada fica; o CPF, com ou sem pontuação, não.
    expect(contextos[2]).toBe("importação: linha 3 cpf [cpf] e [cpf]");
    expect(contextos[3]).toBe("link: [token] Bearer [token] chave [token]");
  });

  it("a mensagem do serviço sai sem CPF, e-mail nem token", () => {
    const { eventos } = espiarRegistro();

    registrarFalha("auth", {
      code: "400",
      message:
        "falhou para ana@exemplo.com cpf 123.456.789-09 com Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2Vn",
    });

    const [evento] = eventos();
    expect(evento?.mensagem).toBe("falhou para [e-mail] cpf [número] com Bearer [token]");
    const linha = JSON.stringify(evento);
    expect(linha).not.toContain("ana@exemplo.com");
    expect(linha).not.toContain("123.456.789-09");
    expect(linha).not.toContain("eyJ");
  });

  it("não registra recusa de regra (P0001) nem erro nulo, e devolve null", () => {
    const { log } = espiarRegistro();

    expect(registrarFalha("regra", { code: "P0001", message: "Não pode." })).toBeNull();
    expect(registrarFalha("nada", null)).toBeNull();
    expect(log).not.toHaveBeenCalled();
  });

  it("a linha casa com o `linhaDeRegistro` que os testes de ação e consulta usam", () => {
    const { log } = espiarRegistro();

    registrarFalha("consulta prontuarios: cabeçalho (x.y)", { code: "57014", message: "timeout" });

    expect(log).toHaveBeenCalledWith(linhaDeRegistro("consulta prontuarios", "57014"));
    expect(log).toHaveBeenCalledWith(linhaDeRegistro("(x.y)", "57014"));
    expect(log).not.toHaveBeenCalledWith(linhaDeRegistro("consulta prontuarios", "XX000"));
    expect(log).not.toHaveBeenCalledWith(linhaDeRegistro("consulta pacientes", "57014"));
  });

  it("gera um id diferente a cada falha", () => {
    espiarRegistro();
    const erro = { code: "08006", message: "conexão" };

    expect(registrarFalha("a", erro)).not.toBe(registrarFalha("a", erro));
  });
});

describe("falhaDeConsulta", () => {
  it("registra e lança a frase segura, nunca a mensagem do Postgres", () => {
    const { eventos } = espiarRegistro();

    expect(() =>
      falhaDeConsulta("consulta y", { code: "XX000", message: "segredo interno" }, "Não deu."),
    ).toThrow("Não deu.");
    expect(eventos().map((e) => e.contexto)).toEqual(["consulta y"]);
  });
});

describe("registro central", () => {
  it("não existe console.* no código da aplicação fora de src/lib/registro.ts", () => {
    const raiz = fileURLToPath(new URL("..", import.meta.url));
    const arquivos = (readdirSync(raiz, { recursive: true }) as string[])
      .filter((a) => /\.(ts|tsx)$/.test(a) && !/\.test\.tsx?$/.test(a))
      .map((a) => join(raiz, a));
    const permitido = join(raiz, "lib", "registro.ts");

    const infratores = arquivos
      .filter((a) => a !== permitido)
      .filter((a) => /\bconsole\s*\.\s*\w+/.test(readFileSync(a, "utf-8")))
      .map((a) => relative(raiz, a).split(sep).join("/"));

    expect(arquivos.length).toBeGreaterThan(50);
    expect(infratores).toEqual([]);
  });
});
