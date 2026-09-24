import { ArrowLeft, Compass, Home } from "lucide-react";
import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <section className="premium-panel relative isolate w-full max-w-2xl overflow-hidden rounded-[var(--radius-painel)] border px-6 py-10 text-center sm:px-10 sm:py-12">

        <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-primary-fixed text-primary">
          <Compass aria-hidden="true" size={25} strokeWidth={1.65} />
        </span>

        <p className="rotulo mt-6 text-primary">Erro 404</p>
        <h1 className="titulo-tela mx-auto mt-2 max-w-xl text-on-surface">
          Este endereço não existe no sistema
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-on-surface-variant sm:text-base">
          O módulo pode ter mudado de lugar, o registro pode não estar disponível para o seu perfil ou o endereço foi digitado incorretamente.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-5 text-sm font-semibold text-on-primary transition-[transform,background-color] duration-150 hover:bg-primary-hover active:translate-y-px active:scale-[0.99]"
          >
            <Home aria-hidden="true" size={16} strokeWidth={1.75} />
            Ir para a Visão Geral
          </Link>
          <Link
            href="/busca"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-borda-controle bg-surface px-4 text-sm font-semibold text-primary transition-colors hover:border-primary-container hover:bg-selecao active:translate-y-px"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Abrir busca global
          </Link>
        </div>
      </section>
    </main>
  );
}
