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

      <Card>
        <CardCorpo className="px-5 py-7 sm:px-7 sm:py-8">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div>
              <p className="rotulo text-primary/80">O que está planejado</p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-on-surface">
                Um módulo útil quando estiver pronto — não antes
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
                Esta área permanece visível para deixar claro o desenho futuro do sistema. Nenhum botão, gráfico ou dado fictício é apresentado como se já funcionasse.
              </p>

              {item.proximosPassos.length > 0 ? (
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {item.proximosPassos.map((passo) => (
                    <li
                      key={passo}
                      className="flex items-start gap-3 rounded-[var(--radius-cartao)] border border-card-border/70 bg-surface/58 px-4 py-3.5 text-sm leading-6 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]"
                    >
                      <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/45 text-primary">
                        <Check aria-hidden="true" size={13} strokeWidth={2} />
                      </span>
                      {passo}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <aside className="rounded-[var(--radius-painel)] border border-dashed border-outline-variant/80 bg-surface-container-low/60 p-5">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-surface-container text-outline">
                <Hammer aria-hidden="true" size={19} strokeWidth={1.7} />
              </span>
              <p className="mt-4 text-sm font-semibold text-on-surface">Ainda não disponível</p>
              <p className="mt-1.5 text-xs leading-5 text-outline">
                Quando este módulo for implementado, ele deverá seguir as mesmas regras de segurança, acessibilidade e qualidade do restante do Cockpit.
              </p>
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
