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
    <ul aria-label="Procedimentos" className="grid gap-3 md:grid-cols-2">
      {procedimentos.map((p) => (
        <li
          key={p.id}
          className={cn(
            "relative isolate flex min-h-44 flex-col overflow-hidden rounded-[var(--radius-painel)] border p-4 sm:p-5",
            p.ativo
              ? "premium-interactive border-card-border/75 bg-surface/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)]"
              : "border-dashed border-outline-variant/80 bg-surface-container-low/60",
          )}
        >
          {p.ativo ? (
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 -z-10 size-36 rounded-full bg-primary-fixed/32 blur-2xl" />
          ) : null}

          <div className="flex items-start justify-between gap-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-2xl border shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                p.ativo
                  ? "border-primary-fixed-dim/55 bg-primary-fixed/48 text-primary"
                  : "border-card-border bg-surface-container text-outline",
              )}
            >
              <Stethoscope aria-hidden="true" size={18} strokeWidth={1.65} />
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

          <div className="mt-4 min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-[-0.015em] text-on-surface">{p.nome}</h3>
            <p className="tabular mt-2 text-xs leading-5 text-outline">{resumoDoProcedimento(p)}</p>
          </div>

          {podeEditar ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-card-border/65 pt-3">
              <Link
                href={`/configuracoes/procedimentos/${p.id}/editar`}
                className="premium-interactive inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant shadow-[var(--shadow-cartao)] hover:border-primary-fixed-dim hover:text-primary"
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
