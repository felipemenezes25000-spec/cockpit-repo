import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Paginação como link de verdade, não botão — Pacientes, Prontuários e
 * Documentos.
 *
 * Cada página tem endereço próprio: dá para abrir em outra aba, voltar pelo
 * navegador e mandar o link para alguém (AGENTS.md §6, regra 5).
 *
 * No celular (320 px), o `main` e o `CardCorpo` deixam só 254 px para os três
 * itens, e "Anterior" + "Página 12 de 15" + "Próxima" medem 291 px: a palavra
 * dos botões fica só para o leitor de tela abaixo de `sm`, e o botão vira o
 * ícone (o nome acessível continua "Anterior"/"Próxima"). A contagem não
 * quebra.
 */
export function Paginacao({
  pagina,
  paginas,
  parametros,
  caminho,
  rotulo,
}: {
  pagina: number;
  paginas: number;
  /** Busca e filtro atuais, para preservá-los ao trocar de página. */
  parametros: Record<string, string>;
  /** A lista paginada: "/pacientes", "/prontuarios", "/formularios". */
  caminho: string;
  /** Nome da navegação para o leitor de tela: "Paginação dos pacientes". */
  rotulo: string;
}) {
  if (paginas <= 1) return null;

  const enderecoDe = (destino: number) => {
    const query = new URLSearchParams(parametros);
    if (destino > 1) query.set("pagina", String(destino));
    else query.delete("pagina");
    const texto = query.toString();
    return texto ? `${caminho}?${texto}` : caminho;
  };

  const classe =
    "inline-flex h-9 min-w-9 items-center justify-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-2 text-sm text-on-surface-variant transition-colors hover:border-primary hover:text-primary sm:px-3";
  const palavra = "sr-only sm:not-sr-only";

  return (
    <nav
      aria-label={rotulo}
      className="flex items-center justify-between gap-2 border-t border-card-border pt-5"
    >
      {pagina > 1 ? (
        <Link href={enderecoDe(pagina - 1)} rel="prev" className={classe}>
          <ChevronLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          <span className={palavra}>Anterior</span>
        </Link>
      ) : (
        <span className={cn(classe, "cursor-not-allowed opacity-40")} aria-hidden="true">
          <ChevronLeft size={16} strokeWidth={1.75} />
          <span className={palavra}>Anterior</span>
        </span>
      )}

      <span aria-current="page" className="tabular text-xs whitespace-nowrap text-outline">
        Página {pagina} de {paginas}
      </span>

      {pagina < paginas ? (
        <Link href={enderecoDe(pagina + 1)} rel="next" className={classe}>
          <span className={palavra}>Próxima</span>
          <ChevronRight aria-hidden="true" size={16} strokeWidth={1.75} />
        </Link>
      ) : (
        <span className={cn(classe, "cursor-not-allowed opacity-40")} aria-hidden="true">
          <span className={palavra}>Próxima</span>
          <ChevronRight size={16} strokeWidth={1.75} />
        </span>
      )}
    </nav>
  );
}
