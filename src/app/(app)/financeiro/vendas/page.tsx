import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { ListaVendas } from "@/components/financeiro/lista-vendas";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";
import { lerMes } from "@/lib/periodo";
import { listarVendas } from "@/server/consultas/vendas";

export const metadata: Metadata = {
  title: "Vendas",
  description: "Vendas e recebimentos da clínica.",
};

export default async function PaginaVendas({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);

  const [vendas, podeFinanceiro] = await Promise.all([
    listarVendas(periodo),
    ehFinanceira(),
  ]);

  const total = vendas.reduce((soma, v) => soma + v.valorFinal, 0);

  return (
    <div className="flex flex-col gap-6">
      <FaixaDemonstracao />
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <Card>
        <CardCabecalho
          titulo="Vendas"
          descricao={
            vendas.length === 0
              ? "Nenhuma venda no mês."
              : `${vendas.length} ${vendas.length === 1 ? "venda" : "vendas"} · ${formatarMoeda(total)}`
          }
          acao={
            <BotaoLink href="/financeiro/vendas/nova" variante="primaria" tamanho="sm">
              <Plus aria-hidden="true" size={16} strokeWidth={1.75} />
              Nova venda
            </BotaoLink>
          }
        />
        <CardCorpo className="flex flex-col gap-6">
          <NavegacaoMes periodo={periodo} />
          <ListaVendas vendas={vendas} />
        </CardCorpo>
      </Card>
    </div>
  );
}
