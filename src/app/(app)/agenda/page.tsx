import { CalendarDays, CalendarPlus, Clock3, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { ListaDoDia } from "@/components/agenda/lista-do-dia";
import { NavegacaoDia } from "@/components/agenda/navegacao-dia";
import {
  enderecoDaAgenda,
  lerDiaDaAgenda,
  lerProfissional,
} from "@/components/agenda/parametros-agenda";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCorpo } from "@/components/ui/card";
import { CabecalhoDePagina, SeloHero } from "@/components/ui/page-hero";
import { chaveDoDia, hoje, mesmoDia, somarDias } from "@/lib/dates";
import { capitalizar, formatarDataExtenso } from "@/lib/format";
import { atendimentosDoDia, catalogoAgenda } from "@/server/consultas/agenda";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Marcar, remarcar e acompanhar os atendimentos da clínica.",
};

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const dia = lerDiaDaAgenda(parametros.dia);
  const chave = chaveDoDia(dia);
  const profissionalId = lerProfissional(parametros.profissional);

  const [filtrados, catalogo] = await Promise.all([
    atendimentosDoDia(dia, profissionalId),
    catalogoAgenda({ profissionalId: profissionalId ?? undefined }),
  ]);
  const profissional = profissionalId
    ? (catalogo.profissionais.find((p) => p.id === profissionalId) ?? null)
    : null;
  const atendimentos =
    profissionalId && !profissional ? await atendimentosDoDia(dia) : filtrados;

  const cancelados = atendimentos.filter(
    (a) => a.situacao === "cancelado" || a.situacao === "ausente",
  ).length;
  const ativos = atendimentos.length - cancelados;
  const confirmados = atendimentos.filter((a) => a.situacao === "confirmado").length;
  const emAtendimento = atendimentos.filter((a) => a.situacao === "em_atendimento").length;
  const aguardando = atendimentos.filter(
    (a) => a.situacao === "agendado" || a.situacao === "aguardando_confirmacao",
  ).length;

  const marcar = new URLSearchParams({ dia: chave });
  if (profissional) marcar.set("profissional", profissional.id);

  return (
    <div className="page-reveal flex flex-col gap-5 sm:gap-6">
      <CabecalhoDePagina
        icone={CalendarDays}
        rotulo="Operação do dia"
        titulo={capitalizar(formatarDataExtenso(dia))}
        descricao={
          profissional
            ? `Agenda filtrada por ${profissional.nome}. Navegue pelo dia, acompanhe o fluxo e atualize cada atendimento sem sair da tela.`
            : "Acompanhe o ritmo da clínica, confirmações, horários e mudanças de situação em uma única visão."
        }
        acoes={
          <BotaoLink href={`/agenda/novo?${marcar}`} variante="primaria" tamanho="sm">
            <CalendarPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Marcar atendimento
          </BotaoLink>
        }
        meta={
          <>
            <SeloHero tom={ativos > 0 ? "informativo" : "neutro"}>
              {ativos} {ativos === 1 ? "horário ativo" : "horários ativos"}
            </SeloHero>
            <SeloHero tom={confirmados > 0 ? "positivo" : "neutro"}>
              {confirmados} {confirmados === 1 ? "confirmado" : "confirmados"}
            </SeloHero>
            {aguardando > 0 ? <SeloHero tom="atencao">{aguardando} aguardando confirmação</SeloHero> : null}
            {cancelados > 0 ? (
              <SeloHero tom="negativo">
                {cancelados} {cancelados === 1 ? "cancelado ou ausência" : "cancelados ou ausências"}
              </SeloHero>
            ) : null}
            {profissional ? <SeloHero>{profissional.nome}</SeloHero> : <SeloHero>Todas as profissionais</SeloHero>}
          </>
        }
      />

      <Card className="agenda-painel-principal">
        <CardCorpo className="flex flex-col gap-0 p-0!">
          <div className="border-b border-card-border bg-surface-container-low px-4 py-4 sm:px-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao text-primary">
                  <CalendarDays size={17} strokeWidth={1.9} />
                </span>
                <div>
                  <p className="titulo-secao text-on-surface">Navegar pela agenda</p>
                  <p className="mt-0.5 text-xs text-outline">Troque o dia ou filtre por profissional sem perder o contexto.</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {emAtendimento > 0 ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-informativo-borda bg-informativo-fundo px-2.5 py-1 font-semibold text-informativo-texto">
                    <span aria-hidden="true" className="now-pulse size-1.5 rounded-full bg-informativo" />
                    {emAtendimento === 1 ? "1 em atendimento" : `${emAtendimento} em atendimento`}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1 font-medium text-outline">
                    <Clock3 aria-hidden="true" size={12} />
                    Fluxo do dia
                  </span>
                )}
                <span className="hidden items-center gap-1.5 rounded-full border border-card-border bg-surface px-2.5 py-1 font-medium text-outline sm:inline-flex">
                  <Sparkles aria-hidden="true" size={12} className="text-primary" />
                  Atualização rápida
                </span>
              </div>
            </div>

            <NavegacaoDia
              dia={chave}
              anterior={chaveDoDia(somarDias(dia, -1))}
              proximo={chaveDoDia(somarDias(dia, 1))}
              ehHoje={mesmoDia(dia, hoje())}
              profissional={profissional?.id ?? null}
              profissionais={catalogo.profissionais}
            />
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="rotulo text-primary">Linha do tempo</p>
                <h2 className="titulo-secao mt-1 text-on-surface">Atendimentos em ordem do relógio</h2>
                <p className="mt-1 text-xs leading-5 text-outline">Situação, confirmação e ações ficam no próprio cartão de cada paciente.</p>
              </div>
              <span className="tabular rounded-full border border-card-border bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
                {atendimentos.length} {atendimentos.length === 1 ? "registro" : "registros"}
              </span>
            </div>

            <ListaDoDia
              atendimentos={atendimentos}
              dia={chave}
              profissional={profissional?.nome ?? null}
              profissionalId={profissional?.id ?? null}
              enderecoSemFiltro={enderecoDaAgenda(chave)}
            />
          </div>
        </CardCorpo>
      </Card>
    </div>
  );
}
