import { ArrowDownRight, ArrowUpRight, CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { NumeroAnimado } from "@/components/ui/animated-number";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/format";
import {
  resumoFinanceiro,
  serieMensalRecebimentos,
} from "@/server/consultas/financeiro";
import { EvolucaoRecebimentos } from "./revenue-chart";

type Linha = {
  rotulo: string;
  valor: number | null;
  icone: LucideIcon;
  cor: string;
  corValor?: string;
  apoio: string;
  apoioEmAlerta?: boolean;
  superficie: string;
};

export async function ResumoFinanceiro({ exemplo }: { exemplo: boolean }) {
  const [resumo, serie] = await Promise.all([
    resumoFinanceiro(),
    serieMensalRecebimentos(),
  ]);

  const linhas: Linha[] = [
    {
      rotulo: "Entradas do mês",
      valor: resumo.recebidoNoMes,
      icone: ArrowUpRight,
      cor: "text-positivo",
      corValor: "text-positivo",
      apoio: "recebimentos já quitados",
      superficie: "from-positivo-fundo/70 to-white/80",
    },
    {
      rotulo: "Despesas do mês",
      valor: resumo.despesasDoMes,
      icone: ArrowDownRight,
      cor: resumo.despesasDoMes === null ? "text-outline-variant" : "text-negativo",
      corValor: resumo.despesasDoMes === null ? "text-outline" : "text-negativo",
      apoio: resumo.despesasDoMes === null ? "restrito ao financeiro" : "lançamentos do período",
      superficie: resumo.despesasDoMes === null ? "from-surface-container-low/75 to-white/80" : "from-negativo-fundo/60 to-white/80",
    },
    {
      rotulo: "Valores pendentes",
      valor: resumo.aReceber,
      icone: CircleAlert,
      cor: "text-atencao-acento",
      apoio: resumo.vencido > 0 ? `${formatarMoeda(resumo.vencido)} já vencido` : "nenhum valor vencido",
      apoioEmAlerta: resumo.vencido > 0,
      superficie: "from-atencao-fundo/55 to-white/80",
    },
  ];

  return (
    <Card className="relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 size-60 rounded-full bg-primary-fixed/28 blur-3xl" />
      <CardCabecalho
        titulo="Resumo financeiro"
        descricao={exemplo ? "Movimento do mês corrente, com dados fictícios." : "Movimento do mês corrente."}
        acao={<BotaoLink href="/financeiro" tamanho="sm">Abrir financeiro</BotaoLink>}
      />

      <CardCorpo className="relative">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {linhas.map((linha, indice) => {
            const Icone = linha.icone;
            return (
              <div
                key={linha.rotulo}
                style={{ animationDelay: `${indice * 70 + 80}ms` }}
                className={cn(
                  "dashboard-stagger premium-interactive group relative overflow-hidden rounded-[16px] border border-card-border/75 bg-gradient-to-br p-4 shadow-[var(--shadow-cartao)]",
                  linha.superficie,
                )}
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                <div className="flex items-start justify-between gap-3">
                  <span className="rotulo pt-1">{linha.rotulo}</span>
                  <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-white/70 bg-white/72 shadow-[var(--shadow-cartao)] transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.04]", linha.cor)}>
                    <Icone aria-hidden="true" size={17} strokeWidth={1.75} />
                  </span>
                </div>
                <p
                  className={cn("tabular mt-5 text-[1.45rem] leading-none font-semibold tracking-[-0.035em]", linha.corValor ?? "text-on-surface")}
                  title={linha.valor === null ? "restrito ao financeiro" : undefined}
                >
                  {linha.valor === null ? "—" : <NumeroAnimado valor={linha.valor} tipo="moeda" duracao={680 + indice * 75} />}
                </p>
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

      <CardRodape className="relative text-outline">
        {exemplo ? "Todos os números são demonstrativos. " : ""}A regra de lucro ainda não foi definida e por isso não aparece nesta tela.
      </CardRodape>
    </Card>
  );
}
