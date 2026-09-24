import { Database, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { FunilVivo } from "@/components/captacao/funil-vivo";
import { InteligenciaCaptacao } from "@/components/captacao/inteligencia-captacao";
import { LeadsDoFunil } from "@/components/captacao/leads-do-funil";
import { MetaFinanceira } from "@/components/captacao/meta-financeira";
import { MetricasCaptacao } from "@/components/captacao/metricas-captacao";
import { PulsoComercial } from "@/components/captacao/pulso-comercial";
import { RitmoDaMeta } from "@/components/captacao/ritmo-da-meta";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { usuarioAtual } from "@/lib/auth";
import { ETAPAS_FUNIL } from "@/lib/captacao";
import { dataParaColuna, lerMes } from "@/lib/periodo";
import { painelCaptacao } from "@/server/consultas/captacao";
import {
  listarLeadsCaptacao,
  type FiltroAtencaoLead,
  type FiltroEtapaLead,
  type PaginaDeLeads,
} from "@/server/consultas/captacao-leads";
import { listarProcedimentos } from "@/server/consultas/procedimentos";

export const metadata: Metadata = {
  title: "Captação",
  description: "Funil comercial, meta financeira, conversão e origem dos novos contatos.",
};

function lerTexto(valor: string | string[] | undefined, limite = 80): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, limite).trim();
}

function lerEtapa(valor: string | string[] | undefined): FiltroEtapaLead {
  const texto = lerTexto(valor, 20);
  return texto === "todos" || (ETAPAS_FUNIL as readonly string[]).includes(texto)
    ? (texto as FiltroEtapaLead)
    : "todos";
}

function lerAtencao(valor: string | string[] | undefined): FiltroAtencaoLead {
  return lerTexto(valor, 20) === "parados" ? "parados" : "todos";
}

const CARTEIRA_VAZIA: PaginaDeLeads = {
  itens: [],
  total: 0,
  pagina: 1,
  paginas: 1,
};

export default async function PaginaCaptacao({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const busca = lerTexto(parametros.busca);
  const etapa = lerEtapa(parametros.etapa);
  const atencao = lerAtencao(parametros.atencao);
  const origemSolicitada = lerTexto(parametros.origem, 60);
  const campanhaSolicitada = lerTexto(parametros.campanha, 120);
  const pagina = Math.max(1, Number(lerTexto(parametros.pagina, 8)) || 1);

  const [painel, procedimentos, usuario] = await Promise.all([
    painelCaptacao(periodo),
    listarProcedimentos(),
    usuarioAtual(),
  ]);

  const origensDisponiveis = painel.origens.map((item) => item.origem);
  const campanhasDisponiveis = painel.campanhas.map((item) => item.campanha);
  const origem = origensDisponiveis.includes(origemSolicitada) ? origemSolicitada : "";
  const campanha = campanhasDisponiveis.includes(campanhaSolicitada) ? campanhaSolicitada : "";

  const carteira = painel.estruturaDisponivel
    ? await listarLeadsCaptacao(periodo, busca, etapa, pagina, origem, campanha, atencao)
    : CARTEIRA_VAZIA;

  const podeEditarLeads = usuario?.papel === "administradora" || usuario?.papel === "recepcao";
  const podeEditarMeta = usuario?.papel === "administradora" || usuario?.papel === "financeiro";
  const metaConfigurada = painel.meta.id !== null;
  const mesDoRecorte = periodo.ehMesAtual ? null : periodo.chave;

  const parametrosPaginacao: Record<string, string> = {};
  if (mesDoRecorte) parametrosPaginacao.mes = mesDoRecorte;
  if (busca) parametrosPaginacao.busca = busca;
  if (etapa !== "todos") parametrosPaginacao.etapa = etapa;
  if (origem) parametrosPaginacao.origem = origem;
  if (campanha) parametrosPaginacao.campanha = campanha;
  if (atencao !== "todos") parametrosPaginacao.atencao = atencao;

  return (
    <div className="flex flex-col gap-5 pb-8 sm:gap-6">
      <CabecalhoDePagina
        icone={Target}
        rotulo="Captação"
        titulo="Meta financeira e funil comercial"
        descricao="Transforme a meta do mês em um plano comercial visível: quantos contatos entram, quantos avançam e quanto ainda falta para fechar."
        meta={
          <>
            <SeloHero tom="informativo"><Sparkles aria-hidden="true" size={13} /> Funil vivo</SeloHero>
            <SeloHero>{painel.vendasNoMes} vendas no período</SeloHero>
            {painel.estruturaDisponivel ? <SeloHero>{carteira.total} leads no recorte</SeloHero> : null}
            {painel.leadsParados > 0 ? <SeloHero tom="atencao">{painel.leadsParados} pedindo atenção</SeloHero> : null}
            {metaConfigurada ? <SeloHero tom="positivo">Meta configurada</SeloHero> : <SeloHero tom="atencao">Meta ainda não definida</SeloHero>}
          </>
        }
      />

      <div className="premium-panel flex flex-col gap-3 rounded-[var(--radius-painel)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="rotulo text-primary">Período comercial</p>
          <p className="mt-1 text-xs text-outline">Ao trocar o mês, os recortes da carteira são limpos porque origem, campanha e paginação pertencem ao período selecionado.</p>
        </div>
        <NavegacaoMes
          periodo={periodo}
          rotulo="Período comercial"
          limparAoTrocar={["pagina", "busca", "etapa", "origem", "campanha", "atencao"]}
        />
      </div>

      {!painel.estruturaDisponivel ? (
        <Card>
          <CardCorpo className="flex min-h-72 flex-col items-center justify-center text-center">
            <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[var(--radius-painel)] bg-atencao-fundo text-atencao">
              <Database size={26} strokeWidth={1.7} />
            </span>
            <h2 className="titulo-secao mt-5 text-on-surface">A estrutura de Captação ainda não foi aplicada ao banco</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">
              O frontend já está pronto, mas as tabelas de leads, histórico de etapas e metas nascem na migração 0029. Aplique as migrações pendentes antes de usar este módulo.
            </p>
            <code className="mt-4 rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3 py-2 text-xs text-primary">npm run db:push</code>
          </CardCorpo>
        </Card>
      ) : (
        <>
          <div className="grid items-stretch gap-5 xl:grid-cols-12">
            <div className="min-w-0 xl:col-span-3">
              <MetaFinanceira
                meta={painel.meta}
                faturamentoAtual={painel.faturamentoAtual}
                plano={painel.plano}
                competencia={dataParaColuna(periodo.de)}
                podeEditar={podeEditarMeta}
              />
            </div>
            <div className="min-w-0 xl:col-span-6">
              <FunilVivo etapas={painel.etapas} />
            </div>
            <div className="min-w-0 xl:col-span-3">
              <MetricasCaptacao
                taxaGeral={painel.taxaConversaoGeral}
                taxaAgendamentoVenda={painel.taxaAgendamentoVendaAtual}
                origens={painel.origens}
                perdidos={painel.perdidos}
              />
            </div>
          </div>

          <PulsoComercial
            faturamentoAtual={painel.faturamentoAtual}
            receitaAtribuida={painel.receitaAtribuida}
            receitaSemAtribuicao={painel.receitaSemAtribuicao}
            percentualReceitaAtribuida={painel.percentualReceitaAtribuida}
            leadsAbertos={painel.leadsAbertos}
            leadsParados={painel.leadsParados}
            mes={mesDoRecorte}
          />

          <RitmoDaMeta
            plano={painel.plano}
            ritmo={painel.ritmo}
            ticketReal={painel.ticketMedioReal}
            ticketPlanejado={painel.meta.ticketMedioPlanejado}
            metaFaturamento={painel.meta.metaFaturamento}
            metaConfigurada={metaConfigurada}
          />

          <InteligenciaCaptacao
            origens={painel.origens}
            campanhas={painel.campanhas}
            gargalo={painel.gargalo}
            metaConfigurada={metaConfigurada}
            motivosPerda={painel.motivosPerda}
            totalPerdidos={painel.perdidos}
            mes={mesDoRecorte}
          />

          <LeadsDoFunil
            leads={carteira.itens}
            procedimentos={procedimentos}
            podeEditar={podeEditarLeads}
            total={carteira.total}
            pagina={carteira.pagina}
            paginas={carteira.paginas}
            busca={busca}
            etapa={etapa}
            parametrosPaginacao={parametrosPaginacao}
          />
        </>
      )}
    </div>
  );
}
