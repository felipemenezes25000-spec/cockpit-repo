import { beforeEach, describe, expect, it, vi } from "vitest";
import { lerMes } from "@/lib/periodo";

const banco = vi.hoisted(() => ({ cliente: null as unknown, financeira: false }));
vi.mock("@/lib/supabase/server", () => ({ clienteServidor: async () => banco.cliente }));
vi.mock("@/lib/auth", () => ({ ehFinanceira: async () => banco.financeira }));

type Passo = { metodo: string; argumentos: unknown[] };
type Linha = Record<string, unknown>;

/**
 * Banco falso que responde cada bloco pelo `range` pedido, como o PostgREST:
 * `tabelas` diz todas as linhas da consulta, e cada resposta traz só o pedaço
 * do intervalo, nunca mais de 1000 (o `max_rows`). Sem `range`, vêm as 1000
 * primeiras, sem erro — o corte calado que se quer pegar.
 */
function bancoComLinhas(tabelas: (tabela: string, passos: Passo[]) => Linha[]) {
  const consultas: { tabela: string; passos: Passo[] }[] = [];
  const cliente = {
    from: (tabela: string) => {
      const passos: Passo[] = [];
      consultas.push({ tabela, passos });
      const construtor: object = new Proxy(
        {},
        {
          get(_alvo, propriedade) {
            if (propriedade === "then") {
              return (resolver: (valor: { data: Linha[]; error: null }) => void) => {
                const todas = tabelas(tabela, passos);
                const range = passos.find((p) => p.metodo === "range")?.argumentos as [number, number] | undefined;
                const [inicio, fim] = range ?? [0, 999];
                resolver({ data: todas.slice(inicio, Math.min(fim, inicio + 999) + 1), error: null });
              };
            }
            return (...argumentos: unknown[]) => {
              passos.push({ metodo: String(propriedade), argumentos });
              return construtor;
            };
          },
        },
      );
      return construtor;
    },
  };
  return { cliente, consultas };
}

const repetir = (n: number, linha: Linha) => Array.from({ length: n }, () => ({ ...linha }));
/** O filtro de situação da consulta: `.in(...)` ou `.eq(...)`, o que vier primeiro. */
const situacoes = (passos: Passo[]) => passos.find((p) => p.metodo === "in" || p.metodo === "eq")?.argumentos[1];
const pede = (passos: Passo[], situacao: string) => {
  const filtro = situacoes(passos);
  return Array.isArray(filtro) ? filtro.includes(situacao) : filtro === situacao;
};

beforeEach(() => {
  vi.resetModules();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("indicadoresDoPeriodo — mais de 1000 linhas", () => {
  it("soma todas as linhas, em blocos, e não só as 1000 primeiras", async () => {
    banco.financeira = false;
    const { cliente, consultas } = bancoComLinhas((tabela, passos) => {
      if (tabela === "vendas") return repetir(1001, { valor_final: 0.1 });
      // "A receber" é estoque de qualquer período: 1200 em aberto.
      if (tabela === "recebimentos" && pede(passos, "previsto")) {
        return repetir(1200, { valor_liquido: 1, vencimento: "2099-01-01" });
      }
      return [];
    });
    banco.cliente = cliente;
    const { indicadoresDoPeriodo } = await import("./painel-financeiro");

    const numeros = await indicadoresDoPeriodo(lerMes("2026-09"));

    expect(numeros.totalVendido).toBe(100.1);
    expect(numeros.aReceber).toBe(1200);
    // Sem perfil financeiro, despesa é "não visível", nunca zero.
    expect(numeros.despesasPagas).toBeNull();
    expect(numeros.resultadoDeCaixa).toBeNull();

    // Toda leitura foi em blocos, com ordem única.
    for (const { passos } of consultas) {
      expect(passos).toContainEqual({ metodo: "order", argumentos: ["id"] });
      expect(passos.some((p) => p.metodo === "range")).toBe(true);
    }
    expect(consultas.filter((c) => c.tabela === "vendas")).toHaveLength(3);
  });

  it("resultado de caixa em centavos: entrou R$ 30,30 e saiu R$ 30,30 é zero exato", async () => {
    banco.financeira = true;
    const { cliente } = bancoComLinhas((tabela, passos) => {
      if (tabela === "recebimentos" && pede(passos, "recebido")) {
        return [
          { valor: 10.1, taxa_valor: 0, valor_recebido: 10.1 },
          { valor: 20.2, taxa_valor: 0, valor_recebido: 20.2 },
        ];
      }
      if (tabela === "despesas" && pede(passos, "paga")) return [{ valor: 30.3 }];
      return [];
    });
    banco.cliente = cliente;
    const { indicadoresDoPeriodo } = await import("./painel-financeiro");

    const numeros = await indicadoresDoPeriodo(lerMes("2026-09"));

    expect(numeros.liquidoRecebido).toBe(30.3);
    expect(numeros.despesasPagas).toBe(30.3);
    expect(Object.is(numeros.resultadoDeCaixa, 0)).toBe(true);
  });
});
