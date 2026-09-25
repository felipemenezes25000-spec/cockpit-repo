"use client";

import { ChevronDown } from "lucide-react";
import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { COOKIE_RECOLHIDOS, VIDA_RECOLHIDOS_S, escreverRecolhidos } from "@/lib/recolhidos";

type Paineis = {
  recolhido: (id: string) => boolean;
  definir: (id: string, recolhido: boolean) => void;
};

/** Sem provedor (teste de componente, tela fora da estrutura): tudo aberto. */
const SEM_PROVEDOR: Paineis = { recolhido: () => false, definir: () => {} };

const ContextoDosPaineis = createContext<Paineis>(SEM_PROVEDOR);

/**
 * Guarda quais painéis estão recolhidos durante a visita. Começa com o que o
 * servidor leu do cookie (a mesma lista no servidor e na hidratação, então
 * nada muda de lugar ao carregar) e grava de volta a cada clique — a próxima
 * tela montada pelo servidor já vem certa.
 */
export function ProvedorDePaineis({ inicial, children }: { inicial: string[]; children: ReactNode }) {
  const ids = useRef(new Set(inicial));
  const recolhido = useCallback((id: string) => ids.current.has(id), []);
  const definir = useCallback((id: string, fechado: boolean) => {
    if (fechado) ids.current.add(id);
    else ids.current.delete(id);
    document.cookie = `${COOKIE_RECOLHIDOS}=${escreverRecolhidos(ids.current)}; Max-Age=${VIDA_RECOLHIDOS_S}; Path=/; SameSite=Lax`;
  }, []);
  const valor = useMemo(() => ({ recolhido, definir }), [recolhido, definir]);
  return <ContextoDosPaineis.Provider value={valor}>{children}</ContextoDosPaineis.Provider>;
}

/**
 * Um painel que se abre e fecha pelo título, como o `Card` com o
 * `CardCabecalho`. O título é o botão (dentro do `<h2>`, com `aria-expanded`),
 * a seta gira e o corpo recolhe pela altura. A ação do cabeçalho ("Abrir
 * financeiro") fica fora do botão e à vista mesmo recolhido, assim como a
 * descrição, que resume o que está guardado ali.
 *
 * Recolhido, o corpo sai do Tab e do leitor de tela (`visibility: hidden`
 * depois da animação). `id` identifica o painel no cookie: curto, estável e
 * único no sistema ("vg-pendencias").
 */
export function CardRecolhivel({
  id,
  titulo,
  descricao,
  acao,
  children,
  className,
  as: Tag = "section",
}: {
  id: string;
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  const paineis = useContext(ContextoDosPaineis);
  const [aberto, setAberto] = useState(() => !paineis.recolhido(id));
  const corpo = useId();

  function alternar() {
    const agora = !aberto;
    setAberto(agora);
    paineis.definir(id, !agora);
  }

  return (
    <Tag
      data-recolhido={aberto ? undefined : true}
      className={cn("premium-panel relative overflow-hidden rounded-[var(--radius-painel)] border", className)}
    >
      <div className={cn("recolhivel-topo flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6", aberto && "recolhivel-topo-aberto")}>
        <div className="min-w-0 flex-1">
          <h2 className="titulo-secao text-on-surface">
            <button
              type="button"
              onClick={alternar}
              aria-expanded={aberto}
              aria-controls={corpo}
              title={aberto ? "Recolher" : "Expandir"}
              className="recolhivel-gatilho group -ml-1.5 inline-flex max-w-full items-center gap-2 rounded-[var(--radius-controle)] px-1.5 py-0.5 text-left transition-colors hover:bg-surface-container-low hover:text-primary"
            >
              <span className="min-w-0">{titulo}</span>
              <span aria-hidden="true" className="recolhivel-seta-caixa flex size-6 shrink-0 items-center justify-center rounded-full border border-card-border bg-surface text-outline transition-colors group-hover:border-primary-fixed-dim group-hover:text-primary">
                <ChevronDown size={15} strokeWidth={2} className="recolhivel-seta" />
              </span>
            </button>
          </h2>
          {descricao ? <div className="mt-0.5 max-w-3xl text-sm leading-6 text-on-surface-variant">{descricao}</div> : null}
        </div>
        {acao ? <div className="max-w-full shrink-0">{acao}</div> : null}
      </div>

      <div id={corpo} className="recolhivel-corpo" data-aberto={aberto}>
        <div className="recolhivel-miolo">{children}</div>
      </div>
    </Tag>
  );
}
