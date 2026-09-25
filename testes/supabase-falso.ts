import { expect } from "vitest";

/**
 * Cliente do Supabase falso, para testar ação de servidor sem banco.
 *
 * Cada `from("tabela")` ou `rpc("função")` devolve um construtor que aceita
 * qualquer encadeamento (`.update().eq().select().maybeSingle()`), anota o
 * que foi chamado e, ao ser aguardado, entrega a próxima resposta configurada
 * para aquele alvo. Sem resposta configurada, entrega `{ data: null, error:
 * null }` — o mesmo que o PostgREST devolve quando a RLS esconde a linha.
 *
 * O objetivo não é simular o banco — isso é trabalho de
 * `supabase/testes/permissoes.sql` e do E2E —, e sim conferir o que a ação faz
 * com cada resposta: se trata o erro, se revalida só no sucesso, se a frase
 * que sobe é segura.
 */

export type RespostaFalsa = {
  data?: unknown;
  error?: { code?: string; message?: string; details?: string } | null;
  /** O `count` de `select(..., { count: "exact" })`. Sem ele, a resposta não traz `count`. */
  count?: number | null;
};

export type ChamadaFalsa = {
  alvo: string;
  passos: { metodo: string; argumentos: unknown[] }[];
};

type Construtor = {
  then: (resolver: (valor: { data: unknown; error: unknown; count?: number | null }) => void) => void;
} & Record<string, (...argumentos: unknown[]) => Construtor>;

export function supabaseFalso(respostas: Record<string, RespostaFalsa | RespostaFalsa[]> = {}) {
  const chamadas: ChamadaFalsa[] = [];
  /** Chamadas ao Storage (`storage:<balde>:<método>`), separadas das de tabela e função. */
  const chamadasStorage: { alvo: string; argumentos: unknown[] }[] = [];
  const filas = new Map<string, RespostaFalsa[]>(
    Object.entries(respostas).map(([alvo, r]) => [alvo, Array.isArray(r) ? [...r] : [r]]),
  );

  function proxima(alvo: string): { data: unknown; error: unknown; count?: number | null } {
    const fila = filas.get(alvo);
    // A última resposta de cada alvo se repete: basta configurar uma quando
    // a ação consulta a mesma tabela várias vezes.
    const resposta = fila && fila.length > 1 ? fila.shift()! : fila?.[0];
    const base = { data: resposta?.data ?? null, error: resposta?.error ?? null };
    return resposta && "count" in resposta ? { ...base, count: resposta.count } : base;
  }

  function construtor(alvo: string): Construtor {
    const chamada: ChamadaFalsa = { alvo, passos: [] };
    chamadas.push(chamada);

    const alvoProxy: Construtor = new Proxy({} as Construtor, {
      get(_objeto, propriedade) {
        if (propriedade === "then") {
          return (resolver: (valor: { data: unknown; error: unknown; count?: number | null }) => void) =>
            resolver(proxima(alvo));
        }
        return (...argumentos: unknown[]) => {
          chamada.passos.push({ metodo: String(propriedade), argumentos });
          return alvoProxy;
        };
      },
    });

    return alvoProxy;
  }

  const cliente = {
    from: (tabela: string) => construtor(tabela),
    rpc: (funcao: string, argumentos?: unknown) => {
      const c = construtor(`rpc:${funcao}`);
      chamadas[chamadas.length - 1].passos.push({ metodo: "rpc", argumentos: [argumentos] });
      return c;
    },
    storage: {
      from: (balde: string) => {
        const anotar = (metodo: string, argumentos: unknown[]) => {
          chamadasStorage.push({ alvo: `storage:${balde}:${metodo}`, argumentos });
          return proxima(`storage:${balde}:${metodo}`);
        };
        return {
          list: (...argumentos: unknown[]) => Promise.resolve(anotar("list", argumentos)),
          remove: (...argumentos: unknown[]) => Promise.resolve(anotar("remove", argumentos)),
          createSignedUrls: (...argumentos: unknown[]) =>
            Promise.resolve(anotar("createSignedUrls", argumentos)),
          download: (...argumentos: unknown[]) => Promise.resolve(anotar("download", argumentos)),
        };
      },
    },
  };

  /** Os passos de uma chamada a um alvo, na ordem em que aconteceram. */
  function passosDe(alvo: string, indice = 0) {
    return chamadas.filter((c) => c.alvo === alvo)[indice]?.passos ?? [];
  }

  return { cliente, chamadas, passosDe, chamadasStorage };
}

/** O que o `redirect` falso lança — a ação para ali, como no Next. */
export class Redirecionou extends Error {
  constructor(public readonly destino: string) {
    super(`redirect(${destino})`);
  }
}

/**
 * Casa com a linha que `registrarFalha` emite (`src/lib/registro.ts`): um
 * JSON numa linha só, com o contexto contendo `trecho` e aquele `codigo`.
 * Uso: `expect(console.error).toHaveBeenCalledWith(linhaDeRegistro("consulta x", "XX000"))`.
 */
export function linhaDeRegistro(trecho: string, codigo: string) {
  const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return expect.stringMatching(
    new RegExp(`"contexto":"[^"]*${escapar(trecho)}[^"]*","codigo":"${escapar(codigo)}"`),
  );
}
