import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { ListaDespesas } from "@/components/financeiro/lista-despesas";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { chaveDoDia, hoje } from "@/lib/dates";
import { formatarMoeda } from "@/lib/format";
import { lerMes } from "@/lib/periodo";
import { listarDespesas } from "@/server/consultas/despesas";

export const metadata: Metadata = {
  title: "Despesas",
  description: "Contas a pagar e pagas da clínica.",
};

export default async function PaginaDespesas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await ehFinanceira())) {
    return <SomenteFinanceiro voltarPara="/financeiro" />;
  }

  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const despesas = await listarDespesas(periodo);

  const pendentes = despesas.filter((d) => d.situacao === "pendente");
  const totalPendente = pendentes.reduce((soma, d) => soma + d.valor, 0);

  return (
    <div className="flex flex-col gap-6">
      <FaixaDemonstracao />
      <AbasFinanceiro podeFinanceiro />

      <Card>
        <CardCabecalho
          titulo="Despesas"
          descricao={
            pendentes.length === 0
              ? "Nada pendente."
              : `${pendentes.length} ${pendentes.length === 1 ? "pendente" : "pendentes"} · ${formatarMoeda(totalPendente)} a pagar`
          }
          acao={
            <BotaoLink href="/financeiro/despesas/nova" variante="primaria" tamanho="sm">
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
              Nova despesa
            </BotaoLink>
          }
        />
        <CardCorpo className="flex flex-col gap-6">
          <NavegacaoMes periodo={periodo} />
          <ListaDespesas despesas={despesas} dataPadrao={chaveDoDia(hoje())} />
        </CardCorpo>
        <CardRodape className="text-outline">
          A taxa de cartão não entra aqui: ela já é descontada no líquido dos
          recebimentos. Lançá-la de novo contaria o custo duas vezes.
        </CardRodape>
      </Card>
    </div>
  );
}
