import { CalendarDays, CalendarPlus } from "lucide-react";
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
            {cancelados > 0 ? (
              <SeloHero tom="negativo">
                {cancelados} {cancelados === 1 ? "cancelado ou ausência" : "cancelados ou ausências"}
              </SeloHero>
            ) : null}
            {profissional ? <SeloHero>{profissional.nome}</SeloHero> : <SeloHero>Todas as profissionais</SeloHero>}
          </>
        }
      />

      <Card>
        <CardCorpo className="flex flex-col gap-6 sm:gap-7">
          <NavegacaoDia
            dia={chave}
            anterior={chaveDoDia(somarDias(dia, -1))}
            proximo={chaveDoDia(somarDias(dia, 1))}
            ehHoje={mesmoDia(dia, hoje())}
            profissional={profissional?.id ?? null}
            profissionais={catalogo.profissionais}
          />

          <ListaDoDia
            atendimentos={atendimentos}
            dia={chave}
            profissional={profissional?.nome ?? null}
            profissionalId={profissional?.id ?? null}
            enderecoSemFiltro={enderecoDaAgenda(chave)}
          />
        </CardCorpo>
      </Card>
    </div>
  );
}
