import { Archive, ArchiveRestore, Pencil, Stethoscope } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import { alternarAtivoProcedimento } from "@/server/acoes/procedimentos";
import type { Procedimento } from "@/server/consultas/procedimentos";

/**
 * A tabela de procedimentos. Quem não é administradora vê a mesma lista, sem
 * os botões — a RLS não deixaria escrever de qualquer jeito, e mostrar um
 * botão que vai falhar é pior que não mostrar.
 */
export function ListaProcedimentos({
  procedimentos,
  podeEditar,
}: {
  procedimentos: Procedimento[];
  podeEditar: boolean;
}) {
  if (procedimentos.length === 0) {
    return (
      <EstadoVazio
        icone={Stethoscope}
        titulo="Nenhum procedimento cadastrado"
        descricao="A agenda só consegue marcar atendimento depois que a tabela existir."
        acao={
          podeEditar ? (
            <BotaoLink href="/configuracoes/procedimentos/novo" variante="primaria" tamanho="sm">
              Cadastrar o primeiro
            </BotaoLink>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul aria-label="Procedimentos" className="flex flex-col gap-3">
      {procedimentos.map((p) => (
        <li
          key={p.id}
          className={cn(
            "flex flex-col gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)] sm:flex-row sm:items-center sm:justify-between",
            !p.ativo && "opacity-70",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-on-surface">{p.nome}</span>
              {!p.ativo ? (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-surface-container px-1.5 py-0.5 text-[0.6875rem] font-medium text-on-surface-variant">
                  <Archive aria-hidden="true" size={11} strokeWidth={1.75} />
                  Fora da agenda
                </span>
              ) : null}
              {p.exemplo ? (
                <span className="rounded-[var(--radius-tag)] border border-dashed border-outline-variant px-1.5 py-0.5 text-[0.6875rem] text-outline">
                  exemplo
                </span>
              ) : null}
            </div>

            <p className="tabular mt-1 text-xs text-outline">
              {p.duracaoMin} min
              {p.valorPadrao > 0 ? ` · ${formatarMoeda(p.valorPadrao)}` : " · sem valor de tabela"}
              {p.retornoSugeridoDias
                ? ` · retorno em ${p.retornoSugeridoDias} dias`
                : " · sem retorno sugerido"}
              {p.usos > 0
                ? ` · ${p.usos} ${p.usos === 1 ? "atendimento" : "atendimentos"}`
                : ""}
            </p>
          </div>

          {podeEditar ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/configuracoes/procedimentos/${p.id}/editar`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                <Pencil aria-hidden="true" size={13} strokeWidth={1.75} />
                Editar
              </Link>

              <form action={alternarAtivoProcedimento}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="ativar" value={p.ativo ? "nao" : "sim"} />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  {p.ativo ? (
                    <>
                      <Archive aria-hidden="true" size={13} strokeWidth={1.75} />
                      Tirar da agenda
                    </>
                  ) : (
                    <>
                      <ArchiveRestore aria-hidden="true" size={13} strokeWidth={1.75} />
                      Devolver à agenda
                    </>
                  )}
                </button>
              </form>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
