import { Archive, FileText, PencilLine } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SeloHero } from "@/components/ui/page-hero";
import { formatarData } from "@/lib/format";
import { ROTULO_TIPO } from "@/lib/documento";
import type { ModeloDaLista } from "@/server/consultas/documentos";
import { BotaoModeloAtivo } from "./botao-modelo-ativo";

const RESTRITO = "restrito à administradora";

function Emitidos({ quantos }: { quantos: number | null }) {
  if (quantos === null) {
    return (
      <span title="A anamnese é restrita à administradora; este perfil não vê os documentos emitidos.">
        documentos emitidos: — ({RESTRITO})
      </span>
    );
  }
  if (quantos === 0) return <>nenhum documento emitido</>;
  if (quantos === 1) return <>1 documento emitido</>;
  return <>{quantos} documentos emitidos</>;
}

function Linha({
  modelo,
  administradora,
}: {
  modelo: ModeloDaLista;
  administradora: boolean;
}) {
  return (
    <li className={modelo.ativo
      ? "premium-interactive relative isolate flex min-h-48 flex-col overflow-hidden rounded-[var(--radius-painel)] border border-card-border/75 bg-surface/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)] sm:p-5"
      : "relative flex min-h-48 flex-col rounded-[var(--radius-painel)] border border-dashed border-outline-variant/80 bg-surface-container-low/60 p-4 sm:p-5"}
    >
      {modelo.ativo ? <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 -z-10 size-36 rounded-full bg-primary-fixed/30 blur-2xl" /> : null}

      <div className="flex items-start justify-between gap-4">
        <span className={modelo.ativo
          ? "flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary-fixed-dim/55 bg-primary-fixed/48 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]"
          : "flex size-10 shrink-0 items-center justify-center rounded-2xl border border-card-border bg-surface-container text-outline"}
        >
          <FileText aria-hidden="true" size={18} strokeWidth={1.65} />
        </span>
        <div className="flex flex-wrap justify-end gap-1.5">
          <SeloHero tom="informativo" className="min-h-7 px-2.5 py-0 text-[0.66rem]">{ROTULO_TIPO[modelo.tipo]}</SeloHero>
          <SeloHero tom={modelo.ativo ? "positivo" : "neutro"} className="min-h-7 px-2.5 py-0 text-[0.66rem]">
            {modelo.ativo ? "Ativo" : "Aposentado"}
          </SeloHero>
        </div>
      </div>

      <div className="mt-4 min-w-0 flex-1">
        <h3 className="text-base font-semibold tracking-[-0.015em] text-on-surface">{modelo.nome}</h3>
        {modelo.descricao ? <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-on-surface-variant">{modelo.descricao}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {modelo.versaoAtual > 0 ? (
            <SeloHero className="min-h-7 px-2.5 py-0 text-[0.66rem]">Versão {modelo.versaoAtual}</SeloHero>
          ) : (
            <SeloHero tom="atencao" className="min-h-7 px-2.5 py-0 text-[0.66rem]">Sem texto</SeloHero>
          )}
          {modelo.exemplo ? <SeloHero tom="atencao" className="min-h-7 px-2.5 py-0 text-[0.66rem]">Exemplo</SeloHero> : null}
        </div>

        <p className="tabular mt-3 text-xs leading-5 text-outline">
          Atualizado em {formatarData(modelo.atualizadoEm)} · <Emitidos quantos={modelo.emitidos} />
        </p>
      </div>

      {administradora ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-card-border/65 pt-3">
          <Link
            href={`/formularios/modelos/${modelo.id}/editar`}
            className="premium-interactive inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant shadow-[var(--shadow-cartao)] hover:border-primary-fixed-dim hover:text-primary"
          >
            <PencilLine aria-hidden="true" size={13} strokeWidth={1.75} />
            Nova versão
          </Link>
          {!modelo.ativo ? <Archive aria-hidden="true" size={13} className="text-outline" /> : null}
          <BotaoModeloAtivo modeloId={modelo.id} ativo={modelo.ativo} nome={modelo.nome} />
        </div>
      ) : null}
    </li>
  );
}

export function ListaModelos({
  modelos,
  administradora,
}: {
  modelos: ModeloDaLista[];
  administradora: boolean;
}) {
  if (modelos.length === 0) {
    return (
      <EstadoVazio
        icone={FileText}
        titulo="Nenhum modelo cadastrado"
        descricao="O modelo é o texto-base que cada documento congela na emissão. Sem modelo, não há o que emitir."
        acao={administradora ? <BotaoLink href="/formularios/modelos/novo" variante="primaria" tamanho="sm">Criar o primeiro modelo</BotaoLink> : undefined}
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {modelos.map((modelo) => <Linha key={modelo.id} modelo={modelo} administradora={administradora} />)}
    </ul>
  );
}
