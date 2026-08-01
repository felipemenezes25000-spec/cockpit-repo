import { ArrowLeft, Hammer } from "lucide-react";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCorpo } from "@/components/ui/card";
import { FaixaDemonstracao } from "./demo-badge";
import { itemPorHref } from "@/lib/nav";

/**
 * Página provisória dos módulos. Diz o que o módulo vai fazer e deixa claro
 * que ainda não faz — sem simular funcionalidade.
 */
export function ModuloEmConstrucao({ href }: { href: string }) {
  const item = itemPorHref(href);
  if (!item) return null;

  const Icone = item.icone;

  return (
    <div className="mx-auto max-w-3xl">
      <FaixaDemonstracao className="mb-8" />

      <Card>
        <CardCorpo className="px-6 py-10 sm:px-10 sm:py-12">
          <span className="mb-6 flex size-14 items-center justify-center rounded-[var(--radius-controle)] bg-secondary-fixed text-primary">
            <Icone aria-hidden="true" size={26} strokeWidth={1.5} />
          </span>

          <h2 className="t-display text-primary">{item.rotulo}</h2>
          <p className="t-body-lg mt-4 max-w-xl text-on-surface-variant">
            {item.finalidade}
          </p>

          <p className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-controle)] border border-outline-variant bg-surface-container-low px-4 py-2 text-xs font-medium text-on-surface-variant">
            <Hammer aria-hidden="true" size={14} strokeWidth={1.75} />
            Módulo em construção — será desenvolvido nas próximas etapas
          </p>

          {item.proximosPassos.length > 0 ? (
            <div className="mt-10 border-t border-card-border pt-8">
              <p className="rotulo">O que este módulo vai trazer</p>
              <ul className="mt-4 flex flex-col gap-3">
                {item.proximosPassos.map((passo) => (
                  <li
                    key={passo}
                    className="flex items-start gap-3 text-sm text-on-surface-variant"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-2 size-1.5 shrink-0 rounded-full bg-outline-variant"
                    />
                    {passo}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-10">
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
