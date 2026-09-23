import "server-only";

import type { ErroDoBanco } from "@/lib/erros-banco";
import { falhaDeConsulta } from "@/lib/registro";

/**
 * Tamanho de cada bloco lido. Fica abaixo do `max_rows` do PostgREST (1000 no
 * `supabase/config.toml` e no padrão do Supabase hospedado), para que um bloco
 * cheio nunca seja confundido com um bloco cortado.
 */
export const TAMANHO_DO_BLOCO = 500;

type Resposta<T> = { data: T[] | null; error: ErroDoBanco };

/**
 * Lê TODAS as linhas de uma consulta, em blocos.
 *
 * O PostgREST devolve no máximo `max_rows` linhas por requisição e corta o
 * resto **sem erro**. Somar ou contar sobre uma consulta sem `range` dá um
 * total menor a partir de certo volume, e nada avisa — a mesma classe de erro
 * da RLS que filtra em silêncio (AGENTS.md §5). Toda consulta que agrega na
 * aplicação passa por aqui, ou agrega no banco.
 *
 * `montar(inicio, fim)` devolve a consulta com `.order(...)` por uma chave
 * **única** (`"id"`) e `.range(inicio, fim)`. Sem ordem estável, blocos
 * diferentes podem repetir ou pular linhas.
 */
export async function todasAsLinhas<T>(
  montar: (inicio: number, fim: number) => PromiseLike<Resposta<T>>,
  contexto: string,
  frase: string,
): Promise<T[]> {
  const linhas: T[] = [];
  for (let inicio = 0; ; inicio += TAMANHO_DO_BLOCO) {
    const { data, error } = await montar(inicio, inicio + TAMANHO_DO_BLOCO - 1);
    if (error) falhaDeConsulta(contexto, error, frase);
    linhas.push(...(data ?? []));
    if ((data?.length ?? 0) < TAMANHO_DO_BLOCO) return linhas;
  }
}

/**
 * A página pedida começa depois da última linha (`?pagina=99` numa lista de
 * duas páginas). O PostgREST responde 416 com `PGRST103` — não é falha do
 * banco, é endereço fora do alcance, e a lista deve responder vazia com a
 * paginação, não com a tela de erro.
 */
export function paginaAlemDoFim(erro: ErroDoBanco): boolean {
  return erro?.code === "PGRST103";
}
