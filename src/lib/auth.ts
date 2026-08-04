import "server-only";

import { cache } from "react";
import { clienteServidor } from "./supabase/server";
import type { UsuarioAtual } from "./perfil";

export type { Papel, UsuarioAtual } from "./perfil";
export { ROTULO_PAPEL } from "./perfil";

/**
 * Usuário da sessão, já com o perfil carregado.
 *
 * Devolve `null` em três casos que a interface trata igual — mandar para fora:
 * sem sessão, sem perfil ou com perfil desativado.
 *
 * `cache` evita repetir a consulta quando vários componentes da mesma página
 * perguntam quem está logado.
 */
export const usuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  const supabase = await clienteServidor();

  // getUser valida o token no servidor do Supabase; getSession só lê o cookie,
  // que o navegador pode ter adulterado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: perfil } = await supabase
    .from("perfis")
    .select("nome, papel, ativo")
    .eq("id", user.id)
    .maybeSingle();

  if (!perfil || !perfil.ativo) return null;

  return {
    id: user.id,
    email: user.email ?? null,
    nome: perfil.nome,
    papel: perfil.papel,
  };
});

export async function ehAdministradora(): Promise<boolean> {
  const usuario = await usuarioAtual();
  return usuario?.papel === "administradora";
}
