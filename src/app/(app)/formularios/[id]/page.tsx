import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetalheDocumento } from "@/components/documentos/detalhe-documento";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import {
  documentoPorId,
  EstruturaDocumentoPendenteError,
  linksDoDocumento,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Documento",
  description: "Documento emitido, com o texto congelado e a trilha da assinatura.",
};

export default async function PaginaDocumento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const documento = await documentoPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return undefined;
    throw erro;
  });

  if (documento === undefined) {
    return (
      <div>
        <FaixaDemonstracao className="mb-8" />
        <EstruturaPendenteDocumento />
      </div>
    );
  }

  // A RLS já esconde anamnese de quem não é administradora: para esse perfil a
  // consulta volta vazia, e vazio aqui é indistinguível de inexistente — que é
  // exatamente o que se quer.
  if (!documento) notFound();

  const links = await linksDoDocumento(id);

  return (
    <div>
      <FaixaDemonstracao className="mb-8" />
      <DetalheDocumento documento={documento} links={links} />
    </div>
  );
}
