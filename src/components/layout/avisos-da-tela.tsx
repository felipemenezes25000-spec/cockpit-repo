"use client";

import { CircleCheck, X } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { COOKIE_DO_AVISO, lerAviso, type Aviso } from "@/lib/aviso";
import { cn } from "@/lib/cn";

const DURACAO_MS = 6500;
const SAIDA_MS = 220;

/** Lê a chave deixada pela ação de servidor e apaga o cookie na hora. */
function tirarDoCookie(): string | null {
  const par = document.cookie.split("; ").find((item) => item.startsWith(`${COOKIE_DO_AVISO}=`));
  if (!par) return null;
  document.cookie = `${COOKIE_DO_AVISO}=; Max-Age=0; Path=/; SameSite=Lax`;
  try {
    return decodeURIComponent(par.slice(COOKIE_DO_AVISO.length + 1));
  } catch {
    return null;
  }
}

/**
 * "Venda registrada", "Horário marcado": a confirmação de que a gravação deu
 * certo, na tela para onde a ação levou (ver `lib/aviso.ts`).
 *
 * Canto de baixo à direita no computador; no celular e no tablet, acima da
 * barra inferior. Some sozinho em 6,5 s — a linha de baixo mostra o tempo —,
 * e o tempo para enquanto o ponteiro ou o foco estão nele (WCAG 2.2.1). A
 * região viva existe sempre na página, para o leitor de tela anunciar o aviso
 * quando ele entra; o foco nunca é roubado.
 */
export function AvisosDaTela() {
  const caminho = usePathname();
  const busca = useSearchParams();
  const [aviso, setAviso] = useState<(Aviso & { id: number }) | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [pausado, setPausado] = useState(false);
  const contador = useRef(0);
  const restante = useRef(DURACAO_MS);
  const retomadoEm = useRef(0);

  useEffect(() => {
    const novo = lerAviso(tirarDoCookie());
    if (!novo) return;
    contador.current += 1;
    restante.current = DURACAO_MS;
    setSaindo(false);
    setPausado(false);
    setAviso({ ...novo, id: contador.current });
  }, [caminho, busca]);

  const fechar = useCallback(() => setSaindo(true), []);

  // O relógio do aviso: corre enquanto não está pausado; guarda o que falta.
  useEffect(() => {
    if (!aviso || saindo || pausado) return;
    retomadoEm.current = performance.now();
    const relogio = window.setTimeout(fechar, restante.current);
    return () => {
      window.clearTimeout(relogio);
      restante.current = Math.max(0, restante.current - (performance.now() - retomadoEm.current));
    };
  }, [aviso, saindo, pausado, fechar]);

  useEffect(() => {
    if (!saindo) return;
    const fim = window.setTimeout(() => setAviso(null), SAIDA_MS);
    return () => window.clearTimeout(fim);
  }, [saindo]);

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex justify-center sm:inset-x-auto sm:right-6 lg:bottom-6"
    >
      {aviso ? (
        <div
          key={aviso.id}
          onMouseEnter={() => setPausado(true)}
          onMouseLeave={() => setPausado(false)}
          onFocus={() => setPausado(true)}
          onBlur={() => setPausado(false)}
          className={cn(
            "aviso-entra pointer-events-auto relative flex w-full max-w-[380px] items-start gap-3 overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface py-3.5 pr-2.5 pl-3.5 shadow-flutuante sm:w-[380px]",
            saindo && "aviso-sai",
            pausado && "aviso-pausado",
          )}
        >
          <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-positivo-fundo text-positivo">
            <CircleCheck size={19} strokeWidth={2} />
          </span>
          <span className="min-w-0 flex-1 pt-0.5">
            <span className="block text-sm font-semibold text-on-surface">{aviso.titulo}</span>
            <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">{aviso.texto}</span>
          </span>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar aviso"
            className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.9} />
          </button>
          <span
            aria-hidden="true"
            className="aviso-tempo absolute inset-x-0 bottom-0 h-[3px] bg-positivo"
            style={{ "--aviso-duracao": `${DURACAO_MS}ms` } as CSSProperties}
          />
        </div>
      ) : null}
    </div>
  );
}
