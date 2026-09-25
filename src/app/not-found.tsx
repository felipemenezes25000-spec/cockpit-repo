import { ArrowLeft, Compass, Home } from "lucide-react";
import Link from "next/link";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";

export default function NaoEncontrado() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#fbfdff_46%,#f6f9fc_100%)] px-5 py-10">
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-28 size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none -right-44 -bottom-52 size-[34rem] rounded-full bg-informativo-fundo/75 blur-3xl" />

      {/* A 404 abre fora da estrutura do sistema, sem o topo: a marca fica aqui. */}
      <div className="relative"><MarcaComNome tamanho="medio" /></div>
      <section className="premium-panel relative isolate w-full max-w-2xl overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border px-6 py-10 text-center shadow-[0_30px_72px_-54px_rgba(7,57,112,.58)] sm:px-10 sm:py-12">
        <span aria-hidden="true" className="pointer-events-none absolute -top-28 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary-fixed/35 blur-3xl" />

        <span className="relative mx-auto flex size-14 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-primary-fixed text-primary shadow-[0_16px_34px_-26px_rgba(8,84,160,.55)]">
          <Compass aria-hidden="true" size={25} strokeWidth={1.65} />
        </span>

        <p className="rotulo relative mt-6 text-primary">Erro 404</p>
        <h1 className="titulo-tela relative mx-auto mt-2 max-w-xl text-on-surface">
          Este endereço não existe no sistema
        </h1>
        <p className="relative mx-auto mt-4 max-w-lg text-sm leading-6 text-on-surface-variant sm:text-base">
          O módulo pode ter mudado de lugar, o registro pode não estar disponível para o seu perfil ou o endereço foi digitado incorretamente.
        </p>

        <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-5 text-sm font-semibold text-on-primary shadow-[0_14px_30px_-22px_rgba(10,110,209,.65)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-primary-hover active:translate-y-px active:scale-[0.99]"
          >
            <Home aria-hidden="true" size={16} strokeWidth={1.75} />
            Ir para a Visão Geral
          </Link>
          <Link
            href="/busca"
            className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] border border-borda-controle bg-surface px-4 text-sm font-semibold text-primary transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:border-primary-container hover:bg-selecao active:translate-y-px"
          >
            <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
            Abrir busca global
          </Link>
        </div>
      </section>
    </main>
  );
}
