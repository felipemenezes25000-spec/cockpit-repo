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
import { LuzDoCursor } from "@/components/ui/cursor-glow";
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
          <Link
            key={rotulo}
            href={href}
            style={{ animationDelay: `${80 + i * 55}ms` }}
            className={cn(
              "dashboard-stagger group relative isolate inline-flex min-h-12 items-center gap-3 overflow-hidden rounded-[14px] border px-3.5 py-2.5 text-sm font-semibold shadow-[var(--shadow-cartao)] transition-[transform,box-shadow,background-color,border-color,color] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-px active:scale-[0.985] sm:px-4",
              i === 0
                ? "border-primary-container bg-[linear-gradient(135deg,var(--color-primary-container),var(--color-primary))] text-on-primary shadow-[var(--shadow-primary)]"
                : "border-card-border/90 bg-white/70 text-primary hover:border-primary/20 hover:bg-white hover:shadow-[var(--shadow-realce)]",
            )}
          >
            <LuzDoCursor tamanho={220} className={i === 0 ? "opacity-0 group-hover:opacity-40" : "opacity-0 group-hover:opacity-100"} />
            {i === 0 ? (
              <>
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/65" />
                <span aria-hidden="true" className="pointer-events-none absolute top-[-35%] left-[-45%] h-[170%] w-[26%] -skew-x-[22deg] bg-white/24 blur-[1px] transition-transform duration-700 ease-out group-hover:translate-x-[520%]" />
                <span aria-hidden="true" className="pointer-events-none absolute -right-7 -bottom-8 size-20 rounded-full bg-white/10 blur-2xl" />
              </>
            ) : null}
            <span className={cn(
              "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-[10px] transition-[transform,background-color] duration-200 group-hover:scale-[1.06]",
              i === 0 ? "bg-white/13" : "bg-primary-fixed/50 group-hover:bg-primary-fixed/72",
            )}>
              <Icone aria-hidden="true" size={17} strokeWidth={1.65} />
            </span>
            <span className="relative z-10 min-w-0 flex-1 text-left leading-tight">{rotulo}</span>
            <ArrowUpRight aria-hidden="true" size={15} strokeWidth={1.7} className="relative z-10 hidden shrink-0 opacity-55 transition-[transform,opacity] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-90 sm:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}
