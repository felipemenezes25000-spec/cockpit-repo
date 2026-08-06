import { cn } from "@/lib/cn";
import { capitalizar, formatarMesCurto, formatarMoeda } from "@/lib/format";
import { mesmoMes } from "@/lib/dates";
import type { PontoMensal } from "@/server/consultas/financeiro";

/**
 * Evolução dos recebimentos nos últimos seis meses.
 *
 * Série única, por isso uma cor só e nenhuma legenda de cores: o título já diz
 * o que a barra representa. O mês corrente é hachurado e rotulado como "em
 * andamento" — a diferença não fica só na cor.
 */
export function EvolucaoRecebimentos({
  serie,
  exemplo,
}: {
  serie: PontoMensal[];
  exemplo: boolean;
}) {
  const teto = Math.max(...serie.map((p) => p.recebido), 1);
  const agora = new Date();

  const hachura =
    "bg-primary-fixed [background-image:repeating-linear-gradient(135deg,transparent_0_4px,color-mix(in_srgb,var(--color-primary-container)_40%,transparent)_4px_5px)]";

  return (
    <figure className="m-0">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="rotulo">Recebido por mês</span>
        <span className="text-xs text-outline">
          últimos 6 meses{exemplo ? " · valores demonstrativos" : ""}
        </span>
      </figcaption>

      <ul className="mt-5 flex h-[140px] items-end gap-2 sm:gap-3">
        {serie.map((ponto) => {
          const emAndamento = mesmoMes(ponto.data, agora);
          const altura = Math.max(4, Math.round((ponto.recebido / teto) * 100));
          const mes = capitalizar(formatarMesCurto(ponto.data).replace(".", ""));

          return (
            <li
              key={ponto.data.toISOString()}
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end"
              aria-label={`${mes}: ${formatarMoeda(ponto.recebido)}${emAndamento ? " (mês em andamento)" : ""}`}
            >
              {/* O valor aparece ao passar o ponteiro; o mês corrente é fixo */}
              <span
                aria-hidden="true"
                className={cn(
                  "tabular mb-1.5 block truncate text-center text-[0.625rem] font-semibold text-on-surface transition-opacity",
                  emAndamento ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                )}
              >
                {formatarMoeda(ponto.recebido)}
              </span>

              <span
                aria-hidden="true"
                className={cn(
                  "w-full rounded-t-[var(--radius-tag)] transition-colors",
                  emAndamento ? hachura : "bg-primary-container group-hover:bg-primary",
                )}
                style={{ height: `${altura}%` }}
              />
            </li>
          );
        })}
      </ul>

      {/* Linha de base e rótulos dos meses */}
      <div className="mt-2 border-t border-card-border pt-2">
        <ul className="flex gap-2 sm:gap-3" aria-hidden="true">
          {serie.map((ponto) => (
            <li
              key={ponto.data.toISOString()}
              className={cn(
                "min-w-0 flex-1 truncate text-center text-xs",
                mesmoMes(ponto.data, agora)
                  ? "font-semibold text-on-surface"
                  : "text-outline",
              )}
            >
              {capitalizar(formatarMesCurto(ponto.data).replace(".", ""))}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 flex items-center gap-2 text-xs text-outline">
        <span
          aria-hidden="true"
          className={cn("inline-block h-2.5 w-4 rounded-[2px]", hachura)}
        />
        Mês em andamento — ainda vai receber lançamentos
      </p>
    </figure>
  );
}
