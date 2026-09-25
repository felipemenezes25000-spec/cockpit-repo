import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { EstruturaApp } from "@/components/layout/app-shell";
import { FaixaDemonstracao } from "@/components/layout/demo-badge";
import type { PendenciaDoTicker } from "@/components/layout/ticker-de-pendencias";
import type { AtendimentoDoAgora } from "@/lib/agora";
import { usuarioAtual } from "@/lib/auth";
import { descreverPrazo } from "@/lib/format";
import { COOKIE_RECOLHIDOS, lerRecolhidos } from "@/lib/recolhidos";
import { atendimentosDeHoje } from "@/server/consultas/agenda";
import { temDadosDeExemplo } from "@/server/consultas/exemplo";
import { ROTULO_PENDENCIA, pendenciasAbertas } from "@/server/consultas/pendencias";
import "./app-premium.css";

/** Quantas pendências passam no letreiro do topo (as mais urgentes primeiro). */
const NO_LETREIRO = 12;

/** "venceu há 3 dias", "prazo hoje", "prazo em 2 dias". */
function fraseDoPrazo(dias: number | null): string | null {
  if (dias === null) return null;
  if (dias < 0) return `venceu ${descreverPrazo(dias)}`;
  return `prazo ${descreverPrazo(dias)}`;
}

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
  const [pendencias, exemplo, agenda, guardados] = await Promise.all([
    pendenciasAbertas(),
    temDadosDeExemplo(),
    atendimentosDeHoje().catch(() => null),
    cookies(),
  ]);
  // Os painéis que a pessoa recolheu: a tela já sai do servidor com eles fechados.
  const recolhidos = lerRecolhidos(guardados.get(COOKIE_RECOLHIDOS)?.value);
  const altas = pendencias.filter((p) => p.prioridade === "alta").length;

  // O letreiro do topo: só o texto que ele mostra atravessa para o navegador.
  const letreiro: PendenciaDoTicker[] = pendencias.slice(0, NO_LETREIRO).map((p) => ({
    id: p.id,
    tipo: ROTULO_PENDENCIA[p.tipo],
    paciente: p.paciente,
    descricao: p.descricao,
    prioridade: p.prioridade,
    prazo: fraseDoPrazo(p.prazoEmDias),
    atrasada: (p.prazoEmDias ?? 0) < 0,
    destino: p.destino,
  }));

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
      letreiro={{ pendencias: letreiro, total: pendencias.length, altas }}
      recolhidos={recolhidos}
      agenda={agendaDaFaixa}
      aviso={exemplo ? <FaixaDemonstracao className="mb-6" /> : null}
    >
      {children}
    </EstruturaApp>
  );
}
