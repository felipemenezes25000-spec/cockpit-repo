import {
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

/**
 * Cada atalho leva ao fluxo principal do módulo responsável.
 *
 * Atalho para onde o perfil não entra não aparece: o prontuário é só da
 * administradora, e a recepção clicava em "Registrar atendimento" para cair
 * numa tela de acesso restrito. Botão que vai falhar é pior que botão ausente.
 */
const ACOES: Acao[] = [
  { rotulo: "Nova paciente", href: "/pacientes/novo", icone: UserPlus },
  { rotulo: "Novo agendamento", href: "/agenda/novo", icone: CalendarPlus },
  {
    rotulo: "Registrar atendimento",
    href: "/prontuarios/novo",
    icone: ClipboardPlus,
    so: ["administradora"],
  },
  { rotulo: "Registrar venda", href: "/financeiro/vendas/nova", icone: Wallet },
  { rotulo: "Criar tarefa", href: "/relacionamento/tarefas/nova", icone: ListTodo },
];

export function AcoesRapidas({ papel }: { papel: Papel }) {
  const acoes = ACOES.filter((acao) => !acao.so || acao.so.includes(papel));

  return (
    <section aria-labelledby="acoes-rapidas">
      <h2 id="acoes-rapidas" className="sr-only">
        Ações rápidas
      </h2>
      <div className="flex flex-wrap gap-3 sm:gap-4">
        {acoes.map(({ rotulo, href, icone: Icone }, i) => (
          <Link
            key={rotulo}
            href={href}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-controle)] px-5 py-2.5 text-sm font-medium transition-colors duration-200 sm:px-6",
              /* A primeira ação é a principal; as demais ficam em contorno */
              i === 0
                ? "bg-primary-container text-on-primary hover:bg-primary"
                : "border border-primary bg-surface text-primary hover:bg-surface-container-low",
            )}
          >
            <Icone aria-hidden="true" size={18} strokeWidth={1.5} />
            {rotulo}
          </Link>
        ))}
      </div>
    </section>
  );
}
