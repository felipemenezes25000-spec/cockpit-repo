import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ErroDoBanco } from "@/lib/erros-banco";
import { linhaDeRegistro, supabaseFalso } from "../../../testes/supabase-falso";
import { paginaAlemDoFim, TAMANHO_DO_BLOCO, todasAsLinhas } from "./todas-as-linhas";

type Linha = { id: number };
type Cliente = ReturnType<typeof supabaseFalso>["cliente"];

/** A consulta como as de produção a montam: ordem única e `range` do bloco. */
function montarCom(cliente: Cliente) {
  return (inicio: number, fim: number) =>
    cliente.from("vendas").select("id").order("id").range(inicio, fim) as unknown as PromiseLike<{
      data: Linha[] | null;
      error: ErroDoBanco;
    }>;
}

/** `n` linhas numeradas a partir de `inicio`, para conferir que nada repete nem some. */
function linhas(n: number, inicio = 0) {
  return Array.from({ length: n }, (_, i) => ({ id: inicio + i }));
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("todasAsLinhas", () => {
  // O PostgREST corta cada resposta em `max_rows` (1000) sem erro. Um bloco
  // cheio não diz que acabou — só um bloco incompleto diz.
  it("bloco cheio pede o próximo, até vir um incompleto", async () => {
    const { cliente, passosDe } = supabaseFalso({
      vendas: [
        { data: linhas(TAMANHO_DO_BLOCO) },
        { data: linhas(TAMANHO_DO_BLOCO, 500) },
        { data: linhas(1, 1000) },
      ],
    });

    const lidas = await todasAsLinhas(
      montarCom(cliente),
      "teste",
      "Não foi possível.",
    );

    // 1001 linhas: o que uma consulta sem `range` teria perdido em silêncio.
    expect(lidas).toHaveLength(1001);
    expect(new Set(lidas.map((l) => l.id)).size).toBe(1001);
    for (const [indice, intervalo] of [[0, 499], [500, 999], [1000, 1499]].entries()) {
      expect(passosDe("vendas", indice)).toContainEqual({ metodo: "range", argumentos: intervalo });
    }
    expect(passosDe("vendas", 3)).toEqual([]);
  });

  it("total múltiplo do bloco: o bloco vazio seguinte encerra", async () => {
    const { cliente, chamadas } = supabaseFalso({
      vendas: [{ data: linhas(TAMANHO_DO_BLOCO) }, { data: [] }],
    });

    const lidas = await todasAsLinhas(
      montarCom(cliente),
      "teste",
      "Não foi possível.",
    );

    expect(lidas).toHaveLength(TAMANHO_DO_BLOCO);
    expect(chamadas).toHaveLength(2);
  });

  it("bloco incompleto logo de cara: uma ida só", async () => {
    const { cliente, chamadas } = supabaseFalso({ vendas: { data: linhas(3) } });

    const lidas = await todasAsLinhas(
      montarCom(cliente),
      "teste",
      "Não foi possível.",
    );

    expect(lidas).toHaveLength(3);
    expect(chamadas).toHaveLength(1);
  });

  it("`data` nulo sem erro (a RLS escondeu tudo) é lista vazia, não laço", async () => {
    const { cliente, chamadas } = supabaseFalso();

    const lidas = await todasAsLinhas(
      montarCom(cliente),
      "teste",
      "Não foi possível.",
    );

    expect(lidas).toEqual([]);
    expect(chamadas).toHaveLength(1);
  });

  // Uma soma com o primeiro bloco e sem o segundo seria o mesmo total menor,
  // calado, que a função existe para impedir.
  it("erro em qualquer bloco falha alto, com a frase nossa, e registra o código", async () => {
    const { cliente } = supabaseFalso({
      vendas: [
        { data: linhas(TAMANHO_DO_BLOCO) },
        { error: { code: "XX000", message: "relation vendas: detalhe interno" } },
      ],
    });

    await expect(
      todasAsLinhas(
        montarCom(cliente),
        "consulta teste",
        "Não foi possível carregar as vendas.",
      ),
    ).rejects.toThrow("Não foi possível carregar as vendas.");

    // O formato da linha de log é de `lib/registro.ts`; aqui importa que
    // o contexto e o código cheguem a ela.
    expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta teste", "XX000"));
  });

  it("a mensagem crua do banco não sobe", async () => {
    const { cliente } = supabaseFalso({
      vendas: { error: { code: "XX000", message: "relation vendas: detalhe interno" } },
    });

    const falha = todasAsLinhas(
      montarCom(cliente),
      "consulta teste",
      "Não foi possível carregar as vendas.",
    );

    await expect(falha).rejects.toThrow();
    await falha.catch((erro: Error) => expect(erro.message).not.toContain("relation"));
  });
});

describe("paginaAlemDoFim", () => {
  it("reconhece o 416 do PostgREST para página depois da última", () => {
    expect(paginaAlemDoFim({ code: "PGRST103", message: "Requested range not satisfiable" })).toBe(true);
  });

  it("qualquer outro erro — ou nenhum — não é página além do fim", () => {
    expect(paginaAlemDoFim({ code: "XX000", message: "falha" })).toBe(false);
    expect(paginaAlemDoFim({ code: "42501", message: "permission denied" })).toBe(false);
    expect(paginaAlemDoFim({ message: "sem código" })).toBe(false);
    expect(paginaAlemDoFim(null)).toBe(false);
    expect(paginaAlemDoFim(undefined)).toBe(false);
  });
});
