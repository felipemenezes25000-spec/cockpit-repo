import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { AcoesRapidas } from "@/components/overview/quick-actions";
import { Aniversariantes } from "@/components/overview/birthdays-panel";
import { CartoesIndicadores } from "@/components/overview/metric-cards";
import { LinhaDoDia } from "@/components/overview/day-rail";
import { PendenciasDaClinica } from "@/components/overview/pending-list";
import { ProximosRetornos } from "@/components/overview/returns-panel";
import { ResumoFinanceiro } from "@/components/overview/finance-summary";
import { usuarioAtual } from "@/lib/auth";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

export const metadata: Metadata = {
  title: "Visão Geral",
  description: "O dia da clínica em uma tela: atendimentos, pendências, retornos e resultados.",
};

export default async function PaginaVisaoGeral() {
  const [exemplo, usuario] = await Promise.all([temDadosDeExemplo(), usuarioAtual()]);
  const primeiroNome = usuario?.nome.trim().split(/\s+/)[0] ?? "equipe";

  return (
    <div className="pb-8">
      <section className="premium-panel relative mb-5 overflow-hidden rounded-[24px] border px-4 py-5 sm:px-6 sm:py-6 lg:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -top-28 right-[-4rem] size-72 rounded-full bg-primary-fixed/50 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-[28%] size-56 rounded-full bg-secondary-fixed/40 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-[10px] border border-primary/10 bg-white/70 px-2.5 py-1.5 text-xs font-semibold text-primary shadow-[var(--shadow-cartao)]">
              <Sparkles aria-hidden="true" size={14} strokeWidth={1.7} />
              Cockpit operacional
            </div>
            <h2 className="text-[1.75rem] leading-[1.08] font-semibold tracking-[-0.045em] text-on-surface sm:text-[2.15rem]">Tudo que pede atenção, em um só lugar.</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant sm:text-[0.95rem]">{primeiroNome}, acompanhe o ritmo da clínica e entre direto no próximo fluxo sem perder contexto.</p>
          </div>
          <div className="xl:max-w-[58%]"><AcoesRapidas papel={usuario?.papel ?? "recepcao"} /></div>
        </div>
      </section>

      <div className="mb-7"><CartoesIndicadores exemplo={exemplo} /></div>

      <div className="grid grid-cols-1 items-start gap-6 pb-5 xl:grid-cols-12">
        <div className="flex flex-col gap-6 xl:col-span-8">
          <LinhaDoDia />
          <ResumoFinanceiro exemplo={exemplo} />
          <Aniversariantes />
        </div>
        <div className="flex flex-col gap-6 xl:col-span-4">
          <PendenciasDaClinica />
          <ProximosRetornos />
        </div>
      </div>
    </div>
  );
}
