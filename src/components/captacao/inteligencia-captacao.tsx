import {
  ArrowRight,
  BadgeAlert,
  Megaphone,
  Route,
  Sparkles,
} from "lucide-react";
import { Card, CardCorpo } from "@/components/ui/card";
import { ROTULO_ETAPA } from "@/lib/captacao";
import type {
  CampanhaDoPainel,
  GargaloDoPainel,
  OrigemDoPainel,
} from "@/server/consultas/captacao";

function taxa(valor: number): string {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function desvio(atual: number, planejada: number): string {
  const valor = Math.round((atual - planejada) * 10) / 10;
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} p.p.`;
}

const COLUNAS_ORIGEM = "grid-cols-[minmax(0,1fr)_3.25rem_4.8rem] sm:grid-cols-[minmax(0,1fr)_4rem_4rem_5rem]";

function TabelaOrigens({ origens }: { origens: OrigemDoPainel[] }) {
  if (origens.length === 0) {
    return (
      <p className="mt-4 rounded-[var(--radius-cartao)] border border-dashed border-card-border px-4 py-5 text-xs leading-5 text-outline">
        As origens ganham leitura de conversão assim que houver leads no período.
      </p>
    );
  }

  return (
    <div className="mt-4 overflow-hidden rounded-[var(--radius-cartao)] border border-card-border">
      <div className={`grid ${COLUNAS_ORIGEM} gap-2 bg-surface-container-low px-3 py-2 text-[0.6rem] font-semibold tracking-[0.055em] text-outline uppercase`}>
        <span>Origem</span>
        <span className="text-right">Leads</span>
        <span className="hidden text-right sm:block">Vendas</span>
        <span className="text-right">Conv.</span>
      </div>
      <ul className="divide-y divide-card-border bg-surface">
        {origens.slice(0, 6).map((origem) => (
          <li
            key={origem.origem}
            className={`grid ${COLUNAS_ORIGEM} gap-2 px-3 py-2.5 text-xs`}
          >
            <span className="truncate font-medium text-on-surface">{origem.origem}</span>
            <span className="text-right tabular-nums text-on-surface-variant">{origem.quantidade}</span>
            <span className="hidden text-right tabular-nums text-on-surface-variant sm:block">{origem.ganhos}</span>
            <strong className="text-right tabular-nums text-primary">{taxa(origem.conversao)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Campanhas({ campanhas }: { campanhas: CampanhaDoPainel[] }) {
  if (campanhas.length === 0) {
    return (
      <div className="mt-4 rounded-[var(--radius-cartao)] border border-dashed border-card-border px-4 py-5">
        <p className="text-sm font-semibold text-on-surface">Nenhuma campanha identificada ainda.</p>
        <p className="mt-1 text-xs leading-5 text-outline">
          Preencha o campo Campanha na entrada do lead para separar ações como “Botox setembro”, Google Ads ou mutirão.
        </p>
      </div>
    );
  }

  const maximo = Math.max(...campanhas.map((item) => item.quantidade), 1);

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {campanhas.slice(0, 5).map((campanha) => (
        <li key={campanha.campanha} className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-on-surface">{campanha.campanha}</p>
              <p className="mt-1 text-xs text-outline">
                {campanha.quantidade} {campanha.quantidade === 1 ? "lead" : "leads"} · {campanha.ganhos} {campanha.ganhos === 1 ? "venda" : "vendas"}
              </p>
            </div>
            <strong className="shrink-0 text-sm tabular-nums text-primary">{taxa(campanha.conversao)}</strong>
          </div>
          <span aria-hidden="true" className="barra barra-fina mt-2.5">
            <span className="chart-grow" style={{ width: `${(campanha.quantidade / maximo) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Gargalo({
  gargalo,
  metaConfigurada,
}: {
  gargalo: GargaloDoPainel | null;
  metaConfigurada: boolean;
}) {
  if (!gargalo) {
    return (
      <div className="mt-4 rounded-[var(--radius-cartao)] border border-dashed border-card-border px-4 py-5">
        <p className="text-sm font-semibold text-on-surface">Ainda não há volume suficiente para localizar um gargalo.</p>
        <p className="mt-1 text-xs leading-5 text-outline">A leitura aparece conforme os leads avançam entre as etapas.</p>
      </div>
    );
  }

  const abaixo = metaConfigurada && gargalo.taxaAtual < gargalo.taxaPlanejada;

  return (
    <div className="mt-4 rounded-[var(--radius-painel)] border border-card-border bg-surface-container-low p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-outline">Menor conversão entre etapas com volume</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-on-surface">
            <span>{ROTULO_ETAPA[gargalo.de]}</span>
            <ArrowRight aria-hidden="true" size={14} className="text-outline" />
            <span>{ROTULO_ETAPA[gargalo.para]}</span>
          </div>
        </div>
        {metaConfigurada ? (
          <span
            className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${
              abaixo
                ? "border-atencao-borda bg-atencao-fundo text-atencao"
                : "border-positivo-borda bg-positivo-fundo text-positivo"
            }`}
          >
            {desvio(gargalo.taxaAtual, gargalo.taxaPlanejada)} vs. plano
          </span>
        ) : (
          <span className="inline-flex min-h-7 items-center rounded-full border border-card-border bg-surface px-2.5 py-1 text-xs font-semibold text-outline">
            sem meta para comparar
          </span>
        )}
      </div>

      <div className={`mt-5 grid gap-2 ${metaConfigurada ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
        <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3">
          <p className="text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">Atual</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">{taxa(gargalo.taxaAtual)}</p>
        </div>
        {metaConfigurada ? (
          <div className="rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3">
            <p className="text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">Planejada</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">{taxa(gargalo.taxaPlanejada)}</p>
          </div>
        ) : null}
        <div className={`rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3 ${metaConfigurada ? "col-span-2 sm:col-span-1" : ""}`}>
          <p className="text-[0.64rem] font-semibold tracking-[0.06em] text-outline uppercase">Não avançaram</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">{gargalo.quantidadeNaoAvancou}</p>
        </div>
      </div>
    </div>
  );
}

export function InteligenciaCaptacao({
  origens,
  campanhas,
  gargalo,
  metaConfigurada,
}: {
  origens: OrigemDoPainel[];
  campanhas: CampanhaDoPainel[];
  gargalo: GargaloDoPainel | null;
  metaConfigurada: boolean;
}) {
  return (
    <section aria-labelledby="titulo-inteligencia-captacao" className="grid min-w-0 gap-5 xl:grid-cols-12">
      <Card className="min-w-0 xl:col-span-4">
        <CardCorpo>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-atencao-fundo text-atencao">
              <BadgeAlert size={19} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="rotulo text-primary">Gargalo</p>
              <h2 id="titulo-inteligencia-captacao" className="titulo-secao mt-1">Onde o funil perde força</h2>
            </div>
          </div>
          <Gargalo gargalo={gargalo} metaConfigurada={metaConfigurada} />
        </CardCorpo>
      </Card>

      <Card className="min-w-0 xl:col-span-4">
        <CardCorpo>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary">
              <Route size={19} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="rotulo text-primary">Origem</p>
              <h2 className="titulo-secao mt-1">Volume também precisa converter</h2>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-outline">Conversão Lead → Venda dentro da mesma coorte mensal exibida no funil.</p>
          <TabelaOrigens origens={origens} />
        </CardCorpo>
      </Card>

      <Card className="min-w-0 xl:col-span-4">
        <CardCorpo>
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-primary-fixed text-primary">
              <Megaphone size={19} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="rotulo text-primary">Campanhas</p>
              <h2 className="titulo-secao mt-1">O que está trazendo resultado</h2>
            </div>
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-xs leading-5 text-outline">
            <Sparkles aria-hidden="true" size={13} className="shrink-0 text-primary" />
            Agrupado pelo campo Campanha informado na entrada do lead.
          </p>
          <Campanhas campanhas={campanhas} />
        </CardCorpo>
      </Card>
    </section>
  );
}
