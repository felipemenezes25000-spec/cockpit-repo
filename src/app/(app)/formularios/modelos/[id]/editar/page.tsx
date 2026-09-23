import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SomenteAdministradora } from "@/components/configuracoes/somente-administradora";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FormularioModelo } from "@/components/documentos/formulario-modelo";
import { ehAdministradora } from "@/lib/auth";
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
        <SomenteAdministradora voltarPara="/formularios/modelos" />
      </div>
    );
  }

  const { id } = await params;
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
      <FormularioModelo modelo={modelo} />
    </div>
  );
}
