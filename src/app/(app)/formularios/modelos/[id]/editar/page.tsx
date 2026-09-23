import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  EXPLICACAO_MODELOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FormularioModelo } from "@/components/documentos/formulario-modelo";
import { ehAdministradora } from "@/lib/auth";
import { uuidValido } from "@/lib/formulario";
import {
  EstruturaDocumentoPendenteError,
  modeloPorId,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Editar modelo",
  description: "Grava uma nova versão do texto-base.",
};

export default async function PaginaEditarModelo({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const administradora = await ehAdministradora();

  if (!administradora) {
    return (
      <div>
        <SomenteAdministradora
          voltarPara="/formularios/modelos"
          explicacao={EXPLICACAO_MODELOS}
        />
      </div>
    );
  }

  const { id } = await params;
  // Id sem forma de uuid é 404, sem ir ao banco (o Postgres recusaria com 22P02).
  if (!uuidValido(id)) notFound();

  const modelo = await modeloPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return undefined;
    throw erro;
  });

  if (modelo === undefined) {
    return (
      <div>
        <EstruturaPendenteDocumento />
      </div>
    );
  }

  if (!modelo) notFound();

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/formularios/modelos"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para modelos
      </Link>
      <FormularioModelo modelo={modelo} />
    </div>
  );
}
