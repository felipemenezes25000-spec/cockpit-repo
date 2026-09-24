"use client";

import { Bell, ChevronRight, CircleAlert, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

export function PreviewNotificacoes({ pendenciasAltas }: { pendenciasAltas: number }) {
  const [aberto, setAberto] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  const primeiroLink = useRef<HTMLAnchorElement>(null);

  const fechar = useCallback((devolverFoco = true) => {
    setAberto(false);
    if (devolverFoco) window.requestAnimationFrame(() => gatilho.current?.focus());
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const id = window.requestAnimationFrame(() => primeiroLink.current?.focus());
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar();
      }
    }
    function aoClicarFora(evento: MouseEvent) {
      if (!container.current?.contains(evento.target as Node)) fechar(false);
    }
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicarFora);
    return () => {
      window.cancelAnimationFrame(id);
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto, fechar]);

  return (
    <div ref={container} className="relative">
      <button
        ref={gatilho}
        type="button"
        onClick={() => setAberto((valor) => !valor)}
        aria-expanded={aberto}
        aria-controls="preview-notificacoes"
        aria-label={`${pendenciasAltas} ${pendenciasAltas === 1 ? "pendência prioritária" : "pendências prioritárias"}`}
        className={cn(
          "group relative flex size-10 items-center justify-center rounded-[12px] border border-transparent text-on-surface-variant transition-[transform,background-color,border-color,color,box-shadow] duration-200 active:scale-95",
          aberto
            ? "border-primary/10 bg-white/80 text-primary shadow-[var(--shadow-cartao)]"
            : "hover:border-primary/10 hover:bg-primary-fixed/35 hover:text-primary",
        )}
      >
        <Bell aria-hidden="true" size={21} strokeWidth={1.6} className="transition-transform duration-200 group-hover:-rotate-6" />
        {pendenciasAltas > 0 ? (
          <span aria-hidden="true" className="tabular absolute top-0.5 right-0.5 flex min-w-4.5 items-center justify-center rounded-full border-2 border-white bg-error px-1 text-[0.58rem] font-bold text-on-primary shadow-[0_2px_8px_rgba(187,0,0,0.2)]">
            {pendenciasAltas}
          </span>
        ) : null}
      </button>

      {aberto ? (
        <div
          id="preview-notificacoes"
          role="dialog"
          aria-label="Pendências prioritárias"
          className="glass-surface page-reveal absolute right-0 z-40 mt-3 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-[20px] border border-white/80 shadow-[0_28px_70px_-26px_rgba(7,35,66,0.45),var(--shadow-flutuante)]"
        >
          <div className="relative overflow-hidden border-b border-card-border/75 px-4 py-4">
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-40 rounded-full bg-primary-fixed/55 blur-3xl" />
            <div className="relative flex items-start gap-3">
              <span className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[13px] border shadow-[var(--shadow-cartao)]",
                pendenciasAltas > 0
                  ? "border-atencao-borda/70 bg-atencao-fundo text-atencao"
                  : "border-positivo-borda/70 bg-positivo-fundo text-positivo",
              )}>
                {pendenciasAltas > 0 ? <CircleAlert aria-hidden="true" size={19} strokeWidth={1.7} /> : <Sparkles aria-hidden="true" size={18} strokeWidth={1.7} />}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface">Pendências prioritárias</p>
                <p className="mt-1 text-xs leading-5 text-outline">
                  {pendenciasAltas > 0
                    ? `${pendenciasAltas} ${pendenciasAltas === 1 ? "item pede" : "itens pedem"} atenção na operação.`
                    : "Nenhum item de prioridade alta agora."}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2.5">
            <Link
              ref={primeiroLink}
              href="/"
              onClick={() => fechar(false)}
              className="group flex min-h-11 items-center gap-3 rounded-[13px] px-3 py-2.5 text-sm text-on-surface-variant outline-none transition-[transform,background-color,color,box-shadow] duration-150 hover:bg-white/65 hover:text-primary focus-visible:bg-white/75 focus-visible:text-primary focus-visible:shadow-[0_0_0_3px_rgba(10,110,209,0.08)] active:scale-[0.99]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-primary-fixed/45 text-primary">
                <Bell aria-hidden="true" size={16} strokeWidth={1.6} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">Abrir Visão Geral</span>
                <span className="mt-0.5 block text-[0.67rem] text-outline">Veja a fila operacional e o que precisa de ação.</span>
              </span>
              <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-outline transition-transform duration-150 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
            </Link>
          </div>

          <div className="border-t border-card-border/70 bg-white/32 px-4 py-2.5 text-[0.64rem] leading-5 text-outline">
            A central completa de notificações continua em preparação.
          </div>
        </div>
      ) : null}
    </div>
  );
}
