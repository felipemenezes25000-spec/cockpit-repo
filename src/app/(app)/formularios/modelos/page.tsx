import { FilePlus2, FileSignature, Layers3 } from "lucide-react";
import type { Metadata } from "next";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { ListaModelos } from "@/components/documentos/lista-modelos";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { ehAdministradora } from "@/lib/auth";
import {
  EstruturaDocumentoPendenteError,
  listarModelos,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Modelos de documento",
  description: "Textos-base de contrato, termo e orientação.",
};

export default async function PaginaModelos() {
  const administradora = await ehAdministradora();

  const modelos = await listarModelos({ incluirInativos: administradora }).catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return null;
    throw erro;
  });

  if (!modelos) return <EstruturaPendenteDocumento />;

  return (
    <div className="flex flex-col gap-6">
      <CabecalhoDePagina
        icone={Layers3}
        rotulo="Documentos"
        titulo="Modelos de documento"
        descricao="Textos-base versionados que dão origem a contratos, termos, orientações e anamneses. Cada emissão congela sua própria cópia."
        acoes={
          <>
            <BotaoLink href="/formularios" variante="contorno" tamanho="sm">
              <FileSignature aria-hidden="true" size={16} strokeWidth={1.75} />
              Documentos
            </BotaoLink>
            {administradora ? (
              <BotaoLink href="/formularios/modelos/novo" variante="primaria" tamanho="sm">
                <FilePlus2 aria-hidden="true" size={16} strokeWidth={1.75} />
                Novo modelo
              </BotaoLink>
            ) : null}
          </>
        }
        meta={
          <>
            <SeloHero tom="informativo">{modelos.length} {modelos.length === 1 ? "modelo visível" : "modelos visíveis"}</SeloHero>
            <SeloHero>Emissões ficam congeladas</SeloHero>
            {administradora ? <SeloHero tom="positivo">Versionamento liberado</SeloHero> : <SeloHero>Consulta de modelos</SeloHero>}
          </>
        }
      />

      <Card>
        <CardCabecalho titulo="Biblioteca de modelos" descricao="Versões novas mudam somente emissões futuras; documentos anteriores continuam intactos." />
        <CardCorpo><ListaModelos modelos={modelos} administradora={administradora} /></CardCorpo>
        {!administradora ? (
          <CardRodape className="text-outline">
            A recepção consulta os modelos para saber o que emitir. Quem escreve, versiona e aposenta é a administradora.
          </CardRodape>
        ) : null}
      </Card>
    </div>
  );
}
