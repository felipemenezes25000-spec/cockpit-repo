import { CalendarX2 } from "lucide-react";
import { Fragment } from "react";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ESTILO_SITUACAO, SITUACOES_EM_ORDEM } from "@/components/ui/status-chip";
import { inicioDoDia, inicioDoDiaSeguinte } from "@/lib/dates";
import { formatarHora } from "@/lib/format";
import { atendimentosDeHoje } from "@/server/consultas/agenda";
import { IntervaloLivre, ItemLinhaDoDia } from "./day-rail-item";
import { MarcadorAgora } from "./now-marker";

/**
 * Agenda de hoje em escala de tempo.
 *
 * Os atendimentos aparecem na ordem do relógio sobre uma linha vertical, e os
 * vazios entre eles ganham altura proporcional: um buraco na agenda vira um
 * buraco visível na tela.
 */
export async function LinhaDoDia() {
  const atendimentos = await atendimentosDeHoje();

  if (atendimentos.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Agenda de hoje" descricao="Nenhum horário marcado." />
        <EstadoVazio
          icone={CalendarX2}
          titulo="O dia está livre"
          descricao="Assim que houver agendamentos, eles aparecem aqui na ordem do relógio."
          acao={
            <BotaoLink href="/agenda" variante="primaria" tamanho="sm">
              Abrir a agenda
            </BotaoLink>
          }
        />
      </Card>
    );
  }

  const primeiro = atendimentos[0];
  const ultimo = atendimentos[atendimentos.length - 1];

  /**
   * As faixas do marcador "agora" vão de um início de atendimento ao próximo e
   * cobrem o dia inteiro sem buraco — inclusive enquanto um atendimento está
   * acontecendo, quando o marcador aparece logo abaixo dele.
   */
  const aberturaDoDia = inicioDoDia().getTime();
  const fimDoDia = inicioDoDiaSeguinte().getTime();

  return (
    <Card>
      <CardCabecalho
        titulo="Agenda de hoje"
        descricao={`${atendimentos.length} ${atendimentos.length === 1 ? "horário" : "horários"} entre ${formatarHora(primeiro.inicio)} e ${formatarHora(ultimo.inicio)}`}
        acao={
          <BotaoLink href="/agenda" tamanho="sm">
            Ver agenda completa
          </BotaoLink>
        }
      />

      <CardCorpo className="rolagem-discreta max-h-[620px] overflow-y-auto">
        <div
          className={[
            "relative",
            /* Linha do tempo esmaecendo nas duas pontas. O centro dela é o
               centro do ponto de cada atendimento: borda 1 + recuo 12 + hora
               40 + espaço 12 + meio ponto 6 = 71 px no celular, e
               1 + 16 + 48 + 24 + 6 = 95 px do `sm` para cima. */
            "before:absolute before:top-0 before:bottom-0 before:left-[70px] before:w-0.5",
            "before:bg-gradient-to-b before:from-transparent before:via-card-border before:to-transparent",
            "sm:before:left-[94px]",
          ].join(" ")}
        >
          <MarcadorAgora de={aberturaDoDia} ate={primeiro.inicio.getTime()} />

          {atendimentos.map((atendimento, i) => {
            const anterior = atendimentos[i - 1];
            const fimAnterior = anterior
              ? anterior.inicio.getTime() + anterior.duracaoMin * 60_000
              : null;
            const vazio = fimAnterior
              ? Math.round((atendimento.inicio.getTime() - fimAnterior) / 60_000)
              : 0;

            return (
              <Fragment key={atendimento.id}>
                {anterior ? (
                  <>
                    <MarcadorAgora
                      de={anterior.inicio.getTime()}
                      ate={atendimento.inicio.getTime()}
                    />
                    {vazio >= 15 ? <IntervaloLivre minutos={vazio} /> : null}
                  </>
                ) : null}
                <ItemLinhaDoDia atendimento={atendimento} />
              </Fragment>
            );
          })}

          <MarcadorAgora de={ultimo.inicio.getTime()} ate={fimDoDia} />
        </div>
      </CardCorpo>

      <CardRodape className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="rotulo">Situações</span>
        {SITUACOES_EM_ORDEM.map((situacao) => {
          const estilo = ESTILO_SITUACAO[situacao];
          const Icone = estilo.icone;
          return (
            <span
              key={situacao}
              className="inline-flex items-center gap-1.5 text-xs text-outline"
            >
              <span
                aria-hidden="true"
                className={`size-2 rounded-full ${estilo.marcador}`}
              />
              <Icone aria-hidden="true" size={13} strokeWidth={1.75} />
              {estilo.rotulo}
            </span>
          );
        })}
      </CardRodape>
    </Card>
  );
}
