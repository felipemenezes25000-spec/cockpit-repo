import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-6">
      <div className="max-w-md text-center">
        <p className="rotulo">Página não encontrada</p>
        <h1 className="t-display mt-4 text-primary">
          Este endereço não existe no sistema
        </h1>
        <p className="t-body-lg mt-4 text-on-surface-variant">
          O módulo pode ter mudado de lugar ou ainda não ter sido criado.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex h-11 items-center rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary"
        >
          Ir para a Visão Geral
        </Link>
      </div>
    </main>
  );
}
