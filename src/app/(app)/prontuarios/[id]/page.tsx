import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { AcessoRestritoProntuario } from "@/components/prontuarios/acesso-restrito";
import { DetalheProntuario } from "@/components/prontuarios/detalhe-prontuario";
import { EstruturaPendenteProntuario } from "@/components/prontuarios/estrutura-pendente";
import { ehAdministradora } from "@/lib/auth";
import { chaveDoDia } from "@/lib/dates";
import { fotosDoProntuario } from "@/server/consultas/prontuario-imagens";
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

  const fotos = await fotosDoProntuario(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaProntuarioPendenteError) return undefined;
    throw erro;
  });
  if (fotos === undefined) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <EstruturaPendenteProntuario />
      </div>
    );
  }

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />
      <DetalheProntuario
        prontuario={prontuario}
        fotos={fotos}
        hojeNaClinica={chaveDoDia()}
      />
    </div>
  );
}
