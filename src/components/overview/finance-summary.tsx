import { ArrowDownRight, ArrowUpRight, CircleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  valor: number;
  icone: LucideIcon;
  cor: string;
  /** Cor do número. Convenção contábil: entrada verde, saída vermelha. */
  corValor?: string;
  apoio: string;
  apoioEmAlerta?: boolean;
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
      // Convenção contábil, a pedido da clínica: entrada verde, saída
      // vermelha. É um segundo papel do vermelho — direção do dinheiro —
      // separado do papel de estado (cancelado, vencido).
      cor: "text-positivo",
      corValor: "text-positivo",
      apoio: "recebimentos já quitados",
    },
    {
      rotulo: "Despesas do mês",
      valor: resumo.despesasDoMes,
      icone: ArrowDownRight,
      cor: "text-negativo",
      corValor: "text-negativo",
      apoio: "lançamentos do período",
    },
    {
      rotulo: "Valores pendentes",
      valor: resumo.aReceber,
      icone: CircleAlert,
      // Em aberto é cobrança a fazer — atenção. Só o que venceu é negativo.
      cor: "text-atencao-acento",
      apoio:
        resumo.vencido > 0
          ? `${formatarMoeda(resumo.vencido)} já vencido`
          : "nenhum valor vencido",
      apoioEmAlerta: resumo.vencido > 0,
    },
  ];

  return (
    <Card>
      <CardCabecalho
        titulo="Resumo financeiro"
        descricao={
          exemplo
            ? "Movimento do mês corrente, com dados fictícios."
            : "Movimento do mês corrente."
        }
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
                <p
                  className={cn(
                    "tabular t-headline mt-3",
                    linha.corValor ?? "text-on-surface",
                  )}
                >
                  {formatarMoeda(linha.valor)}
                </p>
                <p
                  className={cn(
                    "mt-1.5 text-xs",
                    linha.apoioEmAlerta ? "font-medium text-negativo" : "text-outline",
                  )}
                >
                  {linha.apoio}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <EvolucaoRecebimentos serie={serie} exemplo={exemplo} />
        </div>
      </CardCorpo>

      <CardRodape className="text-outline">
        {exemplo ? "Todos os números são demonstrativos. " : ""}A regra de lucro ainda
        não foi definida e por isso não aparece nesta tela.
      </CardRodape>
    </Card>
  );
}
