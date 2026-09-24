import {
  ArrowRight,
  CircleDollarSign,
  Link2,
  Radar,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { Card, CardCorpo } from "@/components/ui/card";
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

function Kpi({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  destaque = false,
  href,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  icone: typeof Radar;
  destaque?: boolean;
  href?: string;
}) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">{rotulo}</p>
          <p className={`mt-2 text-2xl font-semibold tracking-[-0.04em] tabular-nums ${destaque ? "text-primary" : "text-on-surface"}`}>
            {valor}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] ${
            destaque ? "bg-primary-container text-on-primary" : "bg-primary-fixed text-primary"
          }`}
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

  const classe = `rounded-[var(--radius-cartao)] border p-4 ${
    destaque ? "border-primary-fixed bg-selecao" : "border-card-border bg-surface-container-low"
  }`;

  return href ? (
    <Link
      href={href}
      className={`${classe} premium-interactive block transition-[transform,background-color,border-color] hover:border-primary-fixed-dim hover:bg-selecao`}
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
  mes,
}: {
  faturamentoAtual: number;
  receitaAtribuida: number;
  receitaSemAtribuicao: number;
  percentualReceitaAtribuida: number;
  leadsAbertos: number;
  leadsParados: number;
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

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi
            rotulo="Receita atribuída"
            valor={formatarMoeda(receitaAtribuida)}
            detalhe={temFaturamento ? "Parte do faturamento do mês ligada a leads identificáveis." : "Ainda não há vendas no período para atribuir."}
            icone={Link2}
            destaque={receitaAtribuida > 0}
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
            destaque={leadsParados > 0}
            href={leadsParados > 0 ? hrefCaptacao(mes, { atencao: "parados" }) : undefined}
          />
        </div>
      </CardCorpo>
    </Card>
  );
}
