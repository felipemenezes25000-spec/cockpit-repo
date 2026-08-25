import type { Metadata } from "next";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FluxoMensal } from "@/components/financeiro/fluxo-mensal";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { ehFinanceira } from "@/lib/auth";
import { fluxoMensal } from "@/server/consultas/painel-financeiro";

export const metadata: Metadata = {
  title: "Fluxo de caixa",
  description: "Entradas líquidas, saídas pagas e resultado dos últimos 12 meses.",
};

export default async function PaginaFluxo() {
  const [meses, podeFinanceiro] = await Promise.all([fluxoMensal(), ehFinanceira()]);

  return (
    <div className="flex flex-col gap-6">
      <FaixaDemonstracao />
      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <Card>
        <CardCabecalho
          titulo="Fluxo de caixa mensal"
          descricao="Últimos 12 meses: o que entrou líquido, o que saiu pago e o acumulado."
        />
        <CardCorpo>
          <FluxoMensal meses={meses} />
        </CardCorpo>
        <CardRodape className="text-outline">
          Entradas são o valor efetivamente recebido, já líquido das taxas de
          cartão, mais os ajustes. Saídas são as despesas pagas no mês. Lucro não
          aparece: a regra de cálculo ainda não foi definida pela clínica.
        </CardRodape>
      </Card>
    </div>
  );
}
