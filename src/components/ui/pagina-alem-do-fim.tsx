import type { LucideIcon } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";

/**
 * A página pedida começa depois da última (`?pagina=9` numa lista de duas):
 * link antigo, ou a lista encolheu. A consulta responde vazia com o total
 * certo (`paginaAlemDoFim`, em `server/consultas/todas-as-linhas.ts`), e é a
 * tela que precisa não mentir — "nenhum registro" ali seria falso, e a
 * paginação diria "Página 9 de 2" com um "Anterior" para outra página que não
 * existe.
 */
export function estaAlemDoFim(resultado: { itens: readonly unknown[]; total: number }): boolean {
  return resultado.itens.length === 0 && resultado.total > 0;
}

export function PaginaAlemDoFim({
  icone,
  total,
  paginas,
  singular,
  plural,
  caminho,
  parametros,
}: {
  icone: LucideIcon;
  total: number;
  paginas: number;
  /** "documento", "paciente", "prontuário". */
  singular: string;
  plural: string;
  /** Rota da lista, sem query string. */
  caminho: string;
  /** Filtros a repetir no link, sem `pagina`. */
  parametros: Record<string, string>;
}) {
  const ultima = new URLSearchParams(parametros);
  if (paginas > 1) ultima.set("pagina", String(paginas));
  const consulta = ultima.toString();
  const endereco = consulta ? `${caminho}?${consulta}` : caminho;

  return (
    <EstadoVazio
      icone={icone}
      titulo="Esta página não existe mais"
      descricao={`A lista tem ${total} ${total === 1 ? singular : plural} em ${paginas} ${
        paginas === 1 ? "página" : "páginas"
      }. O endereço pode ser de um link antigo, ou a lista encolheu.`}
      acao={
        <BotaoLink href={endereco} variante="primaria" tamanho="sm">
          {paginas > 1 ? `Ir para a página ${paginas}` : "Voltar à lista"}
        </BotaoLink>
      }
    />
  );
}
