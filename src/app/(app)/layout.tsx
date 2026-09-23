import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EstruturaApp } from "@/components/layout/app-shell";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import { usuarioAtual } from "@/lib/auth";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";
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

  // As duas consultas não dependem uma da outra.
  const [pendencias, exemplo] = await Promise.all([pendenciasAbertas(), temDadosDeExemplo()]);
  const altas = pendencias.filter((p) => p.prioridade === "alta").length;

  return (
    <EstruturaApp
      usuario={usuario}
      pendenciasAltas={altas}
      aviso={exemplo ? <FaixaDemonstracao className="mb-6" /> : null}
    >
      {children}
    </EstruturaApp>
  );
}
