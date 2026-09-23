import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetalheDocumento } from "@/components/documentos/detalhe-documento";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { uuidValido } from "@/lib/formulario";
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
  // Id sem forma de uuid é 404, sem ir ao banco: o Postgres o recusaria com
  // 22P02 e a tela viraria erro em vez de "não encontrado".
  if (!uuidValido(id)) notFound();

  const documento = await documentoPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return undefined;
    throw erro;
  });

  if (documento === undefined) {
    return (
      <div>
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
      <DetalheDocumento documento={documento} links={links} />
    </div>
  );
}
