"use client";

import {
  ArrowRight,
  CalendarPlus,
  ClipboardPlus,
  CornerDownLeft,
  ListTodo,
  Search,
  Sparkles,
  UserPlus,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { MENU } from "@/lib/nav";
import { cn } from "@/lib/cn";
import type { Papel } from "@/lib/perfil";

type AcaoRapida = {
  rotulo: string;
  descricao: string;
  href: string;
  icone: LucideIcon;
  so?: Papel[];
};

const ACOES: AcaoRapida[] = [
  { rotulo: "Nova paciente", descricao: "Abrir o cadastro de uma nova paciente", href: "/pacientes/novo", icone: UserPlus },
  { rotulo: "Novo agendamento", descricao: "Marcar um atendimento na agenda", href: "/agenda/novo", icone: CalendarPlus },
  { rotulo: "Registrar atendimento", descricao: "Criar um novo prontuário clínico", href: "/prontuarios/novo", icone: ClipboardPlus, so: ["administradora"] },
  { rotulo: "Registrar venda", descricao: "Abrir o fluxo de uma nova venda", href: "/financeiro/vendas/nova", icone: Wallet },
  { rotulo: "Criar tarefa", descricao: "Adicionar uma tarefa de relacionamento", href: "/relacionamento/tarefas/nova", icone: ListTodo },
];

export function CommandPalette({
  aberta,
  aoFechar,
  papel,
}: {
  aberta: boolean;
  aoFechar: () => void;
  papel: Papel;
}) {
  const router = useRouter();
  const painelRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLInputElement>(null);
  const focoAnteriorRef = useRef<HTMLElement | null>(null);
  const [termo, setTermo] = useState("");
  const [selecionado, setSelecionado] = useState(0);

  const buscaNormalizada = termo.trim().toLocaleLowerCase("pt-BR");

  const acoes = useMemo(() => {
    return ACOES.filter((acao) => {
      if (acao.so && !acao.so.includes(papel)) return false;
      if (!buscaNormalizada) return true;
      return `${acao.rotulo} ${acao.descricao}`
        .toLocaleLowerCase("pt-BR")
        .includes(buscaNormalizada);
    });
  }, [buscaNormalizada, papel]);

  const itens = useMemo(() => {
    return MENU.filter((item) => {
      if (!buscaNormalizada) return true;
      return `${item.rotulo} ${item.finalidade}`
        .toLocaleLowerCase("pt-BR")
        .includes(buscaNormalizada);
    });
  }, [buscaNormalizada]);

  const podeBuscar = termo.trim().length >= 2;
  const inicioAcoes = podeBuscar ? 1 : 0;
  const inicioModulos = inicioAcoes + acoes.length;
  const total = inicioModulos + itens.length;

  useEffect(() => {
    if (!aberta) return;
    focoAnteriorRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setTermo("");
    setSelecionado(0);
    const id = window.requestAnimationFrame(() => campoRef.current?.focus());
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.cancelAnimationFrame(id);
      document.body.style.overflow = overflowAnterior;
      const anterior = focoAnteriorRef.current;
      focoAnteriorRef.current = null;
      if (anterior?.isConnected) {
        window.requestAnimationFrame(() => anterior.focus());
      }
    };
  }, [aberta]);

  useEffect(() => {
    if (selecionado < total) return;
    setSelecionado(Math.max(0, total - 1));
  }, [selecionado, total]);

  if (!aberta) return null;

  function navegar(href: string) {
    aoFechar();
    router.push(href);
  }

  function aoTeclar(evento: ReactKeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      aoFechar();
      return;
    }

    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setSelecionado((atual) => (total ? (atual + 1) % total : 0));
      return;
    }

    if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setSelecionado((atual) => (total ? (atual - 1 + total) % total : 0));
      return;
    }

    if (evento.key === "Enter" && total > 0) {
      evento.preventDefault();
      if (podeBuscar && selecionado === 0) {
        navegar(`/busca?q=${encodeURIComponent(termo.trim())}`);
        return;
      }

      if (selecionado >= inicioAcoes && selecionado < inicioModulos) {
        const acao = acoes[selecionado - inicioAcoes];
        if (acao) navegar(acao.href);
        return;
      }

      const item = itens[selecionado - inicioModulos];
      if (item) navegar(item.href);
      return;
    }

    if (evento.key === "Tab") {
      const focaveis = Array.from(
        painelRef.current?.querySelectorAll<HTMLElement>(
          'input, button, a[href], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((elemento) => !elemento.hasAttribute("disabled"));
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#08192b]/32 px-3 pt-[10vh] backdrop-blur-[7px] sm:px-6 sm:pt-[14vh]"
      role="presentation"
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) aoFechar();
      }}
    >
      <div
        ref={painelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Comandos rápidos"
        onKeyDown={aoTeclar}
        className="page-reveal glass-surface w-full max-w-[680px] overflow-hidden rounded-[24px] border border-white/80 shadow-[0_32px_90px_-28px_rgba(7,35,66,0.48),0_12px_32px_-20px_rgba(7,35,66,0.32)]"
      >
        <div className="relative border-b border-card-border/80 px-4 py-4 sm:px-5">
          <div aria-hidden="true" className="pointer-events-none absolute -top-16 right-12 size-40 rounded-full bg-primary-fixed/45 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[13px] border border-primary/10 bg-white/75 text-primary shadow-[var(--shadow-cartao)]">
              <Search aria-hidden="true" size={19} strokeWidth={1.7} />
            </span>
            <input
              ref={campoRef}
              type="search"
              value={termo}
              onChange={(evento) => {
                setTermo(evento.target.value);
                setSelecionado(0);
              }}
              placeholder="Ação, módulo ou busca no sistema…"
              aria-label="Buscar comando ou módulo"
              className="min-w-0 flex-1 bg-transparent text-[1rem] font-medium text-on-surface outline-none placeholder:font-normal placeholder:text-outline"
            />
            <button
              type="button"
              onClick={aoFechar}
              aria-label="Fechar comandos rápidos"
              className="flex size-9 shrink-0 items-center justify-center rounded-[11px] text-outline transition-[transform,background-color,color] duration-150 hover:bg-white/75 hover:text-primary active:scale-95"
            >
              <X aria-hidden="true" size={18} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="rolagem-discreta max-h-[62vh] overflow-y-auto p-2.5 sm:p-3">
          {podeBuscar ? (
            <button
              type="button"
              onMouseEnter={() => setSelecionado(0)}
              onClick={() => navegar(`/busca?q=${encodeURIComponent(termo.trim())}`)}
              className={cn(
                "group mb-1 flex w-full items-center gap-3 rounded-[15px] border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 active:scale-[0.99] sm:px-4",
                selecionado === 0
                  ? "border-primary/15 bg-primary-fixed/45 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)]"
                  : "border-transparent hover:bg-white/60",
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-primary text-on-primary shadow-[var(--shadow-primary)]">
                <Sparkles aria-hidden="true" size={17} strokeWidth={1.7} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-on-surface">Buscar “{termo.trim()}”</span>
                <span className="mt-0.5 block truncate text-xs text-outline">Pacientes, atendimentos e documentos</span>
              </span>
              <CornerDownLeft aria-hidden="true" size={16} className="shrink-0 text-outline" />
            </button>
          ) : null}

          {acoes.length ? (
            <>
              <div className="px-2 pb-1 pt-2 text-[0.66rem] font-semibold tracking-[0.08em] text-outline uppercase">Ações rápidas</div>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {acoes.map((acao, indice) => {
                  const Icone = acao.icone;
                  const indiceReal = inicioAcoes + indice;
                  const ativo = selecionado === indiceReal;
                  return (
                    <button
                      key={acao.href}
                      type="button"
                      onMouseEnter={() => setSelecionado(indiceReal)}
                      onClick={() => navegar(acao.href)}
                      className={cn(
                        "group flex min-w-0 items-center gap-3 rounded-[15px] border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 active:scale-[0.99]",
                        ativo
                          ? "border-primary/15 bg-primary-fixed/38 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),var(--shadow-cartao)]"
                          : "border-transparent hover:bg-white/55",
                      )}
                    >
                      <span className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-[11px] border transition-[transform,background-color,color] duration-150 group-hover:scale-[1.03]",
                        ativo ? "border-primary/10 bg-white/85 text-primary" : "border-card-border/80 bg-white/60 text-on-surface-variant",
                      )}>
                        <Icone aria-hidden="true" size={18} strokeWidth={1.65} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-on-surface">{acao.rotulo}</span>
                        <span className="mt-0.5 block truncate text-[0.68rem] text-outline">{acao.descricao}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          <div className="px-2 pb-1 pt-3 text-[0.66rem] font-semibold tracking-[0.08em] text-outline uppercase">Módulos</div>

          {itens.length ? (
            <div className="flex flex-col gap-1">
              {itens.map((item, indice) => {
                const Icone = item.icone;
                const indiceReal = inicioModulos + indice;
                const ativo = selecionado === indiceReal;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onMouseEnter={() => setSelecionado(indiceReal)}
                    onClick={() => navegar(item.href)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-[15px] border px-3 py-3 text-left transition-[transform,background-color,border-color,box-shadow] duration-150 active:scale-[0.99] sm:px-4",
                      ativo
                        ? "border-primary/15 bg-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),var(--shadow-cartao)]"
                        : "border-transparent hover:bg-white/55",
                    )}
                  >
                    <span className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[11px] border transition-[transform,background-color,color] duration-150 group-hover:scale-[1.03]",
                      ativo ? "border-primary/10 bg-primary-fixed/60 text-primary" : "border-card-border/80 bg-white/65 text-on-surface-variant",
                    )}>
                      <Icone aria-hidden="true" size={18} strokeWidth={1.65} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                        {item.rotulo}
                        {item.emConstrucao ? <span className="rounded-[6px] border border-card-border bg-white/70 px-1.5 py-0.5 text-[0.58rem] font-semibold tracking-wide text-outline uppercase">em breve</span> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-outline">{item.finalidade}</span>
                    </span>
                    <ArrowRight aria-hidden="true" size={16} className={cn("shrink-0 text-outline transition-transform duration-150", ativo && "translate-x-0.5 text-primary")} />
                  </button>
                );
              })}
            </div>
          ) : acoes.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium text-on-surface">Nenhum comando encontrado</p>
              <p className="mt-1 text-xs text-outline">Digite pelo menos 2 letras para buscar em todo o sistema.</p>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-card-border/75 bg-white/40 px-4 py-2.5 text-[0.64rem] text-outline sm:px-5">
          <span>↑ ↓ navegar · Enter abrir · Esc fechar</span>
          <span className="inline-flex items-center gap-1.5"><kbd className="rounded-[6px] border border-card-border bg-white/80 px-1.5 py-0.5 font-semibold">Ctrl K</kbd> comandos rápidos</span>
        </div>
      </div>
    </div>
  );
}
