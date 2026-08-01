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

type Acao = { rotulo: string; href: string; icone: LucideIcon };

/** Cada atalho leva ao módulo responsável — provisório, mas navegação real. */
const ACOES: Acao[] = [
  { rotulo: "Novo paciente", href: "/pacientes", icone: UserPlus },
  { rotulo: "Novo agendamento", href: "/agenda", icone: CalendarPlus },
  { rotulo: "Registrar atendimento", href: "/prontuarios", icone: ClipboardPlus },
  { rotulo: "Registrar recebimento", href: "/financeiro", icone: Wallet },
  { rotulo: "Criar tarefa", href: "/relacionamento", icone: ListTodo },
];

export function AcoesRapidas() {
  return (
    <section aria-labelledby="acoes-rapidas">
      <h2 id="acoes-rapidas" className="sr-only">
        Ações rápidas
      </h2>
      <div className="flex flex-wrap gap-4">
        {ACOES.map(({ rotulo, href, icone: Icone }, i) => (
          <Link
            key={rotulo}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-[var(--radius-controle)] px-6 py-3 text-sm font-medium transition-colors duration-200",
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
