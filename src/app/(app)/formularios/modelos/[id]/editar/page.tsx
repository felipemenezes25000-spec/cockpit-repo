import { FilePenLine, History } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  EXPLICACAO_MODELOS,
  SomenteAdministradora,
} from "@/components/configuracoes/somente-administradora";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FormularioModelo } from "@/components/documentos/formulario-modelo";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
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
    return <SomenteAdministradora voltarPara="/formularios/modelos" explicacao={EXPLICACAO_MODELOS} />;
  }

  const { id } = await params;
  if (!uuidValido(id)) notFound();

  const modelo = await modeloPorId(id).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return undefined;
    throw erro;
  });

  if (modelo === undefined) return <EstruturaPendenteDocumento />;
  if (!modelo) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href="/formularios/modelos">Voltar para modelos</LinkDeVoltar>

      <CabecalhoDePagina
        icone={FilePenLine}
        rotulo="Modelo de documento"
        titulo={modelo.nome}
        descricao="Edite criando uma nova versão do texto-base. A versão anterior continua preservada e documentos já emitidos não são reescritos."
        meta={
          <>
            <SeloHero tom="informativo">
              <History aria-hidden="true" size={13} strokeWidth={1.75} />
              Nova versão
            </SeloHero>
            <SeloHero>{modelo.tipo}</SeloHero>
            <SeloHero tom="positivo">Emissões anteriores preservadas</SeloHero>
          </>
        }
      />

      <FormularioModelo modelo={modelo} />
    </div>
  );
}
