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
          "premium-interactive group relative isolate flex flex-col gap-3 overflow-hidden rounded-[18px] border p-4 shadow-[var(--shadow-cartao)] sm:flex-row sm:items-center sm:justify-between sm:p-5",
          assinado
            ? "border-positivo-borda/45 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(234,245,234,0.28))]"
            : encerrado
              ? "border-card-border/68 bg-surface-container-low/44"
              : "border-card-border/85 bg-linear-to-br from-white/95 to-primary-fixed/8",
        )}
      >
        <span aria-hidden="true" className={cn("pointer-events-none absolute -top-12 -right-10 -z-10 size-28 rounded-full blur-2xl", assinado ? "bg-positivo-fundo/65" : encerrado ? "bg-surface-container-high/45" : "bg-primary-fixed/28")} />
        <span aria-hidden="true" className={cn("absolute inset-y-4 left-0 w-[3px] rounded-r-full transition-colors duration-200", assinado ? "bg-positivo" : encerrado ? "bg-outline-variant" : "bg-primary-fixed-dim group-hover:bg-primary-container")} />

        <div className="flex min-w-0 items-start gap-3.5 pl-0.5">
          <span className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.86),var(--shadow-cartao)] transition-[transform,box-shadow] duration-200 group-hover:-translate-y-0.5 group-hover:scale-[1.025]",
            assinado
              ? "border-positivo-borda/55 bg-positivo-fundo/58 text-positivo"
              : encerrado
                ? "border-card-border/70 bg-white/58 text-outline"
                : "border-primary-fixed-dim/55 bg-primary-fixed/32 text-primary",
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

        <span className="flex size-9 shrink-0 items-center justify-center self-end rounded-xl border border-card-border/75 bg-surface/75 text-outline-variant shadow-[var(--shadow-cartao)] transition-[transform,color,border-color,background-color,box-shadow] duration-200 group-hover:translate-x-0.5 group-hover:border-primary-fixed-dim group-hover:bg-primary-fixed/35 group-hover:text-primary group-hover:shadow-[var(--shadow-realce)] sm:self-auto">
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
