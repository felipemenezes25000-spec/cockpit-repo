import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EstruturaApp } from "@/components/layout/app-shell";
import { usuarioAtual } from "@/lib/auth";
import { pendenciasAbertas } from "@/server/consultas/pendencias";

/**
 * As telas dependem da data de hoje e da sessão de quem está logado. Sem isto
 * o Next congelaria tudo no momento do build.
 */
export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: ReactNode }) {
  const usuario = await usuarioAtual();

  // O middleware já barra quem não tem sessão. Aqui pegamos o caso de ter
  // sessão válida mas perfil desativado — a conta existe e não foi liberada.
  if (!usuario) redirect("/sem-acesso");

  const pendencias = await pendenciasAbertas();
  const altas = pendencias.filter((p) => p.prioridade === "alta").length;

  return (
    <EstruturaApp usuario={usuario} pendenciasAltas={altas}>
      {children}
    </EstruturaApp>
  );
}
