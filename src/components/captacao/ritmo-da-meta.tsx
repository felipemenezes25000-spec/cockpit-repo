import {
  ArrowRight,
  CalendarDays,
  CalendarPlus2,
  CircleDollarSign,
  Crosshair,
  Gauge,
  TrendingUp,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { Card, CardCorpo } from "@/components/ui/card";
import { formatarMoeda } from "@/lib/format";
import type { PlanoDaMeta, RitmoMensal } from "@/lib/captacao";

function Numero({
  rotulo,
  valor,
  icone: Icone,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  icone: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-[var(--radius-cartao)] px-3 py-3 sm:px-4">
      <span
        aria-hidden="true"
        className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] ${
          destaque ? "bg-primary-container text-on-primary" : "bg-primary-fixed text-primary"
        }`}
      >
        <Icone size={18} strokeWidth={1.8} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold tracking-[0.06em] text-outline uppercase">{rotulo}</p>
        <p
          className={`mt-0.5 break-words text-xl font-semibold tracking-[-0.03em] tabular-nums ${
            destaque ? "text-primary" : "text-on-surface"
          }`}
        >
          {valor}
        </p>
      </div>
    </div>
  );
}

function BlocoRitmo({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  destaque = false,
}: {
  rotulo: string;
  valor: string;
  detalhe: string;
  icone: LucideIcon;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-[var(--radius-cartao)] border p-4 ${
        destaque
          ? "border-primary-fixed bg-selecao"
          : "border-card-border bg-surface-container-low"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.67rem] font-semibold tracking-[0.065em] text-outline uppercase">{rotulo}</p>
          <p
            className={`mt-2 text-2xl font-semibold tracking-[-0.04em] tabular-nums sm:text-[1.7rem] ${
              destaque ? "text-primary" : "text-on-surface"
            }`}
          >
            {valor}
          </p>
        </div>
        <span
          aria-hidden="true"
          className={`flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-controle)] ${
            destaque ? "bg-primary-container text-on-primary" : "bg-surface text-primary"
          }`}
        >
          <Icone size={17} strokeWidth={1.8} />
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-outline">{detalhe}</p>
    </div>
  );
}

function textoDecimal(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(valor);
}

export function RitmoDaMeta({
  plano,
  ritmo,
  ticketReal,
  ticketPlanejado,
  metaFaturamento,
  metaConfigurada,
}: {
  plano: PlanoDaMeta;
  ritmo: RitmoMensal;
  ticketReal: number;
  ticketPlanejado: number;
  metaFaturamento: number;
  metaConfigurada: boolean;
}) {
  const atual = ritmo.situacao === "atual";
  const passado = ritmo.situacao === "passado";
  const tituloProjecao = passado
    ? "Resultado do mês"
    : atual
      ? "Projeção no ritmo atual"
      : metaConfigurada
        ? "Meta planejada"
        : "Período futuro";
  const valorProjecao = passado || atual ? ritmo.projecaoFaturamento : metaFaturamento;
  const percentualProjetado = Math.round(ritmo.projecaoPercentualMeta);
  const vazio = "—";

  return (
    <Card>
      <CardCorpo className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 border-b border-card-border pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="rotulo text-primary">Ritmo do mês</p>
              <span
                className={`inline-flex min-h-6 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${
                  !metaConfigurada
                    ? "border-atencao-borda bg-atencao-fundo text-atencao"
                    : atual
                      ? "border-informativo-borda bg-informativo-fundo text-informativo-texto"
                      : passado
                        ? "border-card-border bg-surface-container-low text-outline"
                        : "border-atencao-borda bg-atencao-fundo text-atencao"
                }`}
              >
                {!metaConfigurada ? "aguardando meta" : atual ? "em andamento" : passado ? "mês encerrado" : "planejamento futuro"}
              </span>
            </div>
            <h2 className="titulo-secao mt-1.5">
              {metaConfigurada ? "A meta virou uma cadência operacional" : "O realizado já existe; falta definir o alvo"}
            </h2>
            <p className="mt-1 text-xs leading-5 text-outline">
              {!metaConfigurada
                ? "O Cockpit consegue projetar o faturamento já realizado, mas só calcula ritmo, vendas e leads necessários depois que a meta for salva."
                : atual
                  ? "A projeção estende a média realizada até hoje; é ritmo de execução, não previsão estatística."
                  : passado
                    ? "O mês já terminou: a leitura abaixo preserva o resultado final e o funil que foi necessário."
                    : "Para um mês futuro, o Cockpit distribui a meta e o esforço comercial ao longo de todos os dias do período."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-[var(--radius-cartao)] border border-card-border bg-surface-container-low px-4 py-3">
            <Gauge aria-hidden="true" size={18} className="text-primary" />
            <div>
              <p className="text-[0.65rem] font-semibold tracking-[0.06em] text-outline uppercase">Ticket real / planejado</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums text-on-surface">
                {formatarMoeda(ticketReal)} <span className="font-normal text-outline">/ {metaConfigurada ? formatarMoeda(ticketPlanejado) : vazio}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BlocoRitmo
            rotulo={tituloProjecao}
            valor={!metaConfigurada && ritmo.situacao === "futuro" ? vazio : formatarMoeda(valorProjecao)}
            detalhe={
              !metaConfigurada
                ? atual
                  ? "Projeção do faturamento realizado até hoje, ainda sem comparação com uma meta."
                  : passado
                    ? "Resultado financeiro do período, ainda sem meta cadastrada para comparação."
                    : "Defina a meta deste mês para transformar o período futuro em planejamento comercial."
                : atual && metaFaturamento > 0
                  ? `${percentualProjetado}% da meta se o ritmo médio do mês continuar.`
                  : passado && metaFaturamento > 0
                    ? `${percentualProjetado}% da meta mensal realizada.`
                    : `Alvo financeiro distribuído em ${ritmo.diasNoMes} dias.`
            }
            icone={TrendingUp}
            destaque={metaConfigurada && atual && metaFaturamento > 0 && ritmo.projecaoFaturamento >= metaFaturamento}
          />
          <BlocoRitmo
            rotulo={passado ? "Gap final" : "Ritmo financeiro"}
            valor={
              !metaConfigurada
                ? vazio
                : passado
                  ? formatarMoeda(plano.gapFinanceiro)
                  : `${formatarMoeda(ritmo.ritmoFinanceiroDia)}/dia`
            }
            detalhe={
              !metaConfigurada
                ? "Disponível depois de definir a meta financeira do período."
                : passado
                  ? plano.gapFinanceiro > 0
                    ? "Diferença entre o realizado e a meta encerrada."
                    : "A meta foi alcançada ou superada."
                  : `Gap atual de ${formatarMoeda(plano.gapFinanceiro)} distribuído pelo restante do mês.`
            }
            icone={CircleDollarSign}
            destaque={metaConfigurada && !passado && plano.gapFinanceiro > 0}
          />
          <BlocoRitmo
            rotulo={passado ? "Vendas necessárias" : "Cadência comercial"}
            valor={
              !metaConfigurada
                ? vazio
                : passado
                  ? `${plano.vendasNecessarias}`
                  : `${textoDecimal(ritmo.vendasPorDia)} vendas/dia`
            }
            detalhe={
              !metaConfigurada
                ? "Ticket e taxas de conversão entram no cálculo depois que a meta for configurada."
                : passado
                  ? "Leitura do gap usando o ticket planejado configurado."
                  : `${textoDecimal(ritmo.leadsPorDia)} leads/dia no topo com as taxas planejadas atuais.`
            }
            icone={Crosshair}
          />
          <BlocoRitmo
            rotulo={passado ? "Período" : "Tempo restante"}
            valor={passado ? `${ritmo.diasNoMes} dias` : `${ritmo.diasRestantes} dias`}
            detalhe={
              passado
                ? "Quantidade de dias do mês encerrado."
                : atual
                  ? "Inclui hoje; não presume feriados ou dias de funcionamento da clínica."
                  : "Dias disponíveis no mês planejado."
            }
            icone={CalendarDays}
          />
        </div>

        <div className="rounded-[var(--radius-painel)] border border-card-border bg-surface-container-low p-3 sm:p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="shrink-0 px-2 py-2 xl:w-48">
              <p className="rotulo text-primary">Funil inverso</p>
              <p className="mt-1 text-xs leading-5 text-outline">
                {metaConfigurada
                  ? "O esforço restante sobe da receita até a entrada de novos contatos."
                  : "Salve a meta para o Cockpit calcular o esforço necessário em cada etapa."}
              </p>
            </div>

            <ArrowRight aria-hidden="true" size={18} className="hidden shrink-0 text-outline xl:block" />

            <div className="grid min-w-0 flex-1 grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-5">
              <Numero rotulo="Gap financeiro" valor={metaConfigurada ? formatarMoeda(plano.gapFinanceiro) : vazio} icone={CircleDollarSign} />
              <Numero rotulo="Vendas" valor={metaConfigurada ? `+${plano.vendasNecessarias.toLocaleString("pt-BR")}` : vazio} icone={Crosshair} />
              <Numero rotulo="Agendamentos" valor={metaConfigurada ? `+${plano.agendamentosNecessarios.toLocaleString("pt-BR")}` : vazio} icone={CalendarPlus2} />
              <Numero rotulo="Qualificados" valor={metaConfigurada ? `+${plano.qualificadosNecessarios.toLocaleString("pt-BR")}` : vazio} icone={UsersRound} />
              <Numero rotulo="Leads" valor={metaConfigurada ? `+${plano.leadsNecessarios.toLocaleString("pt-BR")}` : vazio} icone={UsersRound} destaque={metaConfigurada} />
            </div>
          </div>
        </div>
      </CardCorpo>
    </Card>
  );
}
