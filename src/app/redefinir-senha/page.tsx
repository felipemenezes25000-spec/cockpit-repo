import type { Metadata } from "next";
import { AuthShell } from "@/components/ui/auth-shell";
import { FormularioNovaSenha } from "./formulario-nova-senha";

export const metadata: Metadata = {
  title: "Definir nova senha",
};

export default function PaginaRedefinirSenha() {
  return (
    <AuthShell
      titulo="Definir nova senha"
      descricao="Escolha uma nova senha para o seu acesso ao consultório. O link é validado antes de qualquer alteração."
      voltarPara="/entrar"
      rotuloVoltar="Voltar para entrar"
    >
      <FormularioNovaSenha />
    </AuthShell>
  );
}
