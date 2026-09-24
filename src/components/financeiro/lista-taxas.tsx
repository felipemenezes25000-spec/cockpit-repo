import { Archive, ArchiveRestore, BadgePercent, Pencil } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SeloHero } from "@/components/ui/page-hero";
import { cn } from "@/lib/cn";
import { bpDoBanco, formatarPercentual } from "@/lib/moeda";
import { alternarAtivaTaxa } from "@/server/acoes/taxas-cartao";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
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
    <ul aria-label="Taxas de cartão" className="grid gap-3 md:grid-cols-2">
      {taxas.map((taxa) => (
        <li
          key={taxa.id}
          className={cn(
            "relative isolate flex min-h-44 flex-col overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-5",
            taxa.ativa
              ? "premium-interactive border-card-border bg-surface"
              : "border-dashed border-outline-variant bg-surface-container-low",
          )}
        >

          <div className="flex items-start justify-between gap-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border",
                taxa.ativa
                  ? "border-primary-fixed-dim bg-selecao text-primary"
                  : "border-card-border bg-surface-container text-outline",
              )}
            >
              <BadgePercent aria-hidden="true" size={18} strokeWidth={1.65} />
            </span>

            <div className="flex flex-wrap justify-end gap-1.5">
              <SeloHero tom={taxa.ativa ? "positivo" : "neutro"} className="min-h-7 px-2.5 py-0 text-[0.66rem]">
                {taxa.ativa ? "Ativa" : "Inativa"}
              </SeloHero>
              <SeloHero className="min-h-7 px-2.5 py-0 text-[0.66rem]">
                {taxa.tipo === "credito" ? `Crédito ${taxa.parcelas}x` : "Débito"}
              </SeloHero>
            </div>
          </div>

          <div className="mt-4 min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-[-0.015em] text-on-surface">{taxa.operadora}</h3>
            <p className="tabular mt-2 text-[1.65rem] leading-none font-semibold tracking-[-0.035em] text-primary">
              {formatarPercentual(bpDoBanco(taxa.percentual))}
            </p>
            <p className="mt-2 text-xs leading-5 text-outline">
              {taxa.usos > 0
                ? `Aplicada em ${taxa.usos} ${taxa.usos === 1 ? "venda" : "vendas"}`
                : "Ainda não usada em venda"}
            </p>
          </div>

          {podeEditar ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-card-border pt-3">
              <Link
                href={`/financeiro/taxas/${taxa.id}/editar`}
                className="premium-interactive inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant hover:border-primary-fixed-dim hover:text-primary"
              >
                <Pencil aria-hidden="true" size={13} strokeWidth={1.75} />
                Editar
              </Link>

              <FormularioDeAcao
                acao={alternarAtivaTaxa}
                campos={{ id: taxa.id, ativar: taxa.ativa ? "nao" : "sim" }}
                alinhamento="fim"
              >
                <BotaoDeAcao
                  tom="silencioso"
                  tamanho="xs"
                  icone={taxa.ativa ? <Archive strokeWidth={1.75} /> : <ArchiveRestore strokeWidth={1.75} />}
                  rotuloAcessivel={`${taxa.ativa ? "Desativar" : "Reativar"} a taxa ${taxa.operadora}`}
                >
                  {taxa.ativa ? "Desativar" : "Reativar"}
                </BotaoDeAcao>
              </FormularioDeAcao>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
