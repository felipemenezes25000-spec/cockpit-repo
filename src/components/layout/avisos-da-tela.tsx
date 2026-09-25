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

/** Confirmações pós-ação: venda registrada, horário marcado etc. */
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
            "aviso-entra pointer-events-auto relative flex w-full max-w-[390px] items-start gap-3 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-positivo-borda bg-[linear-gradient(145deg,#ffffff_0%,#f7fcf8_100%)] py-3.5 pr-2.5 pl-3.5 shadow-[0_26px_70px_-34px_rgba(8,41,76,.38),0_8px_22px_-16px_rgba(14,118,57,.18)] sm:w-[390px]",
            saindo && "aviso-sai",
            pausado && "aviso-pausado ring-1 ring-inset ring-positivo-borda/60",
          )}
        >
          <span aria-hidden="true" className="pointer-events-none absolute -top-12 -left-10 size-28 rounded-full bg-positivo-fundo blur-2xl" />
          <span aria-hidden="true" className="relative flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo text-positivo shadow-[0_10px_22px_-18px_rgba(14,118,57,.5)]">
            <CircleCheck size={19} strokeWidth={2} />
          </span>
          <span className="relative min-w-0 flex-1 pt-0.5">
            <span className="block text-sm font-semibold tracking-[-0.01em] text-on-surface">{aviso.titulo}</span>
            <span className="mt-0.5 block text-xs leading-5 text-on-surface-variant">{aviso.texto}</span>
            {pausado ? <span className="mt-1.5 block text-[0.62rem] font-semibold tracking-[0.04em] text-positivo uppercase">Tempo pausado enquanto você lê</span> : null}
          </span>
          <button
            type="button"
            onClick={fechar}
            aria-label="Fechar aviso"
            className="relative flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] hover:bg-positivo-fundo hover:text-positivo active:scale-95"
          >
            <X aria-hidden="true" size={16} strokeWidth={1.9} />
          </button>
          <span
            aria-hidden="true"
            className="aviso-tempo absolute inset-x-0 bottom-0 h-[3px] bg-[linear-gradient(90deg,#0e7639,#36a163)]"
            style={{ "--aviso-duracao": `${DURACAO_MS}ms` } as CSSProperties}
          />
        </div>
      ) : null}
    </div>
  );
}
