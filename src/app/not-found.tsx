import { ArrowLeft, Compass, Home } from "lucide-react";
import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-[10%] size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-40 bottom-[-10rem] size-[32rem] rounded-full bg-secondary-fixed/35 blur-3xl" />

      <section className="premium-panel relative isolate w-full max-w-2xl overflow-hidden rounded-[2rem] border px-6 py-10 text-center sm:px-10 sm:py-12">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 h-px bg-white/95" />
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 rounded-full bg-primary-fixed/45 blur-3xl" />

        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-primary-fixed-dim/55 bg-linear-to-br from-white to-primary-fixed/55 text-primary shadow-[var(--shadow-primary)]">
          <Compass aria-hidden="true" size={25} strokeWidth={1.65} />
        </span>

        <p className="rotulo mt-6 text-primary/80">Erro 404</p>
        <h1 className="mx-auto mt-3 max-w-xl text-[clamp(2rem,5vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-on-surface">
          Este endereço não existe no sistema
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-on-surface-variant sm:text-base">
          O módulo pode ter mudado de lugar, o registro pode não estar disponível para o seu perfil ou o endereço foi digitado incorretamente.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-primary/10 bg-primary-container px-5 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary active:translate-y-px active:scale-[0.99]"
          >
            <Home aria-hidden="true" size={16} strokeWidth={1.75} />
            Ir para a Visão Geral
          </Link>
          <Link
            href="/busca"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-card-border/85 bg-surface/75 px-5 text-sm font-semibold text-primary shadow-[var(--shadow-cartao)] transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-primary-fixed-dim hover:bg-surface active:translate-y-px"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Abrir busca global
          </Link>
        </div>
      </section>
    </main>
  );
}
