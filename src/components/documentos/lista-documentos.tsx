import { ChevronRight, FileSignature } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarData, formatarHora } from "@/lib/format";
import type { DocumentoDaLista } from "@/server/consultas/documentos";
import { MarcaSituacao, MarcaTipo } from "./marca-situacao";

function Linha({ documento }: { documento: DocumentoDaLista }) {
  return (
    <li>
      <Link
        href={`/formularios/${documento.id}`}
        className="premium-interactive group relative isolate flex flex-col gap-3 overflow-hidden rounded-[var(--radius-cartao)] border border-card-border/85 bg-linear-to-br from-white/95 to-primary-fixed/8 p-4 shadow-[var(--shadow-cartao)] sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 -z-10 size-28 rounded-full bg-primary-fixed/28 blur-2xl" />

        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary-fixed-dim/55 bg-primary-fixed/32 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
            <FileSignature aria-hidden="true" size={20} strokeWidth={1.65} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-on-surface group-hover:text-primary">{documento.titulo}</span>
              <MarcaTipo tipo={documento.tipo} />
              <MarcaSituacao situacao={documento.situacao} tipo={documento.tipo} />
              {documento.exemplo ? (
                <span className="rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.68rem] text-outline">
                  exemplo
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-outline">
              <span className="font-medium text-on-surface-variant">{documento.paciente}</span>
              <span className="tabular">
                Emitido em {formatarData(documento.emitidoEm)} às {formatarHora(documento.emitidoEm)}
              </span>
              {documento.emitidoPor ? <span>por {documento.emitidoPor}</span> : null}
              {documento.assinadoEm ? (
                <span className="tabular font-medium text-positivo">
                  Assinado em {formatarData(documento.assinadoEm)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <span className="flex size-9 shrink-0 items-center justify-center self-end rounded-xl border border-card-border/75 bg-surface/75 text-outline-variant transition-[transform,color,border-color,background-color] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-primary-fixed/35 group-hover:text-primary sm:self-auto">
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.5} />
        </span>
      </Link>
    </li>
  );
}

export function ListaDocumentos({
  documentos,
  filtrado,
}: {
  documentos: DocumentoDaLista[];
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
    <ul className="flex flex-col gap-3.5">
      {documentos.map((documento) => (
        <Linha key={documento.id} documento={documento} />
      ))}
    </ul>
  );
}
