import type { Metadata } from "next";
import { MoonStar, Sparkles, SunMedium, Sunset } from "lucide-react";
import { AcoesRapidas } from "@/components/overview/quick-actions";
import { Aniversariantes } from "@/components/overview/birthdays-panel";
import { CartoesIndicadores } from "@/components/overview/metric-cards";
import { LinhaDoDia } from "@/components/overview/day-rail";
import { PendenciasDaClinica } from "@/components/overview/pending-list";
import { ProximosRetornos } from "@/components/overview/returns-panel";
import { ResumoFinanceiro } from "@/components/overview/finance-summary";
import { usuarioAtual } from "@/lib/auth";
import { FUSO_CLINICA } from "@/lib/dates";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";

export const metadata: Metadata = {
  title: "Visão Geral",
  description: "O dia da clínica em uma tela: atendimentos, pendências, retornos e resultados.",
};

function contextoDoDia() {
  const hora = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: FUSO_CLINICA,
    hour: "2-digit",
    hour12: false,
  }).format(new Date())) % 24;

  if (hora < 12) return { saudacao: "Bom dia", icone: SunMedium };
  if (hora < 18) return { saudacao: "Boa tarde", icone: Sunset };
  return { saudacao: "Boa noite", icone: MoonStar };
}

export default async function PaginaVisaoGeral() {
  const [exemplo, usuario] = await Promise.all([temDadosDeExemplo(), usuarioAtual()]);
  const primeiroNome = usuario?.nome.trim().split(/\s+/)[0] ?? "equipe";
  const contexto = contextoDoDia();
  const IconePeriodo = contexto.icone;

  return (
    <div className="pb-8">
      <section className="premium-panel group relative mb-5 overflow-hidden rounded-[26px] border px-4 py-5 transition-[box-shadow,border-color] duration-300 hover:border-primary/12 hover:shadow-[var(--shadow-realce)] sm:px-6 sm:py-6 lg:px-7">
        <div aria-hidden="true" className="pointer-events-none absolute -top-28 right-[-4rem] size-72 rounded-full bg-primary-fixed/50 blur-3xl motion-safe:animate-[pulse_8s_ease-in-out_infinite]" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 left-[28%] size-56 rounded-full bg-secondary-fixed/40 blur-3xl motion-safe:animate-[pulse_11s_ease-in-out_infinite]" />
        <Sparkles aria-hidden="true" strokeWidth={0.7} className="pointer-events-none absolute -right-10 -bottom-12 size-52 text-primary/[0.035] transition-transform duration-700 group-hover:-translate-x-2 group-hover:-translate-y-2 group-hover:scale-[1.04]" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-12 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.98),transparent)]" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-[11px] border border-primary/10 bg-white/72 px-2.5 py-1.5 text-xs font-semibold text-primary shadow-[var(--shadow-cartao)] backdrop-blur-sm">
                <Sparkles aria-hidden="true" size={14} strokeWidth={1.7} />
                Cockpit operacional
              </span>
              <span className="inline-flex items-center gap-2 rounded-[11px] border border-card-border/80 bg-white/56 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-sm">
                <IconePeriodo aria-hidden="true" size={14} strokeWidth={1.7} className="text-primary" />
                {contexto.saudacao}, {primeiroNome}
              </span>
            </div>

            <h2 className="text-[1.8rem] leading-[1.05] font-semibold tracking-[-0.05em] text-on-surface sm:text-[2.25rem] lg:text-[2.45rem]">
              Tudo que pede atenção, em um só lugar.
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant sm:text-[0.96rem]">
              Acompanhe o ritmo da clínica e entre direto no próximo fluxo sem perder contexto.
            </p>
          </div>

          <div className="xl:max-w-[58%]">
            <AcoesRapidas papel={usuario?.papel ?? "recepcao"} />
          </div>
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
