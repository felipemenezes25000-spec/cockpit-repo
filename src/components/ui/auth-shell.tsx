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
  const recursos = [
    [CalendarDays, "Agenda e pacientes", "O dia da clínica com contexto operacional."],
    [FileText, "Registros versionados", "Prontuários e documentos com histórico preservado."],
    [ShieldCheck, "Acesso protegido", "Permissões e dados sensíveis tratados por perfil."],
  ] as const;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-[8%] size-[32rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-36 bottom-[-10rem] size-[34rem] rounded-full bg-secondary-fixed/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.28] [background-image:linear-gradient(rgba(8,84,160,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(8,84,160,0.045)_1px,transparent_1px)] [background-size:52px_52px] [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />

      <div className="page-reveal relative mx-auto grid min-h-[calc(100vh-3rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-card-border/70 bg-surface/72 shadow-[0_36px_100px_-50px_rgba(8,41,76,0.48),inset_0_1px_0_rgba(255,255,255,0.96)] backdrop-blur-xl lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative hidden overflow-hidden bg-[linear-gradient(145deg,var(--color-primary),#07447f_58%,var(--color-primary-container))] p-10 text-on-primary lg:flex lg:flex-col lg:justify-between">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full border border-white/15 bg-white/8 blur-sm" />
          <div aria-hidden="true" className="pointer-events-none absolute top-[18%] right-[8%] size-44 rounded-full border border-white/8" />
          <div aria-hidden="true" className="pointer-events-none absolute top-[22%] right-[12%] size-28 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-24 size-96 rounded-full bg-white/8 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/55 to-transparent" />

          <div className="relative z-[1]">
            <span className="relative flex size-14 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/12 text-base font-bold tracking-[-0.02em] shadow-[0_14px_34px_-18px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
              <span aria-hidden="true" className="absolute -right-4 -bottom-5 size-12 rounded-full bg-white/14 blur-xl" />
              <span className="relative">ÉP</span>
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
            {recursos.map(([Icone, tituloItem, descricaoItem], indice) => (
              <div
                key={tituloItem}
                style={{ animationDelay: `${150 + indice * 90}ms` }}
                className="dashboard-stagger group flex items-start gap-3 rounded-2xl border border-white/14 bg-white/8 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm transition-[transform,background-color,border-color] duration-200 hover:translate-x-1 hover:border-white/22 hover:bg-white/11"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/12 transition-transform duration-200 group-hover:scale-[1.05]">
                  <Icone aria-hidden="true" size={17} strokeWidth={1.7} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-on-primary">{tituloItem}</p>
                  <p className="mt-0.5 text-xs leading-5 text-on-primary/68">{descricaoItem}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center px-5 py-8 sm:px-9 lg:px-12">
          <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 size-52 rounded-full bg-primary-fixed/20 blur-3xl lg:hidden" />
          <div className="relative w-full max-w-md">
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

            <div className="premium-panel relative overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border p-6 sm:p-8">
              <span aria-hidden="true" className="pointer-events-none absolute -top-16 -right-12 size-36 rounded-full bg-primary-fixed/36 blur-3xl" />
              <div className="relative">
                <p className="rotulo text-primary/80">Acesso seguro</p>
                <h2 className="mt-2 text-[clamp(1.7rem,4vw,2.35rem)] leading-[1.08] font-semibold tracking-[-0.04em] text-on-surface">{titulo}</h2>
                <p className="mt-2 mb-6 text-sm leading-6 text-on-surface-variant">{descricao}</p>
                {children}
              </div>
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
