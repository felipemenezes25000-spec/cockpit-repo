"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = {
  erro: string | null;
  /** O e-mail digitado volta para o campo: errar a senha não apaga o resto. */
  email?: string;
};

/** Só aceita caminho interno — impede redirecionar para fora do sistema. */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const caminho = typeof valor === "string" ? valor : "";
  return caminho.startsWith("/") && !caminho.startsWith("//") && !caminho.startsWith("/\\")
    ? caminho.slice(0, 300)
    : "/";
}

/**
 * Por que o login falhou, em frase que ajuda sem entregar nada.
 *
 * Credencial errada tem mensagem única: dizer qual dos dois está errado
 * ajudaria quem estivesse tentando descobrir e-mails válidos. Mas falha do
 * serviço não é credencial errada — dizer "senha incorreta" a quem digitou a
 * senha certa manda a pessoa redefinir uma senha que não tinha problema.
 */
function motivoDaRecusa(erro: { status?: number; code?: string }): string {
  if (erro.code === "email_not_confirmed") {
    return "Este acesso ainda não foi confirmado. Fale com a administradora.";
  }
  if (erro.code === "over_request_rate_limit" || erro.status === 429) {
    return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  }
  if (erro.code === "invalid_credentials" || erro.status === 400) {
    return "E-mail ou senha incorretos.";
  }
  return "O serviço de acesso não respondeu. Tente de novo em instantes.";
}

export async function entrar(
  _anterior: EstadoLogin,
  dados: FormData,
): Promise<EstadoLogin> {
  const email = String(dados.get("email") ?? "").trim().slice(0, 254);
  const senha = String(dados.get("senha") ?? "").slice(0, 200);
  const proximo = destinoSeguro(dados.get("proximo"));

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha.", email };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    const mensagem = motivoDaRecusa(error);
    if (mensagem.startsWith("O serviço")) {
      // Sem dado da pessoa no log: só o que ajuda a investigar o serviço.
      console.error("[cockpit] login: falha do serviço de autenticação", {
        status: error.status ?? null,
        codigo: error.code ?? null,
      });
    }
    return { erro: mensagem, email };
  }

  revalidatePath("/", "layout");
  redirect(proximo);
}

export async function sair() {
  const supabase = await clienteServidor();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/entrar");
}
