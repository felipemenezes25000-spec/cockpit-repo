import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRecuperacao } from "./formulario-recuperacao";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function PaginaRecuperarSenha() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/entrar" className="mb-6 inline-block text-sm font-medium text-primary hover:underline">
          ← Voltar para entrar
        </Link>
        <div className="rounded-[var(--radius-painel)] border border-card-border bg-card p-6 sm:p-8">
          <h1 className="t-headline font-bold text-primary">Recuperar senha</h1>
          <p className="mt-2 mb-6 text-sm text-outline">
            Informe o e-mail do seu acesso ao consultório. Enviaremos um link para criar uma nova senha.
          </p>
          <FormularioRecuperacao />
        </div>
      </div>
    </main>
  );
}
