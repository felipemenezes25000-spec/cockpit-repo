import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Indicador } from "@/components/ui/indicador";
import type { AtendimentoDoAgora } from "@/lib/agora";
import { formatarMoeda } from "@/lib/format";
import { atendimentosDeHoje } from "@/server/consultas/agenda";
import { indicadores } from "@/server/consultas/indicadores";
import { AgoraNaCabine } from "./agora-na-cabine";
import { FilaDoDia } from "./fila-do-dia";

/**
 * A cabine da Visão Geral: o bloco azul que se lê de relance. O agora (quem
 * está em atendimento, quem vem), os números do dia e do mês e o dia inteiro
 * em cartões. É a única cor cheia da tela.
 */
export async function CabineDoDia({ exemplo }: { exemplo: boolean }) {
  const [agenda, n] = await Promise.all([atendimentosDeHoje(), indicadores()]);

  const itens: AtendimentoDoAgora[] = agenda.map((a) => ({
    id: a.id,
    inicio: a.inicio.getTime(),
    duracaoMin: a.duracaoMin,
    situacao: a.situacao,
    paciente: a.paciente,
    procedimento: a.procedimento,
  }));

  const total = n.atendimentosHoje;
  const concluidos = n.concluidos;

  return (
    <section aria-labelledby="cabine-do-dia" className="cabine p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cabine-do-dia" className="rotulo">O dia na clínica</h2>
        <Link
          href="/agenda"
          className="group inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-controle)] px-2.5 text-sm font-semibold text-cabine-texto transition-colors hover:bg-cabine-profunda"
        >
          Abrir a agenda
          <ArrowRight aria-hidden="true" size={15} strokeWidth={2} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
        <AgoraNaCabine atendimentos={itens} className="md:col-span-2 lg:col-span-1 lg:pr-6" />

        <Indicador
          className="lg:border-l lg:border-cabine-linha lg:px-6"
          rotulo="Atendimentos de hoje"
          valor={concluidos}
          complemento={`de ${total} ${total === 1 ? "concluído" : "concluídos"}`}
          proporcao={total > 0 ? concluidos / total : 0}
          descricaoDaBarra={`${concluidos} de ${total} atendimentos de hoje concluídos`}
          frase={
            n.confirmacoesPendentes > 0 ? (
              <>
                {n.confirmados} {n.confirmados === 1 ? "confirmado" : "confirmados"} ·{" "}
                <strong className="font-semibold">
                  {n.confirmacoesPendentes} aguardando confirmação
                </strong>
              </>
            ) : (
              `${n.confirmados} ${n.confirmados === 1 ? "confirmado" : "confirmados"} · nenhuma confirmação pendente`
            )
          }
        />

        <Indicador
          className="lg:border-l lg:border-cabine-linha lg:pl-6"
          rotulo={exemplo ? "Recebido no mês · demonstrativo" : "Recebido no mês"}
          tamanho="numero-sm"
          valor={formatarMoeda(n.recebidoNoMes)}
          frase={
            <>
              {formatarMoeda(n.aReceber)} a receber
              {n.vencido > 0 ? (
                <>
                  {" "}· <strong className="font-semibold">{formatarMoeda(n.vencido)} vencido</strong>
                </>
              ) : (
                " · nada vencido"
              )}
            </>
          }
        />
      </div>

      <div className="mt-6 border-t border-cabine-linha pt-5">
        <FilaDoDia atendimentos={itens} />
      </div>
    </section>
  );
}
