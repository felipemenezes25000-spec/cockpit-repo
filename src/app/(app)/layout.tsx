import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EstruturaApp } from "@/components/layout/app-shell";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import type { AtendimentoDoAgora } from "@/lib/agora";
import { usuarioAtual } from "@/lib/auth";
import { atendimentosDeHoje } from "@/server/consultas/agenda";
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

  // As consultas não dependem umas das outras. A agenda de hoje alimenta a
  // faixa do agora; se falhar, a faixa avisa e o resto da tela segue.
  const [pendencias, exemplo, agenda] = await Promise.all([
    pendenciasAbertas(),
    temDadosDeExemplo(),
    atendimentosDeHoje().catch(() => null),
  ]);
  const altas = pendencias.filter((p) => p.prioridade === "alta").length;

  // Só o que a faixa precisa atravessa para o navegador.
  const agendaDaFaixa: AtendimentoDoAgora[] | null = agenda
    ? agenda.map((a) => ({
        id: a.id,
        inicio: a.inicio.getTime(),
        duracaoMin: a.duracaoMin,
        situacao: a.situacao,
        paciente: a.paciente,
        procedimento: a.procedimento,
      }))
    : null;

  return (
    <EstruturaApp
      usuario={usuario}
      pendenciasAltas={altas}
      agenda={agendaDaFaixa}
      aviso={exemplo ? <FaixaDemonstracao className="mb-6" /> : null}
    >
      {children}
    </EstruturaApp>
  );
}
