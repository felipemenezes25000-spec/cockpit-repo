import {
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  Clock3,
  Repeat2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import { indicadores } from "@/server/consultas/indicadores";

type Indicador = {
  rotulo: string;
  valor: string;
  apoio: string;
  icone: LucideIcon;
  href: string;
  /** Números financeiros ganham marca de demonstrativo e corpo menor. */
  financeiro?: boolean;
  /**
   * Ênfase da linha de apoio.
   *
   * `atencao` é laranja: falta fazer algo. `negativo` é vermelho: algo já
   * deu errado. A distinção existe para o vermelho não perder o efeito — se
   * toda pendência normal fosse vermelha, o valor vencido não se destacaria.
   */
  enfase?: "atencao" | "negativo";
};

export async function CartoesIndicadores({ exemplo }: { exemplo: boolean }) {
  const n = await indicadores();

  const lista: Indicador[] = [
    {
      rotulo: "Atendimentos de hoje",
      valor: String(n.atendimentosHoje),
      apoio: `${n.concluidos} já ${n.concluidos === 1 ? "concluído" : "concluídos"}`,
      icone: CalendarDays,
      href: "/agenda",
    },
    {
      rotulo: "Confirmados",
      valor: String(n.confirmados),
      apoio: `de ${n.atendimentosHoje} na agenda de hoje`,
      icone: BadgeCheck,
      href: "/agenda",
    },
    {
      rotulo: "Confirmações pendentes",
      valor: String(n.confirmacoesPendentes),
      apoio:
        n.confirmacoesPendentes > 0 ? "precisam de contato hoje" : "nenhuma em aberto",
      icone: Clock3,
      href: "/agenda",
      // Falta ligar para a paciente. É tarefa em aberto, não erro.
      enfase: n.confirmacoesPendentes > 0 ? "atencao" : undefined,
    },
    {
      rotulo: "Aguardando retorno",
      valor: String(n.aguardandoRetorno),
      apoio: "pacientes na janela de contato",
      icone: Repeat2,
      href: "/relacionamento",
    },
    {
      rotulo: "Recebido no mês",
      valor: formatarMoeda(n.recebidoNoMes),
      apoio: "lançamentos já quitados",
      icone: Wallet,
      href: "/financeiro",
      financeiro: true,
    },
    {
      rotulo: "A receber",
      valor: formatarMoeda(n.aReceber),
      apoio: n.vencido > 0 ? `${formatarMoeda(n.vencido)} já vencido` : "nada vencido",
      icone: CalendarClock,
      href: "/financeiro",
      financeiro: true,
      // Vencido é dinheiro que já deveria ter entrado.
      enfase: n.vencido > 0 ? "negativo" : undefined,
    },
  ];

  return (
    <section aria-labelledby="indicadores">
      <h2 id="indicadores" className="sr-only">
        Indicadores principais
      </h2>
      {/* Seis colunas só a partir de 2xl: em xl cada cartão ficava com uns
          100 px úteis, e "R$ 16.940,00" passava da borda. No celular, os dois
          financeiros ocupam a linha inteira pelo mesmo motivo. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 2xl:grid-cols-6">
        {lista.map((ind) => {
          const Icone = ind.icone;
          return (
            <Link
              key={ind.rotulo}
              href={ind.href}
              className={cn(
                "flex min-w-0 flex-col rounded-[var(--radius-cartao)] border border-card-border bg-card p-4 transition-colors sm:p-6 hover:border-primary-fixed-dim",
                ind.financeiro && "col-span-2 md:col-span-1",
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <h3 className="rotulo tracking-wider">{ind.rotulo}</h3>
                <Icone
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.5}
                  className="shrink-0 text-outline-variant"
                />
              </div>

              <span
                className={cn(
                  "tabular mb-2 text-on-surface",
                  ind.financeiro ? "mt-auto text-xl font-semibold" : "t-display",
                )}
              >
                {ind.valor}
              </span>

              <span
                className={cn(
                  ind.financeiro ? "mb-1 text-xs" : "text-sm",
                  ind.enfase === "negativo"
                    ? "font-medium text-negativo"
                    : ind.enfase === "atencao"
                      ? "font-medium text-atencao"
                      : "text-outline",
                )}
              >
                {ind.apoio}
              </span>

              {ind.financeiro && exemplo ? (
                <span className="text-[0.625rem] text-outline uppercase">
                  Valor demonstrativo
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
