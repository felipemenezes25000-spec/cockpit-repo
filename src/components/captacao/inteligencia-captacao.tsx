import {
  ArrowRight,
  BadgeAlert,
  CircleDollarSign,
  CircleX,
  Megaphone,
  Route,
  Sparkles,
} from "lucide-react";
import { Card, CardCorpo } from "@/components/ui/card";
import { ROTULO_ETAPA } from "@/lib/captacao";
import { formatarMoeda } from "@/lib/format";
import type {
  CampanhaDoPainel,
  GargaloDoPainel,
  MotivoPerdaDoPainel,
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

function Origens({ origens }: { origens: OrigemDoPainel[] }) {
  if (origens.length === 0) {
    return (
      <p className="mt-4 rounded-[var(--radius-cartao)] border border-dashed border-card-border px-4 py-5 text-xs leading-5 text-outline">
        As origens ganham leitura de conversão e receita assim que houver leads no período.
      </p>
    );
  }

  const maiorReceita = Math.max(...origens.map((item) => item.receita), 0);
  const maiorVolume = Math.max(...origens.map((item) => item.quantidade), 1);

  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {origens.slice(0, 6).map((origem) => {
        const base = maiorReceita > 0 ? origem.receita / maiorReceita : origem.quantidade / maiorVolume;
        return (
          <li key={origem.origem} className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-on-surface">{origem.origem}</p>
                <p className="mt-1 text-xs leading-5 text-outline">
                  {origem.quantidade} {origem.quantidade === 1 ? "lead" : "leads"} · {origem.ganhos} {origem.ganhos === 1 ? "venda" : "vendas"} · {taxa(origem.conversao)} conv.
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[0.6rem] font-semibold tracking-[0.055em] text-outline uppercase">Receita</p>
                <strong className="mt-0.5 block text-sm tabular-nums text-primary">{formatarMoeda(origem.receita)}</strong>
              </div>
            </div>
            <span aria-hidden="true" className="barra barra-fina mt-2.5">
              <span className="chart-grow" style={{ width: `${Math.max(3, base * 100)}%` }} />
            </span>
          </li>
        );
      })}
    </ul>
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

  const maiorReceita = Math.max(...campanhas.map((item) => item.receita), 0);
  const maiorVolume = Math.max(...campanhas.map((item) => item.quantidade), 1);

  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {campanhas.slice(0, 5).map((campanha, indice) => {
        const base = maiorReceita > 0 ? campanha.receita / maiorReceita : campanha.quantidade / maiorVolume;
        return (
          <li key={campanha.campanha} className="rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3.5 py-3">
            <div className="flex items-start gap-3">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-card-border bg-surface-container-low text-[0.68rem] font-semibold tabular-nums text-outline">
                {indice + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 truncate text-sm font-semibold text-on-surface">{campanha.campanha}</p>
                  <strong className="shrink-0 text-sm tabular-nums text-primary">{formatarMoeda(campanha.receita)}</strong>
                </div>
                <p className="mt-1 text-xs leading-5 text-outline">
                  {campanha.quantidade} {campanha.quantidade === 1 ? "lead" : "leads"} · {campanha.ganhos} {campanha.ganhos === 1 ? "venda" : "vendas"} · {taxa(campanha.conversao)} conv.
                </p>
                <span aria-hidden="true" className="barra barra-fina mt-2.5">
                  <span className="chart-grow" style={{ width: `${Math.max(3, base * 100)}%` }} />
                </span>
              </div>
            </div>
          </li>
        );
      })}
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

function MotivosPerda({ motivos, total }: { motivos: MotivoPerdaDoPainel[]; total: number }) {
  if (motivos.length === 0) {
    return (
      <div className="mt-4 rounded-[var(--radius-cartao)] border border-dashed border-card-border px-4 py-5 text-xs leading-5 text-outline">
        Os motivos aparecem aqui quando um lead for encerrado como perdido. Se ele for reaberto depois, o motivo histórico continua preservado.
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {motivos.slice(0, 4).map((item, indice) => (
        <div key={item.motivo} className="rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-card-border bg-surface text-xs font-semibold tabular-nums text-outline">
              {indice + 1}
            </span>
            <strong className="text-sm tabular-nums text-negativo">{taxa(item.percentual)}</strong>
          </div>
          <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-on-surface">{item.motivo}</p>
          <p className="mt-2 text-xs text-outline">
            {item.quantidade} de {total} {total === 1 ? "perda registrada" : "perdas registradas"}
          </p>
          <span aria-hidden="true" className="barra barra-fina mt-3">
            <span className="chart-grow" style={{ width: `${Math.min(100, item.percentual)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function InteligenciaCaptacao({
  origens,
  campanhas,
  gargalo,
  metaConfigurada,
  motivosPerda,
  totalPerdidos,
}: {
  origens: OrigemDoPainel[];
  campanhas: CampanhaDoPainel[];
  gargalo: GargaloDoPainel | null;
  metaConfigurada: boolean;
  motivosPerda: MotivoPerdaDoPainel[];
  totalPerdidos: number;
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
              <h2 className="titulo-secao mt-1">De onde vem o dinheiro</h2>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-outline">
            <CircleDollarSign aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-primary" />
            Receita atribuída usa somente vendas reais ligadas aos leads desta coorte — não multiplica ticket médio.
          </p>
          <Origens origens={origens} />
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
              <h2 className="titulo-secao mt-1">O que está trazendo receita</h2>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-xs leading-5 text-outline">
            <Sparkles aria-hidden="true" size={13} className="mt-0.5 shrink-0 text-primary" />
            Ordenado pela receita efetivamente registrada no Financeiro para os leads identificados pela campanha.
          </p>
          <Campanhas campanhas={campanhas} />
        </CardCorpo>
      </Card>

      <Card className="min-w-0 xl:col-span-12">
        <CardCorpo>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-controle)] bg-negativo-fundo text-negativo">
                <CircleX size={19} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="rotulo text-primary">Motivos de perda</p>
                <h2 className="titulo-secao mt-1">Por que as oportunidades estão saindo do funil</h2>
              </div>
            </div>
            <span className="inline-flex min-h-8 w-fit items-center rounded-full border border-card-border bg-surface-container-low px-3 text-xs font-semibold tabular-nums text-outline">
              {totalPerdidos} {totalPerdidos === 1 ? "lead com perda" : "leads com perda"} no período
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-xs leading-5 text-outline">
            Usa o último motivo de perda registrado para cada lead da coorte. O motivo fica na trilha imutável mesmo se a oportunidade for reaberta depois.
          </p>
          <MotivosPerda motivos={motivosPerda} total={totalPerdidos} />
        </CardCorpo>
      </Card>
    </section>
  );
}
