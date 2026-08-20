import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { CabecalhoFicha } from "@/components/pacientes/cabecalho-ficha";
import { HistoricoAtendimentos } from "@/components/pacientes/historico-atendimentos";
import { PainelCadastro } from "@/components/pacientes/painel-cadastro";
import {
  PendenciasDaPaciente,
  ResumoDaPaciente,
  RetornosDaPaciente,
} from "@/components/pacientes/painel-acompanhamento";
import { historicoDoPaciente, pacientePorId } from "@/server/consultas/pacientes";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const paciente = await pacientePorId(id);

  return {
    title: paciente ? paciente.exibicao : "Paciente não encontrada",
    description: paciente
      ? `Ficha de ${paciente.exibicao}: cadastro, histórico de atendimentos e acompanhamento.`
      : undefined,
  };
}

export default async function PaginaFichaPaciente({ params }: Props) {
  const { id } = await params;
  const paciente = await pacientePorId(id);

  // A RLS não distingue "não existe" de "você não pode ver" — e a interface
  // também não deve: revelar que o registro existe já é informação.
  if (!paciente) notFound();

  const [historico, exemplo] = await Promise.all([
    historicoDoPaciente(paciente.id),
    temDadosDeExemplo(),
  ]);

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />

      <CabecalhoFicha paciente={paciente} />

      <div className="grid grid-cols-1 items-start gap-8 pb-10 xl:grid-cols-12">
        <div className="flex flex-col gap-8 xl:col-span-7">
          <HistoricoAtendimentos
            atendimentos={historico.atendimentos}
            exemplo={paciente.exemplo && exemplo}
            pacienteId={paciente.id}
          />
        </div>

        <div className="flex flex-col gap-8 xl:col-span-5">
          <ResumoDaPaciente
            atendimentos={historico.totalConcluidos}
            financeiro={historico.financeiro}
            exemplo={paciente.exemplo && exemplo}
          />
          <PainelCadastro paciente={paciente} />
          <PendenciasDaPaciente pendencias={historico.pendencias} />
          <RetornosDaPaciente retornos={historico.retornos} />
        </div>
      </div>
    </div>
  );
}
