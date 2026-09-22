import type { Metadata } from "next";
import { FormularioLogin } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesso ao sistema de gestão do consultório.",
};

export default async function PaginaEntrar({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; senha?: string }>;
}) {
  const { proximo, senha } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <span
            aria-hidden="true"
            className="mb-5 flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-secondary-fixed text-sm font-bold text-primary"
          >
            ÉP
          </span>
          <h1 className="t-headline font-bold text-primary">Dra. Érika Passos</h1>
          <p className="rotulo mt-1">Consultório de estética</p>
        </div>

        <div className="rounded-[var(--radius-painel)] border border-card-border bg-card p-6 sm:p-8">
          <h2 className="mb-1 font-medium text-on-surface">Entrar no sistema</h2>
          <p className="mb-6 text-sm text-outline">
            Use o e-mail cadastrado pela clínica.
          </p>

          {senha === "alterada" ? (
            <p role="status" className="mb-5 rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo px-3.5 py-2.5 text-sm text-positivo">
              Senha alterada. Entre com sua nova senha.
            </p>
          ) : null}

          <FormularioLogin proximo={proximo ?? "/"} />
        </div>

        <p className="mt-6 text-center text-xs text-outline">
          O acesso é criado pela administradora. Se você ainda não tem login, fale
          com a recepção.
        </p>
      </div>
    </main>
  );
}
