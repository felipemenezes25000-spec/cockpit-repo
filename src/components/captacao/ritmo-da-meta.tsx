import { ArrowRight, CalendarPlus2, CircleDollarSign, Crosshair, UsersRound } from "lucide-react";
import { Card, CardCorpo } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/format";
import type { PlanoDaMeta } from "@/lib/captacao";

function Numero({
  rotulo,
  valor,
  icone: Icone,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  icone: typeof Crosshair;
  destaque?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-cartao)] px-3 py-3 sm:px-4">
      <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] ${destaque ? "bg-primary-container text-on-primary" : "bg-primary-fixed text-primary"}`}>
        <Icone size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold tracking-[0.06em] text-outline uppercase">{rotulo}</p>
        <p className={`mt-0.5 truncate text-xl font-semibold tracking-[-0.03em] tabular-nums ${destaque ? "text-primary" : "text-on-surface"}`}>{valor}</p>
      </div>
    </div>
  );
}

export function RitmoDaMeta({ plano, ticketReal, ticketPlanejado }: { plano: PlanoDaMeta; ticketReal: number; ticketPlanejado: number }) {
  return (
    <Card>
      <CardCorpo className="p-3 sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="shrink-0 px-2 py-2 xl:w-52">
            <p className="rotulo text-primary">Plano de ataque</p>
            <h2 className="titulo-secao mt-1">O que falta daqui para frente</h2>
            <p className="mt-1 text-xs leading-5 text-outline">O funil inverso transforma o gap financeiro em esforço comercial.</p>
          </div>

          <ArrowRight aria-hidden="true" size={18} className="hidden shrink-0 text-outline xl:block" />

          <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
            <Numero rotulo="Gap financeiro" valor={formatarMoeda(plano.gapFinanceiro)} icone={CircleDollarSign} />
            <Numero rotulo="Vendas" valor={`+${plano.vendasNecessarias.toLocaleString("pt-BR")}`} icone={Crosshair} />
            <Numero rotulo="Agendamentos" valor={`+${plano.agendamentosNecessarios.toLocaleString("pt-BR")}`} icone={CalendarPlus2} />
            <Numero rotulo="Qualificados" valor={`+${plano.qualificadosNecessarios.toLocaleString("pt-BR")}`} icone={UsersRound} />
            <Numero rotulo="Leads" valor={`+${plano.leadsNecessarios.toLocaleString("pt-BR")}`} icone={UsersRound} destaque />
          </div>

          <div className="shrink-0 border-t border-card-border px-2 py-3 xl:w-44 xl:border-t-0 xl:border-l xl:pl-5">
            <p className="text-xs text-outline">Ticket real / planejado</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-on-surface">{formatarMoeda(ticketReal)}</p>
            <p className="text-xs tabular-nums text-outline">de {formatarMoeda(ticketPlanejado)}</p>
          </div>
        </div>
      </CardCorpo>
    </Card>
  );
}
