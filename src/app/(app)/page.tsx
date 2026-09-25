import { CalendarDays } from "lucide-react";
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
  const dataExtenso = capitalizar(formatarDataExtenso(hoje()));

  return (
    <div className="flex flex-col gap-5 pb-10 sm:gap-6">
      <header className="visao-geral-cabecalho">
        <div className="min-w-0">
          <p className="rotulo text-primary">Visão Geral</p>
          <h1 className="visao-geral-saudacao mt-2">
            {saudacao()}, {primeiroNome}!
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant sm:text-[0.95rem]">
            Aqui está o panorama da clínica para você começar pelas prioridades certas.
          </p>
        </div>

        <div className="visao-geral-data" aria-label={`Data de hoje: ${dataExtenso}`}>
          <CalendarDays aria-hidden="true" size={15} strokeWidth={1.9} className="text-primary" />
          <span>{dataExtenso}</span>
        </div>
      </header>

      <CabineDoDia exemplo={exemplo} />

      <AtalhosDoDia papel={usuario?.papel ?? "recepcao"} />

      <div className="visao-geral-grade-dupla grid grid-cols-1 gap-5">
        <PendenciasDaClinica />
        <ProximosRetornos />
      </div>

      <div className="visao-geral-grade-baixa grid grid-cols-1 gap-5">
        <ResumoFinanceiro exemplo={exemplo} />
        <Aniversariantes />
      </div>
    </div>
  );
}
