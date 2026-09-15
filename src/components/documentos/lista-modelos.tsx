import { FileText, PencilLine } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { formatarData } from "@/lib/format";
import { ROTULO_TIPO } from "@/lib/documento";
import type { ModeloDaLista } from "@/server/consultas/documentos";
import { BotaoModeloAtivo } from "./botao-modelo-ativo";

function Linha({
  modelo,
  administradora,
}: {
  modelo: ModeloDaLista;
  administradora: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 border-b border-card-border px-4 py-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-on-surface">{modelo.nome}</span>
          <span className="rounded-[var(--radius-tag)] bg-secondary-fixed px-2 py-0.5 text-xs font-medium text-primary">
            {ROTULO_TIPO[modelo.tipo]}
          </span>
          {modelo.versaoAtual > 0 ? (
            <span className="tabular text-xs text-outline">
              versão {modelo.versaoAtual}
            </span>
          ) : (
            <span className="rounded-[var(--radius-tag)] bg-atencao-fundo px-2 py-0.5 text-xs font-medium text-atencao">
              sem texto
            </span>
          )}
          {!modelo.ativo ? (
            <span className="rounded-[var(--radius-tag)] border border-outline-variant px-2 py-0.5 text-xs text-outline">
              aposentado
            </span>
          ) : null}
          {modelo.exemplo ? (
            <span className="text-xs text-outline-variant">exemplo</span>
          ) : null}
        </div>

        {modelo.descricao ? (
          <p className="mt-1 text-sm text-outline">{modelo.descricao}</p>
        ) : null}

        <p className="tabular mt-1 text-xs text-outline-variant">
          Atualizado em {formatarData(modelo.atualizadoEm)} ·{" "}
          {modelo.emitidos === 0
            ? "nenhum documento emitido"
            : modelo.emitidos === 1
              ? "1 documento emitido"
              : `${modelo.emitidos} documentos emitidos`}
        </p>
      </div>

      {administradora ? (
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href={`/formularios/modelos/${modelo.id}/editar`}
            className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-tag)] px-2.5 text-xs font-medium text-outline transition-colors hover:bg-surface-container-low hover:text-primary"
          >
            <PencilLine aria-hidden="true" size={14} strokeWidth={1.75} />
            Nova versão
          </Link>
          <BotaoModeloAtivo
            modeloId={modelo.id}
            ativo={modelo.ativo}
            nome={modelo.nome}
          />
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
        acao={
          administradora ? (
            <BotaoLink
              href="/formularios/modelos/novo"
              variante="primaria"
              tamanho="sm"
            >
              Criar o primeiro modelo
            </BotaoLink>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul className="flex flex-col">
      {modelos.map((modelo) => (
        <Linha key={modelo.id} modelo={modelo} administradora={administradora} />
      ))}
    </ul>
  );
}
