import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EstruturaApp } from "@/components/layout/app-shell";
import { usuarioAtual } from "@/lib/auth";

/**
 * A Visão Geral se apoia na data de hoje e na sessão de quem está logado. Sem
 * isto o Next congelaria a tela na data e no usuário do build.
 */
export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const usuario = await usuarioAtual();

  // O middleware já barra quem não tem sessão. Aqui pegamos o caso de ter
  // sessão válida mas perfil desativado — a conta existe e não foi liberada.
  if (!usuario) redirect("/sem-acesso");

  return <EstruturaApp usuario={usuario}>{children}</EstruturaApp>;
}
