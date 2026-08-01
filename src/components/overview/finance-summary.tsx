import { ArrowDownRight, ArrowUpRight, CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/format";
import {
  despesasDoMes,
  recebidoNoMes,
  valoresAReceber,
  valoresVencidos,
} from "@/data/selectors";
import { EvolucaoRecebimentos } from "./revenue-chart";

type Linha = {
  rotulo: string;
  valor: number;
  icone: LucideIcon;
  cor: string;
  apoio: string;
  apoioEmAlerta?: boolean;
};

export function ResumoFinanceiro() {
  const entradas = recebidoNoMes();
  const despesas = despesasDoMes();
  const pendentes = valoresAReceber();
  const vencidos = valoresVencidos();

  const linhas: Linha[] = [
    {
      rotulo: "Entradas do mês",
      valor: entradas,
      icone: ArrowUpRight,
      cor: "text-primary",
      apoio: "recebimentos já quitados",
    },
    {
      rotulo: "Despesas do mês",
      valor: despesas,
      icone: ArrowDownRight,
      cor: "text-error",
      apoio: "lançamentos do período",
    },
    {
      rotulo: "Valores pendentes",
      valor: pendentes,
      icone: CircleAlert,
      cor: "text-sit-aguardando",
      apoio:
        vencidos > 0 ? `${formatarMoeda(vencidos)} já vencido` : "nenhum valor vencido",
      apoioEmAlerta: vencidos > 0,
    },
  ];

  return (
    <Card>
      <CardCabecalho
        titulo="Resumo financeiro"
        descricao="Movimento do mês corrente, com dados fictícios."
        acao={
          <BotaoLink href="/financeiro" tamanho="sm">
            Abrir financeiro
          </BotaoLink>
        }
      />

      <CardCorpo>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {linhas.map((linha) => {
            const Icone = linha.icone;
            return (
              <div
                key={linha.rotulo}
                className="rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4"
              >
                <span className="flex items-center gap-2">
                  <Icone
                    aria-hidden="true"
                    size={16}
                    strokeWidth={1.75}
                    className={cn("shrink-0", linha.cor)}
                  />
                  <span className="rotulo">{linha.rotulo}</span>
                </span>
                <p className="tabular t-headline mt-3 text-on-surface">
                  {formatarMoeda(linha.valor)}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-xs",
                    linha.apoioEmAlerta ? "font-medium text-error" : "text-outline",
                  )}
                >
                  {linha.apoio}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <EvolucaoRecebimentos />
        </div>
      </CardCorpo>

      <CardRodape className="text-outline">
        Todos os números são demonstrativos. A regra de lucro ainda não foi definida e
        por isso não aparece nesta tela.
      </CardRodape>
    </Card>
  );
}
