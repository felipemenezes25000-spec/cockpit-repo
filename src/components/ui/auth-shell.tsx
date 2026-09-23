import { CalendarDays, FileText, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { LinkDeVoltar } from "@/components/ui/page-hero";

export function AuthShell({
  titulo,
  descricao,
  children,
  voltarPara,
  rotuloVoltar,
}: {
  titulo: string;
  descricao: string;
  children: ReactNode;
  voltarPara?: string;
  rotuloVoltar?: string;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-[8%] size-[32rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 bottom-[-10rem] size-[34rem] rounded-full bg-secondary-fixed/35 blur-3xl" />

      <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-card-border/70 bg-surface/72 shadow-[0_32px_90px_-48px_rgba(8,41,76,0.42),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-linear-to-br from-primary via-primary to-primary-container p-10 text-on-primary lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full border border-white/15 bg-white/8 blur-sm" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-24 size-96 rounded-full bg-white/8 blur-3xl" />

          <div className="relative z-[1]">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-white/20 bg-white/12 text-base font-bold tracking-[-0.02em] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md">
              ÉP
            </span>
            <p className="mt-6 text-sm font-semibold tracking-[0.08em] text-on-primary/75 uppercase">Cockpit do consultório</p>
            <h1 className="mt-3 max-w-md text-[clamp(2.4rem,5vw,4.2rem)] leading-[0.98] font-semibold tracking-[-0.055em]">
              Dra. Érika Passos
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-on-primary/78">
              Operação clínica, agenda, pacientes, documentos e financeiro em um ambiente único e protegido.
            </p>
          </div>

          <div className="relative z-[1] grid gap-3">
            {[
              [CalendarDays, "Agenda e pacientes", "O dia da clínica com contexto operacional."],
              [FileText, "Registros versionados", "Prontuários e documentos com histórico preservado."],
              [ShieldCheck, "Acesso protegido", "Permissões e dados sensíveis tratados por perfil."],
            ].map(([Icone, tituloItem, descricaoItem]) => {
              const Componente = Icone as typeof CalendarDays;
              return (
                <div key={String(tituloItem)} className="flex items-start gap-3 rounded-2xl border border-white/14 bg-white/8 px-4 py-3.5 backdrop-blur-sm">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/12">
                    <Componente aria-hidden="true" size={17} strokeWidth={1.7} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-on-primary">{tituloItem as string}</p>
                    <p className="mt-0.5 text-xs leading-5 text-on-primary/68">{descricaoItem as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-8 sm:px-9 lg:px-12">
          <div className="w-full max-w-md">
            {voltarPara ? (
              <LinkDeVoltar href={voltarPara} className="mb-6">
                {rotuloVoltar ?? "Voltar"}
              </LinkDeVoltar>
            ) : null}

            <div className="mb-7 lg:hidden">
              <span className="flex size-12 items-center justify-center rounded-2xl border border-primary-fixed-dim/55 bg-primary-fixed/60 text-sm font-bold text-primary shadow-[var(--shadow-primary)]">ÉP</span>
              <p className="mt-4 text-sm font-semibold text-primary">Dra. Érika Passos</p>
              <p className="text-xs text-outline">Cockpit do consultório</p>
            </div>

            <div className="premium-panel rounded-[calc(var(--radius-painel)+4px)] border p-6 sm:p-8">
              <p className="rotulo text-primary/80">Acesso seguro</p>
              <h2 className="mt-2 text-[clamp(1.7rem,4vw,2.35rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-on-surface">{titulo}</h2>
              <p className="mt-2 mb-6 text-sm leading-6 text-on-surface-variant">{descricao}</p>
              {children}
            </div>

            <p className="mt-5 text-center text-xs leading-5 text-outline">
              Ambiente interno do consultório. O acesso depende de conta ativa e permissões válidas.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
