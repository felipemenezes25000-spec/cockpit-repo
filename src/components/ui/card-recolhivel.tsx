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
 * servidor leu do cookie e grava de volta a cada clique.
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
      className={cn("premium-panel relative min-w-0 overflow-hidden rounded-[var(--radius-painel)] border", className)}
    >
      <div className={cn("recolhivel-topo flex min-w-0 flex-col gap-4 bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-4 py-4.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6", aberto && "recolhivel-topo-aberto")}>
        <div className="min-w-0 flex-1">
          <h2 className="titulo-secao min-w-0 text-on-surface">
            <button
              type="button"
              onClick={alternar}
              aria-expanded={aberto}
              aria-controls={corpo}
              title={aberto ? "Recolher" : "Expandir"}
              className="recolhivel-gatilho group -ml-1.5 inline-flex max-w-full items-start gap-2 rounded-[var(--radius-controle)] px-1.5 py-0.5 text-left transition-[background-color,color,transform] hover:bg-selecao hover:text-primary active:scale-[0.99]"
            >
              <span className="min-w-0 break-words">{titulo}</span>
              <span aria-hidden="true" className="recolhivel-seta-caixa mt-px flex size-6 shrink-0 items-center justify-center rounded-full border border-card-border bg-surface text-outline shadow-[0_7px_16px_-14px_rgba(8,41,76,.45)] transition-colors group-hover:border-primary-fixed-dim group-hover:text-primary">
                <ChevronDown size={15} strokeWidth={2} className="recolhivel-seta" />
              </span>
            </button>
          </h2>
          {descricao ? <div className="mt-1 max-w-3xl break-words text-sm leading-6 text-on-surface-variant">{descricao}</div> : null}
        </div>
        {acao ? (
          <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:shrink-0 [&_a]:w-full [&_button]:w-full [&_form]:w-full sm:[&_a]:w-auto sm:[&_button]:w-auto sm:[&_form]:w-auto">
            {acao}
          </div>
        ) : null}
      </div>

      <div id={corpo} className="recolhivel-corpo min-w-0" data-aberto={aberto}>
        <div className="recolhivel-miolo min-w-0">{children}</div>
      </div>
    </Tag>
  );
}
