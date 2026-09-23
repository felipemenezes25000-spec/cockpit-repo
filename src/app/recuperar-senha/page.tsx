import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { FormularioRecuperacao } from "./formulario-recuperacao";

export const metadata: Metadata = {
  title: "Recuperar senha",
};

export default function PaginaRecuperarSenha() {
  return (
    <AuthShell
      titulo="Recuperar senha"
      descricao="Informe o e-mail do seu acesso. Se houver uma conta correspondente, você receberá um link seguro para criar uma nova senha."
      voltarPara="/entrar"
      rotuloVoltar="Voltar para entrar"
    >
      <FormularioRecuperacao />
    </AuthShell>
  );
}
