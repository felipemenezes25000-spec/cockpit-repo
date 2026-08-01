import { Repeat2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { formatarData } from "@/lib/format";
import { hoje, somarDias } from "@/lib/dates";
import { nomePaciente } from "@/data/patients";
import { procedimentoPorId } from "@/data/procedures";
import {
  ROTULO_ACOMPANHAMENTO,
  janelaDeContato,
  retornosOrdenados,
} from "@/data/returns";
import type { Retorno } from "@/data/types";

const LIMITE = 5;

const FASE = {
  aguardando: {
    rotulo: "Ainda cedo",
    barra: "bg-outline-variant",
    texto: "text-outline",
  },
  no_periodo: {
    rotulo: "No período",
    barra: "bg-primary-container",
    texto: "text-primary",
  },
  passou: {
    rotulo: "Passou do período",
    barra: "bg-sit-aguardando",
    texto: "text-sit-aguardando",
  },
} as const;

/**
 * Barra da janela de contato: mostra onde a paciente está dentro do intervalo
 * sugerido para o retorno. Os prazos são demonstrativos e ainda precisam ser
 * definidos pela equipe — não são recomendação clínica.
 */
function JanelaContato({ retorno }: { retorno: Retorno }) {
  const janela = janelaDeContato(retorno);
  const fase = FASE[janela.fase];
  const largura = Math.round(janela.progresso * 100);

  return (
    <div className="mt-3">
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-container"
        role="img"
        aria-label={`${fase.rotulo}: ${retorno.ultimoAtendimentoEmDias} de ${janela.intervaloSugerido} dias sugeridos`}
      >
        {/* Faixa sugerida de contato, a partir de 85% do intervalo */}
        <span
          aria-hidden="true"
          className="absolute inset-y-0 right-0 left-[85%] bg-secondary-fixed"
        />
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 rounded-full", fase.barra)}
          style={{ width: `${largura}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
        <span className={cn("text-xs font-medium", fase.texto)}>{fase.rotulo}</span>
        <span className="tabular text-xs text-outline">
          {janela.diasAteSugerido >= 0
            ? `sugerido em ${janela.diasAteSugerido} dias`
            : `${Math.abs(janela.diasAteSugerido)} dias além do sugerido`}
        </span>
      </div>
    </div>
  );
}

export function ProximosRetornos() {
  const retornos = retornosOrdenados();
  const visiveis = retornos.slice(0, LIMITE);

  if (retornos.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Próximos retornos" />
        <EstadoVazio
          icone={Repeat2}
          titulo="Nenhum retorno em aberto"
          descricao="Pacientes que se aproximam do período sugerido de contato aparecem aqui."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardCabecalho
        titulo="Próximos retornos"
        descricao="Oportunidades de acompanhamento, das mais antigas para as mais recentes."
      />

      <CardCorpo>
        <Lista rotulo="Pacientes para retorno">
          {visiveis.map((retorno) => {
            const procedimento = procedimentoPorId(retorno.procedimentoId);
            const ultimaData = somarDias(hoje(), -retorno.ultimoAtendimentoEmDias);

            return (
              <ItemLista key={retorno.id}>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <span className="truncate text-sm font-medium text-on-surface">
                    {nomePaciente(retorno.pacienteId)}
                  </span>
                  <span className="rounded-[var(--radius-tag)] bg-surface-container-low px-2 py-1 text-[0.625rem] font-bold tracking-wider text-outline uppercase">
                    {ROTULO_ACOMPANHAMENTO[retorno.situacao]}
                  </span>
                </div>

                <p className="mt-1 text-sm text-outline">
                  {procedimento?.nome} · último atendimento em {formatarData(ultimaData)}
                </p>

                <JanelaContato retorno={retorno} />
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      <CardRodape className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-outline">
          Períodos sugeridos são demonstrativos e ainda serão definidos pela equipe.
        </span>
        <BotaoLink href="/relacionamento" tamanho="sm">
          Abrir relacionamento
        </BotaoLink>
      </CardRodape>
    </Card>
  );
}
