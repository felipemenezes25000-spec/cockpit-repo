import {
  ArrowRight,
  BellRing,
  CalendarX2,
  CircleDollarSign,
  Link2,
  Radar,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Card, CardCorpo } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";

function hrefCaptacao(mes: string | null, parametros: Record<string, string>): string {
  const query = new URLSearchParams();
  if (mes) query.set("mes", mes);
  for (const [chave, valor] of Object.entries(parametros)) {
    if (valor) query.set(chave, valor);
  }
  const texto = query.toString();
  return texto ? `/captacao?${texto}` : "/captacao";
}

/**
 * `destaque` é o azul da marca (há o que abrir). `atencao` e `negativo` são
 * estado: laranja para o que falta fazer hoje, vermelho para o que já venceu
 * (AGENTS.md §7.3). O rótulo do cartão diz o estado em texto; a cor reforça.
 */
type TomDoKpi = "neutro" | "destaque" | "atencao" | "negativo";

const TOM: Record<TomDoKpi, { cartao: string; valor: string; icone: string }> = {
  neutro: {
    cartao: "border-card-border bg-surface-container-low",
    valor: "text-on-surface",
    icone: "bg-primary-fixed text-primary",
  },
  destaque: {
    cartao: "border-primary-fixed bg-selecao",
    valor: "text-primary",
    icone: "bg-primary-container text-on-primary",
  },
  atencao: {
    cartao: "border-atencao-borda bg-surface",
    valor: "text-atencao",
    icone: "bg-atencao-fundo text-atencao",
  },
  negativo: {
    cartao: "border-negativo-borda bg-surface",
    valor: "text-negativo",
    icone: "bg-negativo-fundo text-negativo",
  },
};

function Kpi({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "neutro",
  href,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  icone: typeof Radar;
  tom?: TomDoKpi;
  href?: string;
}) {
  const estilo = TOM[tom];
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">{rotulo}</p>
          <p className={cn("mt-2 text-2xl font-semibold tracking-[-0.04em] tabular-nums", estilo.valor)}>
            {valor}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)]", estilo.icone)}
        >
          <Icone size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-outline">{detalhe}</p>
      {href ? (
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          Abrir recorte <ArrowRight aria-hidden="true" size={13} />
        </span>
      ) : null}
    </>
  );

  const classe = cn("rounded-[var(--radius-cartao)] border p-4", estilo.cartao);

  return href ? (
    <Link
      href={href}
      className={cn(classe, "premium-interactive block transition-[transform,background-color,border-color] hover:border-primary-fixed-dim hover:bg-selecao")}
    >
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export function PulsoComercial({
  faturamentoAtual,
  receitaAtribuida,
  receitaSemAtribuicao,
  percentualReceitaAtribuida,
  leadsAbertos,
  leadsParados,
  retornosHoje,
  retornosAtrasados,
  mes,
}: {
  faturamentoAtual: number;
  receitaAtribuida: number;
  receitaSemAtribuicao: number;
  percentualReceitaAtribuida: number;
  leadsAbertos: number;
  leadsParados: number;
  retornosHoje: number;
  retornosAtrasados: number;
  mes: string | null;
}) {
  const temFaturamento = faturamentoAtual > 0;
  const cobertura = temFaturamento
    ? `${percentualReceitaAtribuida.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`
    : "—";

  return (
    <Card>
      <CardCorpo className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="rotulo text-primary">Pulso comercial</p>
            <h2 className="titulo-secao mt-1">O que o faturamento consegue explicar — e o que pede ação</h2>
          </div>
          <p className="max-w-lg text-xs leading-5 text-outline sm:text-right">
            Atribuição usa venda real vinculada ao lead. “Sem atribuição” não significa orgânico: significa apenas que a venda não está ligada a um lead desta coorte.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Kpi
            rotulo="Receita atribuída"
            valor={formatarMoeda(receitaAtribuida)}
            detalhe={temFaturamento ? "Parte do faturamento do mês ligada a leads identificáveis." : "Ainda não há vendas no período para atribuir."}
            icone={Link2}
            tom={receitaAtribuida > 0 ? "destaque" : "neutro"}
            href={receitaAtribuida > 0 ? hrefCaptacao(mes, { etapa: "ganho" }) : undefined}
          />
          <Kpi
            rotulo="Cobertura de atribuição"
            valor={cobertura}
            detalhe={temFaturamento ? `${formatarMoeda(receitaAtribuida)} de ${formatarMoeda(faturamentoAtual)} têm origem comercial rastreável.` : "A cobertura aparece quando o Financeiro registrar a primeira venda do período."}
            icone={Radar}
          />
          <Kpi
            rotulo="Receita sem lead atribuído"
            valor={formatarMoeda(receitaSemAtribuicao)}
            detalhe="Venda real do Financeiro que não conseguiu ser associada a um lead desta coorte."
            icone={CircleDollarSign}
          />
          <Kpi
            rotulo="Leads pedindo atenção"
            valor={leadsParados.toLocaleString("pt-BR")}
            detalhe={
              leadsAbertos === 0
                ? "Não há leads abertos nesta coorte."
                : `${leadsParados} de ${leadsAbertos} leads abertos estão há 3+ dias de calendário sem movimento.`
            }
            icone={TriangleAlert}
            tom={leadsParados > 0 ? "destaque" : "neutro"}
            href={leadsParados > 0 ? hrefCaptacao(mes, { atencao: "parados" }) : undefined}
          />
          <Kpi
            rotulo="Retornos para hoje"
            valor={retornosHoje.toLocaleString("pt-BR")}
            detalhe={
              retornosHoje === 0
                ? "Nenhum retorno combinado para hoje."
                : "Leads abertos, de qualquer mês de entrada, com o próximo contato combinado para hoje."
            }
            icone={BellRing}
            tom={retornosHoje > 0 ? "atencao" : "neutro"}
            href={retornosHoje > 0 ? hrefCaptacao(mes, { atencao: "retorno_hoje" }) : undefined}
          />
          <Kpi
            rotulo="Retornos atrasados"
            valor={retornosAtrasados.toLocaleString("pt-BR")}
            detalhe={
              retornosAtrasados === 0
                ? "Nenhum retorno vencido na carteira aberta."
                : "Retornos combinados que já passaram sem um novo contato registrado."
            }
            icone={CalendarX2}
            tom={retornosAtrasados > 0 ? "negativo" : "neutro"}
            href={retornosAtrasados > 0 ? hrefCaptacao(mes, { atencao: "retorno_atrasado" }) : undefined}
          />
        </div>
      </CardCorpo>
    </Card>
  );
}
