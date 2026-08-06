import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Clock3,
  Repeat2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import { indicadores } from "@/server/consultas/indicadores";

type Indicador = {
  rotulo: string;
  valor: string;
  apoio: string;
  icone: LucideIcon;
  href: string;
  /** Números financeiros ganham marca de demonstrativo e corpo menor. */
  financeiro?: boolean;
  /** Deixa a linha de apoio em vermelho quando o número pede atenção. */
  atencao?: boolean;
};

export async function CartoesIndicadores({ exemplo }: { exemplo: boolean }) {
  const n = await indicadores();

  const lista: Indicador[] = [
    {
      rotulo: "Atendimentos de hoje",
      valor: String(n.atendimentosHoje),
      apoio: `${n.concluidos} já ${n.concluidos === 1 ? "concluído" : "concluídos"}`,
      icone: CalendarDays,
      href: "/agenda",
    },
    {
      rotulo: "Confirmados",
      valor: String(n.confirmados),
      apoio: `de ${n.atendimentosHoje} na agenda de hoje`,
      icone: BadgeCheck,
      href: "/agenda",
    },
    {
      rotulo: "Confirmações pendentes",
      valor: String(n.confirmacoesPendentes),
      apoio:
        n.confirmacoesPendentes > 0 ? "precisam de contato hoje" : "nenhuma em aberto",
      icone: Clock3,
      href: "/agenda",
      atencao: n.confirmacoesPendentes > 0,
    },
    {
      rotulo: "Aguardando retorno",
      valor: String(n.aguardandoRetorno),
      apoio: "pacientes na janela de contato",
      icone: Repeat2,
      href: "/relacionamento",
    },
    {
      rotulo: "Recebido no mês",
      valor: formatarMoeda(n.recebidoNoMes),
      apoio: "lançamentos já quitados",
      icone: Wallet,
      href: "/financeiro",
      financeiro: true,
    },
    {
      rotulo: "A receber",
      valor: formatarMoeda(n.aReceber),
      apoio: n.vencido > 0 ? `${formatarMoeda(n.vencido)} já vencido` : "nada vencido",
      icone: CalendarClock,
      href: "/financeiro",
      financeiro: true,
      atencao: n.vencido > 0,
    },
  ];

  return (
    <section aria-labelledby="indicadores">
      <h2 id="indicadores" className="sr-only">
        Indicadores principais
      </h2>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 xl:grid-cols-6">
        {lista.map((ind) => {
          const Icone = ind.icone;
          return (
            <Link
              key={ind.rotulo}
              href={ind.href}
              className="flex flex-col rounded-[var(--radius-cartao)] border border-card-border bg-card p-6 transition-colors hover:border-primary-fixed-dim"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <h3 className="rotulo tracking-wider">{ind.rotulo}</h3>
                <Icone
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                  className="shrink-0 text-outline-variant"
                />
              </div>

              <span
                className={cn(
                  "tabular mb-2 text-on-surface",
                  ind.financeiro ? "t-headline mt-auto" : "t-display",
                )}
              >
                {ind.valor}
              </span>

              <span
                className={cn(
                  ind.financeiro ? "mb-1 text-xs" : "text-sm",
                  ind.atencao ? "text-error" : "text-outline",
                )}
              >
                {ind.apoio}
              </span>

              {ind.financeiro && exemplo ? (
                <span className="text-[0.625rem] text-outline-variant uppercase">
                  Valor demonstrativo
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
