import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import { ListaDoDia } from "@/components/agenda/lista-do-dia";
import { NavegacaoDia } from "@/components/agenda/navegacao-dia";
import {
  enderecoDaAgenda,
  lerDiaDaAgenda,
  lerProfissional,
} from "@/components/agenda/parametros-agenda";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
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
  // O que não serve na URL cai no padrão: dia inexistente vira hoje, id torto
  // de profissional vira "todas".
  const dia = lerDiaDaAgenda(parametros.dia);
  const chave = chaveDoDia(dia);
  const profissionalId = lerProfissional(parametros.profissional);

  const [filtrados, catalogo] = await Promise.all([
    atendimentosDoDia(dia, profissionalId),
    // A filtrada entra na lista mesmo inativa: o filtro de um link antigo
    // continua com nome na tela.
    catalogoAgenda({ profissionalId: profissionalId ?? undefined }),
  ]);
  const profissional = profissionalId
    ? (catalogo.profissionais.find((p) => p.id === profissionalId) ?? null)
    : null;
  // Id que não é de ninguém: a tela diria "nenhum horário" de um filtro que
  // nem aparece. Mostra o dia inteiro, como sem filtro.
  const atendimentos =
    profissionalId && !profissional ? await atendimentosDoDia(dia) : filtrados;

  const cancelados = atendimentos.filter(
    (a) => a.situacao === "cancelado" || a.situacao === "ausente",
  ).length;
  const ativos = atendimentos.length - cancelados;

  const marcar = new URLSearchParams({ dia: chave });
  if (profissional) marcar.set("profissional", profissional.id);

  return (
    <Card>
      <CardCabecalho
        titulo={capitalizar(formatarDataExtenso(dia))}
        descricao={
          (profissional ? `${profissional.nome} · ` : "") +
          (atendimentos.length === 0
            ? "Nenhum horário marcado."
            : `${ativos} ${ativos === 1 ? "horário" : "horários"}` +
              (cancelados > 0
                ? ` · ${cancelados} ${cancelados === 1 ? "cancelado ou ausência" : "cancelados ou ausências"}`
                : ""))
        }
        acao={
          <BotaoLink href={`/agenda/novo?${marcar}`} variante="primaria" tamanho="sm">
            <CalendarPlus aria-hidden="true" size={16} strokeWidth={1.75} />
            Marcar atendimento
          </BotaoLink>
        }
      />

      <CardCorpo className="flex flex-col gap-6">
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
  );
}
