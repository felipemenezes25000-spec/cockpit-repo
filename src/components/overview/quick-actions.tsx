import {
  ArrowUpRight,
  CalendarPlus,
  ClipboardPlus,
  ListTodo,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { Papel } from "@/lib/perfil";

type Acao = { rotulo: string; href: string; icone: LucideIcon; so?: Papel[] };

const ACOES: Acao[] = [
  { rotulo: "Nova paciente", href: "/pacientes/novo", icone: UserPlus },
  { rotulo: "Novo agendamento", href: "/agenda/novo", icone: CalendarPlus },
  { rotulo: "Registrar atendimento", href: "/prontuarios/novo", icone: ClipboardPlus, so: ["administradora"] },
  { rotulo: "Registrar venda", href: "/financeiro/vendas/nova", icone: Wallet },
  { rotulo: "Criar tarefa", href: "/relacionamento/tarefas/nova", icone: ListTodo },
];

export function AcoesRapidas({ papel }: { papel: Papel }) {
  const acoes = ACOES.filter((acao) => !acao.so || acao.so.includes(papel));
  return (
    <section aria-labelledby="acoes-rapidas">
      <h2 id="acoes-rapidas" className="sr-only">Ações rápidas</h2>
      <div className="grid grid-cols-2 gap-2.5 md:flex md:flex-wrap">
        {acoes.map(({ rotulo, href, icone: Icone }, i) => (
          <Link key={rotulo} href={href} className={cn("group relative inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-[14px] border px-3.5 py-2.5 text-sm font-semibold shadow-[var(--shadow-cartao)] transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-px active:scale-[0.985] sm:px-4", i === 0 ? "border-primary-container bg-primary-container text-on-primary shadow-[var(--shadow-primary)] hover:bg-primary" : "border-card-border/90 bg-white/70 text-primary hover:border-primary/20 hover:bg-white hover:shadow-[var(--shadow-realce)]")}>
            {i === 0 ? <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/60" /> : null}
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-transform duration-200 group-hover:scale-[1.04]", i === 0 ? "bg-white/10" : "bg-primary-fixed/50")}><Icone aria-hidden="true" size={17} strokeWidth={1.65} /></span>
            <span className="min-w-0 flex-1 text-left leading-tight">{rotulo}</span>
            <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.7} className="hidden shrink-0 opacity-55 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}
