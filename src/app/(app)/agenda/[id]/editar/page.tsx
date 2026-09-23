import { ArrowLeft, History } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BotoesSituacao } from "@/components/agenda/botoes-situacao";
import { FormularioAtendimento } from "@/components/agenda/formulario-atendimento";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { SituacaoChip } from "@/components/ui/status-chip";
import { chaveDoDia } from "@/lib/dates";
import { formatarData, formatarHora } from "@/lib/format";
import { atualizarAtendimento } from "@/server/acoes/agenda";
import { atendimentoPorId, catalogoAgenda } from "@/server/consultas/agenda";

export const metadata: Metadata = { title: "Editar atendimento" };

/** Hora de parede da clínica para o `input type="time"`. */
function horaDoInput(instante: Date): string {
  return formatarHora(instante);
}

export default async function PaginaEditarAtendimento({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const atendimento = await atendimentoPorId(id);

  // Inexistente e sem permissão caem na mesma tela, como na ficha da paciente.
  if (!atendimento) notFound();

  // O catálogo inclui o profissional e o procedimento deste atendimento mesmo
  // que tenham sido desativados depois — senão a edição travaria.
  const catalogo = await catalogoAgenda({
    profissionalId: atendimento.profissionalId,
    procedimentoId: atendimento.procedimentoId,
  });

  const dia = chaveDoDia(atendimento.inicio);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/agenda?dia=${dia}`}
        className="mb-6 inline-flex items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para o dia {formatarData(atendimento.inicio)}
      </Link>

      <div className="flex flex-col gap-6">
        <Card>
          <CardCabecalho
            titulo={atendimento.paciente}
            descricao={
              <span className="inline-flex flex-wrap items-center gap-2">
                <SituacaoChip situacao={atendimento.situacao} />
                <span>
                  {formatarData(atendimento.inicio)} às{" "}
                  {formatarHora(atendimento.inicio)}
                </span>
              </span>
            }
          />
          <CardCorpo className="flex flex-col gap-6">
            <BotoesSituacao
              atendimentoId={atendimento.id}
              situacao={atendimento.situacao}
            />

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
                cancelarPara={`/agenda?dia=${dia}`}
              />
            </div>
          </CardCorpo>
        </Card>

        {atendimento.trilha.length > 0 ? (
          <Card>
            <CardCabecalho
              titulo="Histórico de situações"
              descricao="Gravado pelo banco a cada mudança — quem mudou e quando."
            />
            <CardCorpo>
              <ol className="flex flex-col gap-3">
                {atendimento.trilha.map((mudanca, i) => (
                  <li
                    key={`${mudanca.em.getTime()}-${i}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                  >
                    <History
                      aria-hidden="true"
                      size={14}
                      strokeWidth={1.75}
                      className="shrink-0 text-outline-variant"
                    />
                    <SituacaoChip situacao={mudanca.para} compacto />
                    <span className="tabular text-xs text-outline">
                      {formatarData(mudanca.em)} às {formatarHora(mudanca.em)}
                    </span>
                    {mudanca.por ? (
                      <span className="text-xs text-outline">por {mudanca.por}</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardCorpo>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
