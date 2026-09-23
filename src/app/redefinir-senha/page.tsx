import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormularioNovaSenha } from "./formulario-nova-senha";

export const metadata: Metadata = {
  title: "Definir nova senha",
};

export default function PaginaRedefinirSenha() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/entrar" className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm font-medium text-primary hover:underline">
          <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
          Voltar para entrar
        </Link>
        <div className="rounded-[var(--radius-painel)] border border-card-border bg-card p-6 sm:p-8">
          <h1 className="t-headline font-bold text-primary">Definir nova senha</h1>
          <p className="mt-2 mb-6 text-sm text-outline">
            Escolha uma senha nova para o seu acesso ao consultório.
          </p>
          <FormularioNovaSenha />
        </div>
      </div>
    </main>
  );
}
