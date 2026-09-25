import { ArrowRight, BarChart3, CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import { Indicador } from "@/components/ui/indicador";
import { NumeroVivo } from "@/components/ui/numero-vivo";
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
    <section aria-labelledby="cabine-do-dia" className="cabine relative p-5 sm:p-6 lg:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -top-28 right-[12%] size-72 rounded-full border border-white/10" />
        <span className="absolute -top-16 right-[7%] size-48 rounded-full border border-white/10" />
        <span className="absolute -right-12 bottom-[-7rem] size-72 rounded-full bg-white/[0.035]" />
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="cabine-do-dia" className="rotulo text-cabine-texto-secundario">O dia na clínica</h2>
          <p className="mt-2 text-sm font-medium text-cabine-texto-secundario/95">
            Agenda, andamento e caixa em uma leitura rápida.
          </p>
        </div>
        <Link
          href="/agenda"
          className="group inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-controle)] border border-white/65 bg-white px-4 text-sm font-semibold text-primary shadow-[0_14px_30px_-20px_rgba(0,18,52,.72)] transition-[transform,background-color] duration-150 hover:-translate-y-0.5 hover:bg-[#f5f9ff] active:translate-y-0"
        >
          Abrir a agenda
          <ArrowRight aria-hidden="true" size={16} strokeWidth={2} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="relative mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)] xl:gap-0">
        <div className="rounded-[var(--radius-cartao)] border border-white/12 bg-white/[0.055] p-4 md:col-span-2 xl:col-span-1 xl:mr-6 xl:border-0 xl:bg-transparent xl:p-0">
          <div className="mb-3 flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-white/15 bg-white/10 text-white">
            <CalendarDays aria-hidden="true" size={18} strokeWidth={1.9} />
          </div>
          <AgoraNaCabine atendimentos={itens} />
        </div>

        <div className="rounded-[var(--radius-cartao)] border border-white/12 bg-white/[0.055] p-4 xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l xl:border-cabine-linha xl:bg-transparent xl:px-6 xl:py-0">
          <div className="mb-3 flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-white/15 bg-white/10 text-white">
            <Users aria-hidden="true" size={18} strokeWidth={1.9} />
          </div>
          <Indicador
            rotulo="Atendimentos de hoje"
            valor={<NumeroVivo valor={concluidos} />}
            complemento={`de ${total} ${total === 1 ? "concluído" : "concluídos"}`}
            proporcao={total > 0 ? concluidos / total : 0}
            descricaoDaBarra={`${concluidos} de ${total} atendimentos de hoje concluídos`}
            frase={
              n.confirmacoesPendentes > 0 ? (
                <>
                  {n.confirmados} {n.confirmados === 1 ? "confirmado" : "confirmados"} ·{" "}
                  <strong className="font-semibold">{n.confirmacoesPendentes} aguardando confirmação</strong>
                </>
              ) : (
                `${n.confirmados} ${n.confirmados === 1 ? "confirmado" : "confirmados"} · nenhuma confirmação pendente`
              )
            }
          />
        </div>

        <div className="rounded-[var(--radius-cartao)] border border-white/12 bg-white/[0.055] p-4 xl:rounded-none xl:border-y-0 xl:border-r-0 xl:border-l xl:border-cabine-linha xl:bg-transparent xl:pr-0 xl:pl-6 xl:py-0">
          <div className="mb-3 flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-white/15 bg-white/10 text-white">
            <BarChart3 aria-hidden="true" size={18} strokeWidth={1.9} />
          </div>
          <Indicador
            rotulo={exemplo ? "Recebido no mês · demonstrativo" : "Recebido no mês"}
            tamanho="numero-sm"
            valor={<NumeroVivo valor={n.recebidoNoMes} formato="moeda" />}
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
      </div>

      <div className="relative mt-6 border-t border-cabine-linha pt-5">
        <FilaDoDia atendimentos={itens} />
      </div>
    </section>
  );
}
