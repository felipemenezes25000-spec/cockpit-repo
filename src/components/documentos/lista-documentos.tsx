import { ChevronRight, FileSignature } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatarData, formatarHora } from "@/lib/format";
import type { DocumentoDaLista } from "@/server/consultas/documentos";
import { MarcaSituacao, MarcaTipo } from "./marca-situacao";

function Linha({ documento, indice }: { documento: DocumentoDaLista; indice: number }) {
  const assinado = documento.situacao === "assinado";
  const encerrado = documento.situacao === "cancelado" || documento.situacao === "substituido";

  return (
    <li style={{ animationDelay: `${Math.min(indice * 45, 250)}ms` }} className="dashboard-stagger">
      <Link
        href={`/formularios/${documento.id}`}
        className={cn(
          "premium-interactive group relative isolate flex flex-col gap-3 overflow-hidden rounded-[var(--radius-cartao)] border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
          assinado
            ? "border-card-border bg-surface"
            : encerrado
              ? "border-card-border bg-surface-container-low"
              : "border-card-border bg-surface",
        )}
      >
        <span aria-hidden="true" className={cn("absolute inset-y-4 left-0 w-[3px] rounded-r-full transition-colors duration-200", assinado ? "bg-positivo" : encerrado ? "bg-outline-variant" : "bg-primary-fixed-dim group-hover:bg-primary-container")} />

        <div className="flex min-w-0 items-start gap-3.5 pl-0.5">
          <span className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border transition-[transform] duration-200",
            assinado
              ? "border-positivo-borda bg-positivo-fundo text-positivo"
              : encerrado
                ? "border-card-border bg-surface text-outline"
                : "border-primary-fixed-dim bg-selecao text-primary",
          )}>
            <FileSignature aria-hidden="true" size={20} strokeWidth={1.65} />
          </span>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-on-surface transition-colors group-hover:text-primary">{documento.titulo}</span>
              <MarcaTipo tipo={documento.tipo} />
              <MarcaSituacao situacao={documento.situacao} tipo={documento.tipo} />
              {documento.exemplo ? <span className="rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.68rem] text-outline">exemplo</span> : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-outline">
              <span className="font-medium text-on-surface-variant">{documento.paciente}</span>
              <span className="tabular">Emitido em {formatarData(documento.emitidoEm)} às {formatarHora(documento.emitidoEm)}</span>
              {documento.emitidoPor ? <span>por {documento.emitidoPor}</span> : null}
              {documento.assinadoEm ? <span className="tabular font-semibold text-positivo">Assinado em {formatarData(documento.assinadoEm)}</span> : null}
            </div>
          </div>
        </div>

        <span className="flex size-9 shrink-0 items-center justify-center self-end rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline-variant transition-[transform,color,border-color,background-color] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary sm:self-auto">
          <ChevronRight aria-hidden="true" size={18} strokeWidth={1.5} />
        </span>
      </Link>
    </li>
  );
}

export function ListaDocumentos({ documentos, filtrado }: { documentos: DocumentoDaLista[]; filtrado: boolean }) {
  if (documentos.length === 0) {
    return filtrado ? (
      <EstadoVazio icone={FileSignature} titulo="Nenhum documento com esses filtros" descricao="Mude a situação, o tipo ou limpe a busca para ver o resto." />
    ) : (
      <EstadoVazio
        icone={FileSignature}
        titulo="Nenhum documento emitido"
        descricao="Emita o primeiro contrato, termo ou orientação a partir de um modelo."
        acao={<BotaoLink href="/formularios/novo" variante="primaria" tamanho="sm">Emitir documento</BotaoLink>}
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3.5">
      {documentos.map((documento, indice) => <Linha key={documento.id} documento={documento} indice={indice} />)}
    </ul>
  );
}
