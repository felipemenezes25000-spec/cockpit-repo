import type { Metadata } from "next";
import { AcoesRapidas } from "@/components/overview/quick-actions";
import { Aniversariantes } from "@/components/overview/birthdays-panel";
import { CartoesIndicadores } from "@/components/overview/metric-cards";
import { LinhaDoDia } from "@/components/overview/day-rail";
import { PendenciasDaClinica } from "@/components/overview/pending-list";
import { ProximosRetornos } from "@/components/overview/returns-panel";
import { ResumoFinanceiro } from "@/components/overview/finance-summary";
import { usuarioAtual } from "@/lib/auth";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

export const metadata: Metadata = {
  title: "Visão Geral",
  description:
    "O dia da clínica em uma tela: atendimentos, pendências, retornos e resultados.",
};

export default async function PaginaVisaoGeral() {
  // Marca os números financeiros como demonstrativos enquanto houver dado
  // de exemplo carregado.
  const [exemplo, usuario] = await Promise.all([temDadosDeExemplo(), usuarioAtual()]);

  return (
    <div>
      <div className="mb-10">
        <AcoesRapidas papel={usuario?.papel ?? "recepcao"} />
      </div>

      <div className="mb-12">
        <CartoesIndicadores exemplo={exemplo} />
      </div>

      {/* A coluna larga leva o que se lê em linha — agenda, dinheiro,
          aniversários; a estreita, o que é fila de ação. As duas terminam
          perto da mesma altura, sem deixar metade da tela vazia. */}
      <div className="grid grid-cols-1 items-start gap-10 pb-10 xl:grid-cols-12">
        <div className="flex flex-col gap-10 xl:col-span-8">
          <LinhaDoDia />
          <ResumoFinanceiro exemplo={exemplo} />
          <Aniversariantes />
        </div>

        <div className="flex flex-col gap-10 xl:col-span-4">
          <PendenciasDaClinica />
          <ProximosRetornos />
        </div>
      </div>
    </div>
  );
}
