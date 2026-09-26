import { CalendarClock, History } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BotoesSituacao } from "@/components/agenda/botoes-situacao";
import { enderecoDaAgenda, lerProfissional } from "@/components/agenda/parametros-agenda";
import { FocoAposAcao } from "@/components/agenda/foco-apos-acao";
import { FormularioAtendimento } from "@/components/agenda/formulario-atendimento";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";
import { SituacaoChip } from "@/components/ui/status-chip";
import { chaveDoDia } from "@/lib/dates";
import { formatarData, formatarHora } from "@/lib/format";
import { atualizarAtendimento } from "@/server/acoes/agenda";
import { atendimentoPorId, catalogoAgenda } from "@/server/consultas/agenda";

export const metadata: Metadata = { title: "Editar atendimento" };

function horaDoInput(instante: Date): string {
  return formatarHora(instante);
}

export default async function PaginaEditarAtendimento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const filtro = lerProfissional((await searchParams).profissional);
  const atendimento = await atendimentoPorId(id);

  if (!atendimento) notFound();

  const catalogo = await catalogoAgenda({
    profissionalId: atendimento.profissionalId,
    procedimentoId: atendimento.procedimentoId,
  });

  const dia = chaveDoDia(atendimento.inicio);
  const voltarPara = enderecoDaAgenda(dia, filtro);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <LinkDeVoltar href={voltarPara}>Voltar para o dia {formatarData(atendimento.inicio)}</LinkDeVoltar>

      <CabecalhoDePagina
        icone={CalendarClock}
        rotulo="Agenda"
        titulo={atendimento.paciente}
        descricao={`Atendimento de ${formatarData(atendimento.inicio)} às ${formatarHora(atendimento.inicio)}. Edite horário, profissional, procedimento e demais detalhes mantendo o histórico de situações preservado.`}
        meta={
          <>
            <SituacaoChip situacao={atendimento.situacao} />
            <SeloHero tom="informativo">{atendimento.duracaoMin} min</SeloHero>
            <SeloHero>{atendimento.profissional}</SeloHero>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
        <Card>
          <CardCabecalho
            titulo="Editar atendimento"
            descricao="Ajuste os dados do horário. A paciente permanece vinculada ao atendimento atual."
          />
          <CardCorpo className="flex flex-col gap-6 py-7 sm:py-8">
            <FocoAposAcao situacao={atendimento.situacao} className="rounded-[var(--radius-cartao)] border border-card-border bg-surface p-3.5 shadow-[0_12px_28px_-26px_rgba(8,41,76,.35)]">
              <BotoesSituacao atendimentoId={atendimento.id} situacao={atendimento.situacao} />
            </FocoAposAcao>

            <div className="border-t border-card-border pt-6">
              <FormularioAtendimento
                acao={atualizarAtendimento}
                catalogo={catalogo}
                atendimentoId={atendimento.id}
                pacienteInicial={{
                  id: atendimento.pacienteId,
                  nome: atendimento.paciente,
                  detalhe: "paciente deste atendimento",
                }}
                inicial={{
                  data: dia,
                  hora: horaDoInput(atendimento.inicio),
                  profissional_id: atendimento.profissionalId,
                  procedimento_id: atendimento.procedimentoId,
                  duracao_min: String(atendimento.duracaoMin),
                  valor:
                    atendimento.valor > 0
                      ? atendimento.valor.toFixed(2).replace(".", ",")
                      : "",
                  observacoes: atendimento.observacoes ?? "",
                }}
                rotuloSalvar="Salvar alterações"
                cancelarPara={voltarPara}
                filtroProfissional={filtro}
              />
            </div>
          </CardCorpo>
        </Card>

        <aside className="min-w-0 xl:sticky xl:top-28">
          <Card as="div">
            <CardCabecalho titulo="Histórico de situações" descricao="Gravado pelo banco a cada mudança." />
            <CardCorpo>
              {atendimento.trilha.length > 0 ? (
                <ol className="relative flex min-w-0 flex-col gap-3 before:absolute before:top-5 before:bottom-5 before:left-[1.08rem] before:w-px before:bg-[linear-gradient(180deg,var(--color-primary-fixed-dim),var(--color-card-border))]">
                  {atendimento.trilha.map((mudanca, i) => (
                    <li
                      key={`${mudanca.em.getTime()}-${i}`}
                      className="premium-interactive relative flex min-w-0 items-start gap-3 overflow-hidden rounded-[var(--radius-cartao)] border border-card-border bg-[linear-gradient(180deg,#ffffff_0%,#fcfdff_100%)] px-3.5 py-3.5 shadow-[0_10px_24px_-22px_rgba(8,41,76,.3)]"
                    >
                      <span className="relative z-[1] flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary shadow-[0_8px_18px_-16px_rgba(8,84,160,.42)]">
                        <History aria-hidden="true" size={14} strokeWidth={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <SituacaoChip situacao={mudanca.para} compacto className="max-w-full" />
                        <p className="tabular mt-2 min-w-0 break-words text-xs leading-5 text-outline">
                          {formatarData(mudanca.em)} às {formatarHora(mudanca.em)}
                          {mudanca.por ? ` · ${mudanca.por}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-[var(--radius-cartao)] border border-dashed border-outline-variant bg-surface-container-low px-4 py-5 text-center">
                  <span className="mx-auto flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-card-border bg-surface text-outline">
                    <History aria-hidden="true" size={16} strokeWidth={1.7} />
                  </span>
                  <p className="mt-3 text-sm font-medium text-on-surface-variant">Nenhuma mudança de situação registrada.</p>
                </div>
              )}
            </CardCorpo>
          </Card>
        </aside>
      </div>
    </div>
  );
}
