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
  financeiro?: boolean;
  enfase?: "atencao" | "negativo";
};

export async function CartoesIndicadores({ exemplo }: { exemplo: boolean }) {
  const n = await indicadores();
  const lista: Indicador[] = [
    { rotulo: "Atendimentos de hoje", valor: String(n.atendimentosHoje), apoio: `${n.concluidos} já ${n.concluidos === 1 ? "concluído" : "concluídos"}`, icone: CalendarDays, href: "/agenda" },
    { rotulo: "Confirmados", valor: String(n.confirmados), apoio: `de ${n.atendimentosHoje} na agenda de hoje`, icone: BadgeCheck, href: "/agenda" },
    { rotulo: "Confirmações pendentes", valor: String(n.confirmacoesPendentes), apoio: n.confirmacoesPendentes > 0 ? "precisam de contato hoje" : "nenhuma em aberto", icone: Clock3, href: "/agenda", enfase: n.confirmacoesPendentes > 0 ? "atencao" : undefined },
    { rotulo: "Aguardando retorno", valor: String(n.aguardandoRetorno), apoio: "pacientes na janela de contato", icone: Repeat2, href: "/relacionamento" },
    { rotulo: "Recebido no mês", valor: formatarMoeda(n.recebidoNoMes), apoio: "lançamentos já quitados", icone: Wallet, href: "/financeiro", financeiro: true },
    { rotulo: "A receber", valor: formatarMoeda(n.aReceber), apoio: n.vencido > 0 ? `${formatarMoeda(n.vencido)} já vencido` : "nada vencido", icone: CalendarClock, href: "/financeiro", financeiro: true, enfase: n.vencido > 0 ? "negativo" : undefined },
  ];

  return (
    <section aria-labelledby="indicadores">
      <h2 id="indicadores" className="sr-only">Indicadores principais</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
        {lista.map((ind, indice) => {
          const Icone = ind.icone;
          const destaque = indice === 0 || ind.financeiro;
          return (
            <Link key={ind.rotulo} href={ind.href} className={cn("premium-interactive group relative flex min-w-0 flex-col overflow-hidden rounded-[18px] border border-card-border/80 bg-white/75 p-4 shadow-[var(--shadow-cartao)] sm:p-5", ind.financeiro && "col-span-2 md:col-span-1", destaque && "bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(242,248,255,0.9))]")}>
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-14 size-36 rounded-full bg-primary-fixed/40 blur-3xl transition-opacity duration-300 group-hover:opacity-90" />
              <div className="relative mb-5 flex items-start justify-between gap-3">
                <h3 className="rotulo max-w-[12rem] leading-[1.25]">{ind.rotulo}</h3>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-primary/10 bg-white/70 text-primary shadow-[var(--shadow-cartao)] transition-transform duration-200 group-hover:scale-[1.04]"><Icone aria-hidden="true" size={18} strokeWidth={1.65} /></span>
              </div>
              <span className={cn("tabular relative mb-2 text-on-surface", ind.financeiro ? "mt-auto text-[1.45rem] leading-tight font-semibold tracking-[-0.035em]" : "text-[2.3rem] leading-none font-semibold tracking-[-0.045em]")}>{ind.valor}</span>
              <span className={cn("relative leading-5", ind.financeiro ? "text-xs" : "text-sm", ind.enfase === "negativo" ? "font-semibold text-negativo" : ind.enfase === "atencao" ? "font-semibold text-atencao" : "text-outline")}>{ind.apoio}</span>
              {ind.financeiro && exemplo ? <span className="relative mt-1.5 text-[0.61rem] font-semibold tracking-[0.08em] text-outline uppercase">Valor demonstrativo</span> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
