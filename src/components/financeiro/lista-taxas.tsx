import { Archive, ArchiveRestore, BadgePercent, Pencil } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { bpDoBanco, formatarPercentual } from "@/lib/moeda";
import { alternarAtivaTaxa } from "@/server/acoes/taxas-cartao";
import type { TaxaCartao } from "@/server/consultas/taxas";

export function ListaTaxas({
  taxas,
  podeEditar,
}: {
  taxas: TaxaCartao[];
  podeEditar: boolean;
}) {
  if (taxas.length === 0) {
    return (
      <EstadoVazio
        icone={BadgePercent}
        titulo="Nenhuma taxa cadastrada"
        descricao="Sem a tabela, não dá para registrar venda no cartão — o formulário não sabe qual taxa aplicar."
        acao={
          podeEditar ? (
            <BotaoLink href="/financeiro/taxas/nova" variante="primaria" tamanho="sm">
              Cadastrar a primeira
            </BotaoLink>
          ) : undefined
        }
      />
    );
  }

  return (
    <ul aria-label="Taxas de cartão" className="flex flex-col gap-3">
      {taxas.map((taxa) => (
        <li
          key={taxa.id}
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4 shadow-[var(--shadow-cartao)]",
            !taxa.ativa && "opacity-60",
          )}
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-on-surface">{taxa.operadora}</span>
              <span className="rounded-[var(--radius-tag)] bg-surface-container px-1.5 py-0.5 text-[0.6875rem] font-medium text-on-surface-variant">
                {taxa.tipo === "credito" ? `Crédito ${taxa.parcelas}x` : "Débito"}
              </span>
              {!taxa.ativa ? (
                <span className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] bg-surface-container px-1.5 py-0.5 text-[0.6875rem] font-medium text-on-surface-variant">
                  <Archive aria-hidden="true" size={11} strokeWidth={1.75} />
                  Inativa
                </span>
              ) : null}
            </div>
            <p className="tabular mt-1 text-xs text-outline">
              Taxa {formatarPercentual(bpDoBanco(taxa.percentual))}
              {taxa.usos > 0
                ? ` · aplicada em ${taxa.usos} ${taxa.usos === 1 ? "venda" : "vendas"}`
                : ""}
            </p>
          </div>

          {podeEditar ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Link
                href={`/financeiro/taxas/${taxa.id}/editar`}
                className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border px-3 text-xs font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
              >
                <Pencil aria-hidden="true" size={13} strokeWidth={1.75} />
                Editar
              </Link>

              <form action={alternarAtivaTaxa}>
                <input type="hidden" name="id" value={taxa.id} />
                <input type="hidden" name="ativar" value={taxa.ativa ? "nao" : "sim"} />
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-cartao)] px-3 text-xs font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
                >
                  {taxa.ativa ? (
                    <>
                      <Archive aria-hidden="true" size={13} strokeWidth={1.75} />
                      Desativar
                    </>
                  ) : (
                    <>
                      <ArchiveRestore aria-hidden="true" size={13} strokeWidth={1.75} />
                      Reativar
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
