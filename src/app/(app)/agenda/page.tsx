import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import { ListaDoDia } from "@/components/agenda/lista-do-dia";
import { NavegacaoDia } from "@/components/agenda/navegacao-dia";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo } from "@/components/ui/card";
import { chaveDoDia, dataDoBanco, hoje, mesmoDia, somarDias } from "@/lib/dates";
import { capitalizar, formatarDataExtenso } from "@/lib/format";
import { atendimentosDoDia } from "@/server/consultas/agenda";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Marcar, remarcar e acompanhar os atendimentos da clínica.",
};

/** Aceita só "AAAA-MM-DD" — o resto da URL cai no dia de hoje. */
function lerDia(valor: string | string[] | undefined): Date {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  if (!texto || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return hoje();

  const [, mes, dia] = texto.split("-").map(Number);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return hoje();
  return dataDoBanco(texto);
}

export default async function PaginaAgenda({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const dia = lerDia(parametros.dia);
  const chave = chaveDoDia(dia);
  const atendimentos = await atendimentosDoDia(dia);

  const cancelados = atendimentos.filter(
    (a) => a.situacao === "cancelado" || a.situacao === "ausente",
  ).length;
  const ativos = atendimentos.length - cancelados;

  return (
    <div>

      <Card>
        <CardCabecalho
          titulo={capitalizar(formatarDataExtenso(dia))}
          descricao={
            atendimentos.length === 0
              ? "Nenhum horário marcado."
              : `${ativos} ${ativos === 1 ? "horário" : "horários"}` +
                (cancelados > 0
                  ? ` · ${cancelados} ${cancelados === 1 ? "cancelado ou ausência" : "cancelados ou ausências"}`
                  : "")
          }
          acao={
            <BotaoLink
              href={`/agenda/novo?dia=${chave}`}
              variante="primaria"
              tamanho="sm"
            >
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
          />

          <ListaDoDia atendimentos={atendimentos} dia={chave} />
        </CardCorpo>
      </Card>
    </div>
  );
}
