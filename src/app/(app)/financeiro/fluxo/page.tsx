import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import type { Metadata } from "next";
import { AbasFinanceiro } from "@/components/financeiro/abas";
import { FluxoMensal } from "@/components/financeiro/fluxo-mensal";
import { SomenteFinanceiro } from "@/components/financeiro/somente-financeiro";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehFinanceira } from "@/lib/auth";
import { formatarMoeda } from "@/lib/format";
import { fluxoMensal } from "@/server/consultas/painel-financeiro";

export const metadata: Metadata = {
  title: "Fluxo de caixa",
  description: "Entradas líquidas, saídas pagas e resultado dos últimos 12 meses.",
};

function MetricaFluxo({ rotulo, valor, apoio, icone: Icone }: { rotulo: string; valor: string; apoio: string; icone: typeof Scale }) {
  return (
    <div className="financeiro-metrica-cabine">
      <div className="flex items-center justify-between gap-3">
        <span className="rotulo text-cabine-texto-secundario">{rotulo}</span>
        <span className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-cabine-linha bg-white/10 text-cabine-texto">
          <Icone aria-hidden="true" size={17} strokeWidth={1.75} />
        </span>
      </div>
      <p className="numero mt-4 text-cabine-texto">{valor}</p>
      <p className="mt-1 text-xs leading-5 text-cabine-texto-secundario">{apoio}</p>
    </div>
  );
}

export default async function PaginaFluxo() {
  const podeFinanceiro = await ehFinanceira();
  if (!podeFinanceiro) return <SomenteFinanceiro voltarPara="/financeiro" />;

  const meses = await fluxoMensal();
  const totalEntradas = meses.reduce((soma, mes) => soma + mes.recebido, 0);
  const totalSaidas = meses.reduce((soma, mes) => soma + mes.despesas, 0);
  const ultimo = meses.at(-1) ?? null;

  return (
    <div className="page-reveal flex flex-col gap-6">
      <CabecalhoDePagina
        icone={Scale}
        rotulo="Financeiro"
        titulo="Fluxo de caixa"
        descricao="Doze meses de entradas líquidas, saídas pagas e resultado acumulado, sem misturar taxa de cartão com despesa nem chamar resultado de lucro."
        meta={
          <>
            <SeloHero tom="informativo">{meses.length} {meses.length === 1 ? "mês carregado" : "meses carregados"}</SeloHero>
            <SeloHero>Entradas já líquidas das taxas</SeloHero>
            <SeloHero tom="atencao">Lucro ainda não definido pela clínica</SeloHero>
          </>
        }
      />

      <AbasFinanceiro podeFinanceiro={podeFinanceiro} />

      <section aria-label="Resumo do fluxo de caixa" className="cabine financeiro-cabine grid gap-1 p-3 sm:grid-cols-3 sm:p-4">
        <MetricaFluxo icone={ArrowUpRight} rotulo="Entradas no histórico" valor={formatarMoeda(totalEntradas)} apoio="soma dos recebimentos líquidos e ajustes dos meses exibidos" />
        <MetricaFluxo icone={ArrowDownRight} rotulo="Saídas pagas" valor={formatarMoeda(totalSaidas)} apoio="despesas efetivamente pagas no mesmo recorte" />
        <MetricaFluxo icone={Scale} rotulo="Acumulado" valor={formatarMoeda(ultimo?.acumulado ?? 0)} apoio={ultimo ? "posição acumulada ao fim do mês mais recente carregado" : "ainda não há meses disponíveis"} />
      </section>

      <Card>
        <CardCabecalho titulo="Fluxo mensal" descricao="O que entrou líquido, o que saiu pago e como o caixa se acumulou ao longo do período." />
        <CardCorpo><FluxoMensal meses={meses} /></CardCorpo>
        <CardRodape className="text-outline">
          Entradas são o valor efetivamente recebido, já líquido das taxas de cartão, mais os ajustes. Saídas são as despesas pagas no mês. Lucro não aparece: a regra de cálculo ainda não foi definida pela clínica.
        </CardRodape>
      </Card>
    </div>
  );
}
