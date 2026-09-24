import { DatabaseZap, Sparkles, Target } from "lucide-react";
import type { Metadata } from "next";
import { FunilVivo } from "@/components/captacao/funil-vivo";
import { LeadsDoFunil } from "@/components/captacao/leads-do-funil";
import { MetaFinanceira } from "@/components/captacao/meta-financeira";
import { MetricasCaptacao } from "@/components/captacao/metricas-captacao";
import { RitmoDaMeta } from "@/components/captacao/ritmo-da-meta";
import { NavegacaoMes } from "@/components/financeiro/navegacao-mes";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { usuarioAtual } from "@/lib/auth";
import { dataParaColuna, lerMes } from "@/lib/periodo";
import { painelCaptacao } from "@/server/consultas/captacao";
import { listarProcedimentos } from "@/server/consultas/procedimentos";

export const metadata: Metadata = {
  title: "Captação",
  description: "Funil comercial, meta financeira, conversão e origem dos novos contatos.",
};

export default async function PaginaCaptacao({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const periodo = lerMes(parametros.mes);
  const [painel, procedimentos, usuario] = await Promise.all([
    painelCaptacao(periodo),
    listarProcedimentos(),
    usuarioAtual(),
  ]);

  const podeEditarLeads = usuario?.papel === "administradora" || usuario?.papel === "recepcao";
  const podeEditarMeta = usuario?.papel === "administradora" || usuario?.papel === "financeiro";

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
            {painel.meta.id ? <SeloHero tom="positivo">Meta configurada</SeloHero> : <SeloHero tom="atencao">Meta ainda não definida</SeloHero>}
          </>
        }
      />

      <div className="premium-panel flex flex-col gap-3 rounded-[var(--radius-painel)] border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <p className="rotulo text-primary">Período comercial</p>
          <p className="mt-1 text-xs text-outline">O mês fica na URL para comparar, recarregar e compartilhar a mesma leitura.</p>
        </div>
        <NavegacaoMes periodo={periodo} rotulo="Período comercial" />
      </div>

      {!painel.estruturaDisponivel ? (
        <Card>
          <CardCorpo className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
            <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-[var(--radius-painel)] bg-atencao-fundo text-atencao">
              <DatabaseZap size={26} strokeWidth={1.7} />
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

          <RitmoDaMeta
            plano={painel.plano}
            ticketReal={painel.ticketMedioReal}
            ticketPlanejado={painel.meta.ticketMedioPlanejado}
          />

          <LeadsDoFunil
            leads={painel.leadsRecentes}
            procedimentos={procedimentos}
            podeEditar={podeEditarLeads}
          />
        </>
      )}
    </div>
  );
}
