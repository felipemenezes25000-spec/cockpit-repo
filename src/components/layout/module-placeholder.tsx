import { ArrowLeft, BarChart3, Check, Hammer, ShieldCheck, Sparkles } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { itemPorHref } from "@/lib/nav";

/** Página provisória honesta: mostra a direção do módulo sem simular recurso. */
export function ModuloEmConstrucao({ href }: { href: string }) {
  const item = itemPorHref(href);
  if (!item) return null;

  const Icone = item.icone;

  return (
    <div className="page-reveal mx-auto flex max-w-6xl flex-col gap-6">
      <CabecalhoDePagina
        icone={Icone}
        rotulo="Próxima etapa"
        titulo={item.rotulo}
        descricao={item.finalidade}
        meta={
          <>
            <SeloHero tom="atencao">
              <Hammer aria-hidden="true" size={13} strokeWidth={1.75} />
              Em preparação
            </SeloHero>
            <SeloHero tom="informativo">
              <Sparkles aria-hidden="true" size={13} strokeWidth={1.75} />
              Estrutura planejada, sem dados simulados
            </SeloHero>
          </>
        }
      />

      <section className="premium-panel relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border p-4 sm:p-6 lg:p-7" aria-labelledby="roadmap-modulo">
        <span aria-hidden="true" className="pointer-events-none absolute -top-36 -right-24 size-96 rounded-full bg-primary-fixed/50 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 size-96 rounded-full bg-selecao/80 blur-3xl" />

        <div className="relative grid gap-7 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,.8fr)] xl:items-stretch">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-gradient-to-br from-surface to-selecao text-primary shadow-[0_16px_34px_-26px_rgba(8,84,160,.55)]">
                <Icone aria-hidden="true" size={20} strokeWidth={1.7} />
              </span>
              <div>
                <p className="rotulo text-primary">Roadmap do módulo</p>
                <h2 id="roadmap-modulo" className="mt-1 text-xl font-bold tracking-[-0.035em] text-on-surface sm:text-[1.45rem]">
                  Construído para entrar pronto, não pela metade
                </h2>
              </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-on-surface-variant">
              Esta área continua visível para mostrar a direção do Cockpit sem fingir que um relatório, gráfico ou indicador já existe. Quando entrar, nasce com dados reais, permissões corretas e o mesmo padrão de qualidade das telas prontas.
            </p>

            {item.proximosPassos.length > 0 ? (
              <div className="mt-7">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs font-semibold tracking-[0.07em] text-outline uppercase">Entregas planejadas</span>
                  <span className="tabular rounded-full border border-card-border bg-surface px-2.5 py-1 text-[0.66rem] font-semibold text-outline shadow-[0_8px_18px_-16px_rgba(8,41,76,.35)]">
                    {item.proximosPassos.length} {item.proximosPassos.length === 1 ? "etapa" : "etapas"}
                  </span>
                </div>

                <ol className="grid gap-3 sm:grid-cols-2">
                  {item.proximosPassos.map((passo, indice) => (
                    <li
                      key={passo}
                      style={{ animationDelay: `${indice * 70 + 80}ms` }}
                      className="dashboard-stagger premium-interactive group relative flex min-w-0 items-start gap-3 overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface px-4 py-4 text-sm leading-6 text-on-surface-variant"
                    >
                      <span className="relative flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary transition-transform duration-200 group-hover:-translate-y-0.5">
                        <span className="tabular text-[0.65rem] font-bold">{String(indice + 1).padStart(2, "0")}</span>
                      </span>
                      <span className="min-w-0 break-words">{passo}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            <div className="mt-7 flex items-start gap-2 border-t border-card-border pt-5 text-xs leading-5 text-outline">
              <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" />
              <span className="min-w-0">Sem números artificiais, sem gráficos decorativos e sem botão que não funcione.</span>
            </div>
          </div>

          <aside className="relative isolate min-h-[19rem] overflow-hidden rounded-[calc(var(--radius-painel)+2px)] border border-primary-fixed-dim bg-gradient-to-b from-[#0a6ed1] via-[#0854a0] to-[#063f7c] p-5 text-white shadow-[0_30px_68px_-42px_rgba(6,63,124,.72)] sm:p-6">
            <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-8 size-44 rounded-full bg-white/10 blur-3xl" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/10 to-transparent" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.66rem] font-bold tracking-[0.09em] text-white/[0.72] uppercase">Prévia estrutural</p>
                <p className="mt-1 text-base font-semibold tracking-[-0.015em] text-white">Como esta área vai se organizar</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-white/[0.18] bg-white/10 text-white">
                <BarChart3 aria-hidden="true" size={18} strokeWidth={1.7} />
              </span>
            </div>

            <div className="relative mt-7 grid grid-cols-3 gap-2" aria-hidden="true">
              {["72%", "48%", "61%"].map((largura, indice) => (
                <div key={largura} className="rounded-[var(--radius-cartao)] border border-white/[0.12] bg-white/[0.07] p-3">
                  <div className="h-2 w-10 rounded-full bg-white/[0.28]" />
                  <div className="mt-3 h-5 rounded-[var(--radius-tag)] bg-white/[0.18]" style={{ width: largura }} />
                  <div className="mt-2 h-2 w-12 rounded-full bg-white/[0.14]" />
                  <span className="sr-only">Indicador estrutural {indice + 1}</span>
                </div>
              ))}
            </div>

            <div className="relative mt-4 flex h-28 items-end gap-2 overflow-hidden rounded-[var(--radius-cartao)] border border-white/[0.12] bg-black/[0.06] px-3 pt-4 pb-3" aria-hidden="true">
              {[34, 52, 44, 69, 58, 82, 66, 88, 76, 92].map((altura, indice) => (
                <span key={`${altura}-${indice}`} className="min-w-0 flex-1 rounded-t-[3px] bg-white/20" style={{ height: `${altura}%` }} />
              ))}
            </div>

            <div className="relative mt-4 flex items-center gap-2 text-xs leading-5 text-white/[0.76]">
              <Check aria-hidden="true" size={14} strokeWidth={2} className="shrink-0 text-white" />
              <span>Somente estrutura visual; nenhum valor acima representa dado da clínica.</span>
            </div>
          </aside>
        </div>
      </section>

      <div className="flex">
        <BotaoLink href="/" variante="primaria">
          <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.75} />
          Voltar para a Visão Geral
        </BotaoLink>
      </div>
    </div>
  );
}
