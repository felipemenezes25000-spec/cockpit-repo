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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <Card>
          <CardCabecalho
            titulo="Editar atendimento"
            descricao="Ajuste os dados do horário. A paciente permanece vinculada ao atendimento atual."
          />
          <CardCorpo className="flex flex-col gap-6 py-7 sm:py-8">
            <FocoAposAcao situacao={atendimento.situacao} className="rounded-[var(--radius-cartao)] border border-card-border/70 bg-surface/55 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
              <BotoesSituacao atendimentoId={atendimento.id} situacao={atendimento.situacao} />
            </FocoAposAcao>

            <div className="border-t border-card-border/70 pt-6">
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

        <aside className="xl:sticky xl:top-28">
          <Card as="div">
            <CardCabecalho titulo="Histórico de situações" descricao="Gravado pelo banco a cada mudança." />
            <CardCorpo>
              {atendimento.trilha.length > 0 ? (
                <ol className="relative flex flex-col gap-3 before:absolute before:top-4 before:bottom-4 before:left-[0.95rem] before:w-px before:bg-card-border">
                  {atendimento.trilha.map((mudanca, i) => (
                    <li key={`${mudanca.em.getTime()}-${i}`} className="relative flex items-start gap-3 rounded-[var(--radius-controle)] border border-card-border/65 bg-surface/55 px-3 py-3">
                      <span className="relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-xl border border-card-border bg-surface text-outline shadow-[var(--shadow-cartao)]">
                        <History aria-hidden="true" size={13} strokeWidth={1.75} />
                      </span>
                      <div className="min-w-0">
                        <SituacaoChip situacao={mudanca.para} compacto />
                        <p className="tabular mt-1.5 text-xs leading-5 text-outline">
                          {formatarData(mudanca.em)} às {formatarHora(mudanca.em)}
                          {mudanca.por ? ` · ${mudanca.por}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-outline">Nenhuma mudança de situação registrada.</p>
              )}
            </CardCorpo>
          </Card>
        </aside>
      </div>
    </div>
  );
}
