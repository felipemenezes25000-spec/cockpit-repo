"use client";

import {
  CalendarPlus,
  ClipboardPlus,
  ListTodo,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { definirAtalhos, useAtalhosLigados } from "@/components/layout/atalhos-de-tecla";
import { cn } from "@/lib/cn";
import { ATALHOS } from "@/lib/nav";
import type { Papel } from "@/lib/perfil";

type Acao = { rotulo: string; href: string; icone: LucideIcon; so?: Papel[]; principal?: boolean };

const ACOES: Acao[] = [
  { rotulo: "Novo agendamento", href: "/agenda/novo", icone: CalendarPlus, principal: true },
  { rotulo: "Nova paciente", href: "/pacientes/novo", icone: UserPlus },
  { rotulo: "Registrar atendimento", href: "/prontuarios/novo", icone: ClipboardPlus, so: ["administradora"] },
  { rotulo: "Registrar venda", href: "/financeiro/vendas/nova", icone: Wallet },
  { rotulo: "Criar tarefa", href: "/relacionamento/tarefas/nova", icone: ListTodo },
];

/**
 * O que se faz a toda hora, a um clique — e a uma tecla (N, A, V, T), que
 * funciona em qualquer tela logada. As teclas podem ser desligadas aqui.
 */
export function AtalhosDoDia({ papel }: { papel: Papel }) {
  const ligados = useAtalhosLigados();
  const acoes = ACOES.filter((acao) => !acao.so || acao.so.includes(papel));

  return (
    <section aria-labelledby="atalhos" className="premium-panel rounded-[var(--radius-painel)] border p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 id="atalhos" className="titulo-secao text-on-surface">Atalhos</h2>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-on-surface-variant">
          <input type="checkbox" checked={ligados} onChange={(evento) => definirAtalhos(evento.target.checked)} />
          Atalhos de uma tecla
        </label>
      </div>

      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {acoes.map(({ rotulo, href, icone: Icone, principal }) => {
          const tecla = ATALHOS.find((atalho) => atalho.href === href)?.tecla;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-keyshortcuts={ligados && tecla ? tecla.toUpperCase() : undefined}
                className={cn(
                  "group flex min-h-12 items-center gap-3 rounded-[var(--radius-controle)] border px-3 py-2 text-sm font-semibold transition-colors duration-150",
                  principal
                    ? "border-primary-container bg-primary-container text-on-primary hover:border-primary-hover hover:bg-primary-hover"
                    : "border-card-border bg-surface text-primary hover:border-primary-container hover:bg-selecao",
                )}
              >
                <Icone aria-hidden="true" size={18} strokeWidth={1.9} className="shrink-0" />
                <span className="min-w-0 flex-1 leading-tight">{rotulo}</span>
                {ligados && tecla ? (
                  <kbd aria-hidden="true" className={cn("tecla", principal && "border-cabine-texto-secundario bg-transparent text-on-primary")}>
                    {tecla.toUpperCase()}
                  </kbd>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
