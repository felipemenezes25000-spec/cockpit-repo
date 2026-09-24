import { ArrowDownRight, ArrowUpRight, CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { formatarMesAno, formatarMoeda } from "@/lib/format";
import { resumoFinanceiro, serieMensalRecebimentos } from "@/server/consultas/financeiro";
import { EvolucaoRecebimentos } from "./revenue-chart";

type Linha = {
  rotulo: string;
  valor: number | null;
  icone: LucideIcon;
  cor: string;
  corValor?: string;
  apoio: string;
  apoioEmAlerta?: boolean;
  progresso?: number;
};

/** "setembro de 2026" → "setembro". */
function mesCorrente(): string {
  return formatarMesAno(new Date()).split(" ")[0];
}

export async function ResumoFinanceiro({ exemplo }: { exemplo: boolean }) {
  const [resumo, serie] = await Promise.all([resumoFinanceiro(), serieMensalRecebimentos()]);
  const proporcaoVencida = resumo.aReceber > 0 ? Math.max(0, Math.min(1, resumo.vencido / resumo.aReceber)) : 0;

  const linhas: Linha[] = [
    {
      rotulo: "Entradas do mês",
      valor: resumo.recebidoNoMes,
      icone: ArrowUpRight,
      cor: "text-positivo",
      corValor: "text-positivo",
      apoio: "recebimentos já quitados",
    },
    {
      rotulo: "Despesas do mês",
      valor: resumo.despesasDoMes,
      icone: ArrowDownRight,
      cor: resumo.despesasDoMes === null ? "text-outline" : "text-negativo",
      corValor: resumo.despesasDoMes === null ? "text-outline" : "text-negativo",
      apoio: resumo.despesasDoMes === null ? "restrito ao financeiro" : "lançamentos do período",
    },
    {
      rotulo: "Valores pendentes",
      valor: resumo.aReceber,
      icone: CircleAlert,
      cor: "text-atencao",
      apoio: resumo.vencido > 0 ? `${formatarMoeda(resumo.vencido)} já vencido` : "nenhum valor vencido",
      apoioEmAlerta: resumo.vencido > 0,
      progresso: proporcaoVencida,
    },
  ];

  return (
    <Card>
      <CardCabecalho
        titulo={`Caixa de ${mesCorrente()}`}
        descricao={exemplo ? "Movimento do mês corrente, com dados fictícios." : "Movimento do mês corrente."}
        acao={<BotaoLink href="/financeiro" tamanho="sm">Abrir financeiro</BotaoLink>}
      />

      <CardCorpo>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {linhas.map((linha, indice) => {
            const Icone = linha.icone;
            const percentual = typeof linha.progresso === "number" ? Math.round(linha.progresso * 100) : null;
            return (
              <div
                key={linha.rotulo}
                style={{ animationDelay: `${indice * 70 + 80}ms` }}
                className="dashboard-stagger min-w-0 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rotulo">{linha.rotulo}</span>
                  <Icone aria-hidden="true" size={17} strokeWidth={2} className={cn("shrink-0", linha.cor)} />
                </div>
                <p
                  className={cn("numero-sm mt-3 break-words", linha.corValor ?? "text-on-surface")}
                  title={linha.valor === null ? "restrito ao financeiro" : undefined}
                >
                  {linha.valor === null ? "—" : formatarMoeda(linha.valor)}
                </p>

                {percentual !== null ? (
                  <div className="mt-3">
                    <span className="barra barra-fina" role="img" aria-label={`${percentual}% dos valores pendentes já venceram`}>
                      <span className={percentual > 0 ? "bg-negativo!" : undefined} style={{ width: `${percentual}%` }} />
                    </span>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-xs font-medium text-outline">
                      <span>parcela vencida</span>
                      <span className={cn("tabular", percentual > 0 ? "text-negativo" : "text-positivo")}>{percentual}%</span>
                    </div>
                  </div>
                ) : null}

                <p className={cn("mt-2 text-xs leading-5", linha.apoioEmAlerta ? "font-semibold text-negativo" : "text-outline")}>
                  {linha.apoio}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-7">
          <EvolucaoRecebimentos serie={serie} exemplo={exemplo} />
        </div>
      </CardCorpo>

      <CardRodape className="text-outline">
        {exemplo ? "Todos os números são demonstrativos. " : ""}A regra de lucro ainda não foi definida e por isso não aparece nesta tela.
      </CardRodape>
    </Card>
  );
}
