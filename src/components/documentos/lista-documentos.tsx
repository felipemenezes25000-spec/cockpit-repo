import { FileSignature } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarData, formatarHora } from "@/lib/format";
import type { DocumentoDaLista } from "@/server/consultas/documentos";
import { MarcaSituacao, MarcaTipo } from "./marca-situacao";

function Linha({ documento }: { documento: DocumentoDaLista }) {
  return (
    <li className="border-b border-card-border last:border-b-0">
      <Link
        href={`/formularios/${documento.id}`}
        className="-mx-3 flex flex-col gap-2 px-3 py-4 transition-colors hover:bg-surface-container-low"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-on-surface">{documento.titulo}</span>
          <MarcaTipo tipo={documento.tipo} />
          <MarcaSituacao situacao={documento.situacao} tipo={documento.tipo} />
          {documento.exemplo ? (
            <span className="text-xs text-outline">exemplo</span>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-outline">
          <span>{documento.paciente}</span>
          <span className="tabular">
            Emitido em {formatarData(documento.emitidoEm)} às{" "}
            {formatarHora(documento.emitidoEm)}
          </span>
          {documento.emitidoPor ? <span>por {documento.emitidoPor}</span> : null}
          {documento.assinadoEm ? (
            <span className="tabular text-positivo">
              Assinado em {formatarData(documento.assinadoEm)}
            </span>
          ) : null}
        </div>
      </Link>
    </li>
  );
}

export function ListaDocumentos({
  documentos,
  filtrado,
}: {
  documentos: DocumentoDaLista[];
  /** Lista vazia por filtro é diferente de lista vazia por não haver nada. */
  filtrado: boolean;
}) {
  if (documentos.length === 0) {
    return filtrado ? (
      <EstadoVazio
        icone={FileSignature}
        titulo="Nenhum documento com esses filtros"
        descricao="Mude a situação, o tipo ou limpe a busca para ver o resto."
      />
    ) : (
      <EstadoVazio
        icone={FileSignature}
        titulo="Nenhum documento emitido"
        descricao="Emita o primeiro contrato, termo ou orientação a partir de um modelo."
        acao={
          <BotaoLink href="/formularios/novo" variante="primaria" tamanho="sm">
            Emitir documento
          </BotaoLink>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {documentos.map((documento) => (
        <Linha key={documento.id} documento={documento} />
      ))}
    </ul>
  );
}
