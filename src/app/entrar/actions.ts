"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clienteServidor } from "@/lib/supabase/server";

export type EstadoLogin = { erro: string | null };

/** Só aceita caminho interno — impede redirecionar para fora do sistema. */
function destinoSeguro(valor: FormDataEntryValue | null): string {
  const caminho = typeof valor === "string" ? valor : "";
  return caminho.startsWith("/") && !caminho.startsWith("//") ? caminho : "/";
}

export async function entrar(
  _anterior: EstadoLogin,
  dados: FormData,
): Promise<EstadoLogin> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  const proximo = destinoSeguro(dados.get("proximo"));

  if (!email || !senha) {
    return { erro: "Preencha e-mail e senha." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha,
  });

  if (error) {
    // Mensagem única para credencial errada: dizer qual dos dois está errado
    // ajudaria quem estivesse tentando descobrir e-mails válidos.
    return { erro: "E-mail ou senha incorretos." };
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
