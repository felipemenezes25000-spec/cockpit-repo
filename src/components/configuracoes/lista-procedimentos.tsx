import { Archive, ArchiveRestore, Pencil, Stethoscope } from "lucide-react";
import Link from "next/link";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { SeloHero } from "@/components/ui/page-hero";
import { cn } from "@/lib/cn";
import { alternarAtivoProcedimento } from "@/server/acoes/procedimentos";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import type { Procedimento } from "@/server/consultas/procedimentos";
import { resumoDoProcedimento } from "./resumo-procedimento";

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
    <ul aria-label="Procedimentos" className="grid gap-4 md:grid-cols-2">
      {procedimentos.map((p, indice) => (
        <li
          key={p.id}
          style={{ animationDelay: `${Math.min(indice * 45, 220)}ms` }}
          className={cn(
            "dashboard-stagger group relative isolate flex min-h-48 flex-col overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border p-4 sm:p-5",
            p.ativo
              ? "premium-interactive border-card-border bg-surface"
              : "border-dashed border-outline-variant bg-surface-container-low",
          )}
        >
          <span aria-hidden="true" className={cn("absolute inset-y-4 left-0 w-1 rounded-r-full transition-colors duration-200", p.ativo ? "bg-primary-fixed-dim group-hover:bg-primary-container" : "bg-outline-variant")} />
          <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-36 rounded-full bg-primary-fixed/45 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="relative flex items-start justify-between gap-4 pl-1">
            <span
              className={cn(
                "flex size-12 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border shadow-[0_14px_28px_-22px_rgba(8,84,160,.6)] transition-transform duration-200 group-hover:-translate-y-0.5",
                p.ativo
                  ? "border-primary-fixed-dim bg-gradient-to-br from-surface to-selecao text-primary"
                  : "border-card-border bg-surface-container text-outline",
              )}
            >
              <Stethoscope aria-hidden="true" size={20} strokeWidth={1.7} />
            </span>

            <div className="flex flex-wrap justify-end gap-1.5">
              {!p.ativo ? (
                <SeloHero className="min-h-7 px-2.5 py-0 text-[0.66rem]">
                  <Archive aria-hidden="true" size={11} strokeWidth={1.75} />
                  Fora da agenda
                </SeloHero>
              ) : (
                <SeloHero tom="positivo" className="min-h-7 px-2.5 py-0 text-[0.66rem]">Ativo</SeloHero>
              )}
              {p.exemplo ? <SeloHero tom="atencao" className="min-h-7 px-2.5 py-0 text-[0.66rem]">Exemplo</SeloHero> : null}
            </div>
          </div>

          <div className="relative mt-5 min-w-0 flex-1 pl-1">
            <p className="rotulo text-primary">Procedimento</p>
            <h3 className="mt-1 text-[1.02rem] font-bold tracking-[-0.018em] text-on-surface transition-colors group-hover:text-primary">{p.nome}</h3>
            <p className="tabular mt-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-3 py-2.5 text-xs leading-5 text-outline">{resumoDoProcedimento(p)}</p>
          </div>

          {podeEditar ? (
            <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-card-border pt-3.5 pl-1">
              <Link
                href={`/configuracoes/procedimentos/${p.id}/editar`}
                className="premium-interactive inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant hover:border-primary-fixed-dim hover:bg-selecao hover:text-primary"
              >
                <Pencil aria-hidden="true" size={13} strokeWidth={1.75} />
                Editar
              </Link>

              <FormularioDeAcao
                acao={alternarAtivoProcedimento}
                campos={{ id: p.id, ativar: p.ativo ? "nao" : "sim" }}
                alinhamento="fim"
              >
                <BotaoDeAcao
                  tom="silencioso"
                  tamanho="xs"
                  icone={p.ativo ? <Archive strokeWidth={1.75} /> : <ArchiveRestore strokeWidth={1.75} />}
                  rotuloAcessivel={`${p.ativo ? "Tirar da agenda" : "Devolver à agenda"}: ${p.nome}`}
                >
                  {p.ativo ? "Tirar da agenda" : "Devolver à agenda"}
                </BotaoDeAcao>
              </FormularioDeAcao>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
