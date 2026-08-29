import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { DetalheProntuario } from "@/components/prontuarios/detalhe-prontuario";
import { EstruturaPendenteProntuario } from "@/components/prontuarios/estrutura-pendente";
import { ehAdministradora } from "@/lib/auth";
import {
  EstruturaProntuarioPendenteError,
  prontuarioPorId,
} from "@/server/consultas/prontuarios";

export const metadata: Metadata = {
  title: "Prontuário",
  description: "Ficha clínica versionada da paciente.",
};

export default async function PaginaProntuario({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const administradora = await ehAdministradora();

  if (!administradora) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <AcessoRestritoProntuario />
      </div>
    );
  }

  const { id } = await params;
  const prontuario = await prontuarioPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaProntuarioPendenteError) return undefined;
    throw erro;
  });
  if (prontuario === undefined) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <EstruturaPendenteProntuario />
      </div>
    );
  }
  if (!prontuario) notFound();

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />
      <DetalheProntuario prontuario={prontuario} />
    </div>
  );
}
