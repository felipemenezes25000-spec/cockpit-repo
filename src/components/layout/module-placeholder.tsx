import { ArrowLeft, Check, Hammer, Sparkles } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { itemPorHref } from "@/lib/nav";

/** Página provisória honesta: mostra a direção do módulo sem simular recurso. */
export function ModuloEmConstrucao({ href }: { href: string }) {
  const item = itemPorHref(href);
  if (!item) return null;

  const Icone = item.icone;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
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
            <SeloHero>
              <Sparkles aria-hidden="true" size={13} strokeWidth={1.75} />
              Sem funcionalidade simulada
            </SeloHero>
          </>
        }
      />

      <Card className="relative overflow-hidden">
        <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-14 size-64 rounded-full bg-primary-fixed/35 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-[12%] size-56 rounded-full bg-secondary-fixed/28 blur-3xl" />
        <CardCorpo className="relative px-5 py-7 sm:px-7 sm:py-8">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
            <div>
              <p className="rotulo text-primary/80">Roadmap do módulo</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-on-surface sm:text-[1.45rem]">
                Um módulo útil quando estiver pronto — não antes
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Esta área permanece visível para deixar claro o desenho futuro do sistema. Nenhum botão, gráfico ou dado fictício é apresentado como se já funcionasse.
              </p>

              {item.proximosPassos.length > 0 ? (
                <div className="mt-6">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold tracking-[0.06em] text-outline uppercase">Entregas planejadas</span>
                    <span className="tabular rounded-full border border-card-border/75 bg-white/65 px-2.5 py-1 text-[0.66rem] font-semibold text-outline shadow-[var(--shadow-cartao)]">
                      {item.proximosPassos.length} etapas
                    </span>
                  </div>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {item.proximosPassos.map((passo, indice) => (
                      <li
                        key={passo}
                        style={{ animationDelay: `${indice * 70 + 80}ms` }}
                        className="dashboard-stagger premium-interactive group relative flex items-start gap-3 overflow-hidden rounded-[16px] border border-card-border/70 bg-white/62 px-4 py-3.5 text-sm leading-6 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)]"
                      >
                        <span aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 size-16 rounded-full bg-primary-fixed/30 blur-2xl" />
                        <span className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px] border border-primary/10 bg-primary-fixed/48 text-primary shadow-[var(--shadow-cartao)] transition-transform duration-200 group-hover:scale-[1.04]">
                          <Check aria-hidden="true" size={14} strokeWidth={2} />
                        </span>
                        <span className="relative">{passo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <aside className="relative overflow-hidden rounded-[22px] border border-dashed border-outline-variant/80 bg-[linear-gradient(160deg,rgba(255,255,255,0.78),rgba(244,248,252,0.74))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)]">
              <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 size-28 rounded-full bg-primary-fixed/40 blur-2xl" />
              <span className="relative flex size-11 items-center justify-center rounded-2xl border border-card-border/75 bg-white/72 text-outline shadow-[var(--shadow-cartao)]">
                <Hammer aria-hidden="true" size={19} strokeWidth={1.7} />
              </span>
              <p className="relative mt-4 text-sm font-semibold text-on-surface">Ainda não disponível</p>
              <p className="relative mt-1.5 text-xs leading-5 text-outline">
                Quando este módulo for implementado, ele deverá seguir as mesmas regras de segurança, acessibilidade e qualidade do restante do Cockpit.
              </p>
              <div className="relative mt-5 space-y-2">
                <div className="h-2.5 w-[78%] rounded-full bg-surface-container" />
                <div className="h-2.5 w-[58%] rounded-full bg-surface-container-low" />
                <div className="h-2.5 w-[68%] rounded-full bg-surface-container" />
              </div>
            </aside>
          </div>

          <div className="mt-7 border-t border-card-border/70 pt-5">
            <BotaoLink href="/" variante="primaria">
              <ArrowLeft aria-hidden="true" size={18} strokeWidth={1.75} />
              Voltar para a Visão Geral
            </BotaoLink>
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
