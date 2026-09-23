"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import { destinoSeguro } from "./destino";

export type EstadoLogin = {
  erro: string | null;
  /** O e-mail digitado volta para o campo: errar a senha não apaga o resto. */
  email?: string;
  /**
   * Os campos que a pessoa precisa corrigir. Falha do serviço, limite de
   * tentativas e acesso não confirmado não marcam nada: o que foi digitado
   * pode estar certo, e borda vermelha mandaria redigitar à toa.
   */
  invalidos?: CampoLogin[];
};

export type CampoLogin = "email" | "senha";

/**
 * Por que o login falhou, em frase que ajuda sem entregar nada.
 *
 * Credencial errada tem mensagem única: dizer qual dos dois está errado
 * ajudaria quem estivesse tentando descobrir e-mails válidos. Mas falha do
 * serviço não é credencial errada — dizer "senha incorreta" a quem digitou a
 * senha certa manda a pessoa redefinir uma senha que não tinha problema.
 */
function motivoDaRecusa(erro: { status?: number; code?: string }): {
  mensagem: string;
  invalidos: CampoLogin[];
  doServico: boolean;
} {
  if (erro.code === "email_not_confirmed") {
    return {
      mensagem: "Este acesso ainda não foi confirmado. Fale com a administradora.",
      invalidos: [],
      doServico: false,
    };
  }
  if (erro.code === "over_request_rate_limit" || erro.status === 429) {
    return {
      mensagem: "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.",
      invalidos: [],
      doServico: false,
    };
  }
  if (erro.code === "invalid_credentials" || erro.status === 400) {
    return {
      mensagem: "E-mail ou senha incorretos.",
      invalidos: ["email", "senha"],
      doServico: false,
    };
  }
  return {
    mensagem: "O serviço de acesso não respondeu. Tente de novo em instantes.",
    invalidos: [],
    doServico: true,
  };
}

export async function entrar(
  _anterior: EstadoLogin,
  dados: FormData,
): Promise<EstadoLogin> {
  const email = String(dados.get("email") ?? "").trim().slice(0, 254);
  const senha = String(dados.get("senha") ?? "").slice(0, 200);
  const proximo = destinoSeguro(dados.get("proximo"));

  if (!email || !senha) {
    const invalidos: CampoLogin[] = [];
    if (!email) invalidos.push("email");
    if (!senha) invalidos.push("senha");
    return { erro: "Preencha e-mail e senha.", email, invalidos };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    const { mensagem, invalidos, doServico } = motivoDaRecusa(error);
    if (doServico) {
      // Sem dado da pessoa no log: só o que ajuda a investigar o serviço. A
      // mensagem do Auth não entra — pode trazer o e-mail digitado.
      registrarFalha("login: falha do serviço de autenticação", {
        code: error.code ?? null,
        message: `status ${error.status ?? "desconhecido"}`,
      });
    }
    return { erro: mensagem, email, invalidos };
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
