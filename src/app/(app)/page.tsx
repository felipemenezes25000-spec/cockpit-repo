import type { Metadata } from "next";
import { AcoesRapidas } from "@/components/overview/quick-actions";
import { Aniversariantes } from "@/components/overview/birthdays-panel";
import { CartoesIndicadores } from "@/components/overview/metric-cards";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { LinhaDoDia } from "@/components/overview/day-rail";
import { PendenciasDaClinica } from "@/components/overview/pending-list";
import { ProximosRetornos } from "@/components/overview/returns-panel";
import { ResumoFinanceiro } from "@/components/overview/finance-summary";

export const metadata: Metadata = {
  title: "Visão Geral",
  description:
    "O dia da clínica em uma tela: atendimentos, pendências, retornos e resultados.",
};

export default function PaginaVisaoGeral() {
  return (
    <div>
      <FaixaDemonstracao className="mb-8" />

      <div className="mb-10">
        <AcoesRapidas />
      </div>

      <div className="mb-12">
        <CartoesIndicadores />
      </div>

      <div className="grid grid-cols-1 items-start gap-10 pb-10 xl:grid-cols-12">
        <div className="flex flex-col gap-10 xl:col-span-8">
          <LinhaDoDia />
          <ResumoFinanceiro />
        </div>

        <div className="flex flex-col gap-10 xl:col-span-4">
          <PendenciasDaClinica />
          <ProximosRetornos />
          <Aniversariantes />
        </div>
      </div>
    </div>
  );
}
