import type { Metadata } from "next";
import { Aniversariantes } from "@/components/overview/birthdays-panel";
import { AtalhosDoDia } from "@/components/overview/atalhos-do-dia";
import { CabineDoDia } from "@/components/overview/cabine-do-dia";
import { PendenciasDaClinica } from "@/components/overview/pending-list";
import { ProximosRetornos } from "@/components/overview/returns-panel";
import { ResumoFinanceiro } from "@/components/overview/finance-summary";
import { usuarioAtual } from "@/lib/auth";
import { FUSO_CLINICA, hoje } from "@/lib/dates";
import { capitalizar, formatarDataExtenso } from "@/lib/format";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

export const metadata: Metadata = {
  title: "Visão Geral",
  description: "O dia da clínica em uma tela: atendimentos, pendências, retornos e resultados.",
};

function saudacao(): string {
  const hora = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_CLINICA,
    hour: "2-digit",
    hour12: false,
  }).format(new Date())) % 24;

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

/**
 * Onde estou (o título), o que está acontecendo (a cabine, com o agora e a
 * fila do dia), o que fazer (atalhos) e o que pede atenção (os painéis).
 */
export default async function PaginaVisaoGeral() {
  const [exemplo, usuario] = await Promise.all([temDadosDeExemplo(), usuarioAtual()]);
  const primeiroNome = usuario?.nome.trim().split(/\s+/)[0] ?? "equipe";

  return (
    <div className="flex flex-col gap-5 pb-8">
      <header>
        <h1 className="titulo-tela">Visão Geral</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {saudacao()}, {primeiroNome}. {capitalizar(formatarDataExtenso(hoje()))}.
        </p>
      </header>

      <CabineDoDia exemplo={exemplo} />

      <AtalhosDoDia papel={usuario?.papel ?? "recepcao"} />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-8">
          <PendenciasDaClinica />
          <ResumoFinanceiro exemplo={exemplo} />
          <Aniversariantes />
        </div>
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-4">
          <ProximosRetornos />
        </div>
      </div>
    </div>
  );
}
