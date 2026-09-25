import { BarChart3, CheckCircle2, DatabaseZap, MessagesSquare, Target } from "lucide-react";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { SeloHero } from "@/components/ui/page-hero";

const MIGRACOES = [
  {
    codigo: "0029",
    arquivo: "0029_captacao_e_metas.sql",
    titulo: "Funil e metas",
    descricao: "Cria leads, histórico de etapas, metas financeiras e a base do funil comercial.",
    icone: Target,
  },
  {
    codigo: "0030",
    arquivo: "0030_contatos_comerciais.sql",
    titulo: "Contatos comerciais",
    descricao: "Estrutura os contatos e retornos para que a carteira registre a conversa, não apenas a etapa.",
    icone: MessagesSquare,
  },
  {
    codigo: "0031",
    arquivo: "0031_acompanhamento_comercial_conferido.sql",
    titulo: "Acompanhamento conferido",
    descricao: "Fecha regras, integridade e automações para o acompanhamento comercial operar com segurança.",
    icone: CheckCircle2,
  },
] as const;

export function EstruturaPendenteCaptacao() {
  return (
    <Card>
      <CardCabecalho
        titulo="A estrutura comercial ainda não foi publicada"
        descricao="O frontend da Captação já está pronto. Para liberar funil, carteira, metas e histórico comercial, o banco precisa receber as três migrações finais do módulo."
        acao={<SeloHero tom="atencao"><DatabaseZap aria-hidden="true" size={13} />3 migrações pendentes</SeloHero>}
      />
      <CardCorpo className="flex flex-col gap-6 py-6 sm:py-7">
        <div className="grid gap-3 lg:grid-cols-3">
          {MIGRACOES.map((migracao) => {
            const Icone = migracao.icone;
            return (
              <article key={migracao.codigo} className="premium-interactive relative overflow-hidden rounded-[var(--radius-painel)] border border-card-border bg-surface p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-painel)] border border-atencao-borda bg-atencao-fundo text-atencao">
                    <Icone aria-hidden="true" size={18} strokeWidth={1.7} />
                  </span>
                  <span className="tabular rounded-full border border-card-border bg-surface-container-low px-2.5 py-1 text-[0.64rem] font-bold tracking-[0.08em] text-outline">{migracao.codigo}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-on-surface">{migracao.titulo}</h3>
                <p className="mt-1.5 text-xs leading-5 text-outline">{migracao.descricao}</p>
                <code className="mt-4 block overflow-x-auto rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-3 py-2 text-[0.67rem] leading-5 text-on-surface-variant">{migracao.arquivo}</code>
              </article>
            );
          })}
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex items-start gap-3 rounded-[var(--radius-painel)] border border-informativo-borda bg-informativo-fundo px-4 py-3.5 text-sm leading-6 text-on-surface-variant">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-informativo-borda bg-surface/70 text-informativo-texto">
              <BarChart3 aria-hidden="true" size={16} strokeWidth={1.7} />
            </span>
            <p><strong className="font-semibold text-on-surface">Sem dado fictício.</strong> Enquanto a estrutura não estiver no banco, o Cockpit não inventa leads, taxas ou metas para preencher a tela.</p>
          </div>
          <code className="rounded-[var(--radius-controle)] border border-primary-fixed-dim bg-selecao px-4 py-3 text-center text-xs font-semibold text-primary">npm run db:push</code>
        </div>
      </CardCorpo>
    </Card>
  );
}
