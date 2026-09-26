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
    <li style={{ animationDelay: `${Math.min(indice * 45, 250)}ms` }} className="dashboard-stagger min-w-0">
      <Link
        href={`/formularios/${documento.id}`}
        className={cn(
          "premium-interactive group relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
          assinado
            ? "border-card-border bg-surface"
            : encerrado
              ? "border-card-border bg-surface-container-low"
              : "border-card-border bg-surface",
        )}
      >
        <span aria-hidden="true" className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full transition-colors duration-200", assinado ? "bg-positivo" : encerrado ? "bg-outline-variant" : "bg-primary-fixed-dim group-hover:bg-primary-container")} />

        <div className="flex min-w-0 items-start gap-3.5 pl-1">
          <span className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border shadow-[0_14px_28px_-22px_rgba(8,84,160,.6)] transition-transform duration-200 group-hover:-translate-y-0.5",
            assinado
              ? "border-positivo-borda bg-positivo-fundo text-positivo"
              : encerrado
                ? "border-card-border bg-surface text-outline"
                : "border-primary-fixed-dim bg-gradient-to-br from-surface to-selecao text-primary",
          )}>
            <FileSignature aria-hidden="true" size={21} strokeWidth={1.7} />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="min-w-0 break-words text-[0.98rem] font-bold tracking-[-0.015em] text-on-surface transition-colors group-hover:text-primary">{documento.titulo}</span>
              <MarcaTipo tipo={documento.tipo} />
              <MarcaSituacao situacao={documento.situacao} tipo={documento.tipo} />
              {documento.exemplo ? <span className="rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.68rem] text-outline">exemplo</span> : null}
            </div>

            <div className="mt-2.5 flex min-w-0 flex-wrap gap-2 text-xs text-outline">
              <span className="max-w-full break-words rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-2.5 py-1 font-medium text-on-surface-variant">{documento.paciente}</span>
              <span className="tabular max-w-full break-words rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-2.5 py-1">Emitido em {formatarData(documento.emitidoEm)} às {formatarHora(documento.emitidoEm)}</span>
              {documento.emitidoPor ? <span className="max-w-full break-words rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-2.5 py-1">por {documento.emitidoPor}</span> : null}
              {documento.assinadoEm ? <span className="tabular max-w-full break-words rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo px-2.5 py-1 font-semibold text-positivo">Assinado em {formatarData(documento.assinadoEm)}</span> : null}
            </div>
          </div>
        </div>

        <span className="inline-flex min-h-10 w-full shrink-0 items-center justify-center gap-2 self-stretch rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-2 text-xs font-semibold text-on-surface-variant transition-[transform,color,border-color,background-color] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-selecao group-hover:text-primary sm:w-auto sm:self-auto">
          Abrir documento
          <ChevronRight aria-hidden="true" size={15} strokeWidth={1.7} className="shrink-0" />
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
    <div className="min-w-0">
      <div className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="rotulo text-primary">Biblioteca documental</p>
          <p className="mt-1 max-w-2xl break-words text-xs leading-5 text-outline">Registros organizados por paciente, tipo, situação e data de emissão.</p>
        </div>
        <span className="max-w-full rounded-full border border-card-border bg-surface-container-low px-2.5 py-1 text-xs font-medium text-outline">Mais recentes primeiro</span>
      </div>
      <ul className="flex min-w-0 flex-col gap-3.5">
        {documentos.map((documento, indice) => <Linha key={documento.id} documento={documento} indice={indice} />)}
      </ul>
    </div>
  );
}
