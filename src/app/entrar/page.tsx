import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { destinoSeguro } from "./destino";
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
    <AuthShell
      titulo="Entrar no sistema"
      descricao="Use o e-mail cadastrado pela clínica para acessar sua área de trabalho."
    >
      {senha === "alterada" ? (
        <p role="status" className="mb-5 rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo px-3.5 py-3 text-sm text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
          Senha alterada. Entre com sua nova senha.
        </p>
      ) : null}

      <FormularioLogin proximo={destinoSeguro(proximo)} />
    </AuthShell>
  );
}
