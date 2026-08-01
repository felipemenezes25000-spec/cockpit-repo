import { Cake } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { BotaoIndisponivel } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { descreverPrazo, formatarData, formatarDiaMes } from "@/lib/format";
import { hoje, somarDias } from "@/lib/dates";
import { aniversariantesDoMes } from "@/data/birthdays";

const LIMITE = 5;

export function Aniversariantes() {
  const aniversariantes = aniversariantesDoMes();
  const visiveis = aniversariantes.slice(0, LIMITE);

  if (aniversariantes.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Aniversariantes do mês" />
        <EstadoVazio
          icone={Cake}
          titulo="Nenhum aniversário neste mês"
          descricao="As pacientes que fazem aniversário no mês aparecem aqui para contato."
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardCabecalho
        titulo="Aniversariantes do mês"
        descricao={`${aniversariantes.length} pacientes fazem aniversário neste mês`}
      />

      <CardCorpo>
        <Lista rotulo="Aniversariantes do mês">
          {visiveis.map(({ paciente, data, emDias }) => {
            const ultimo = somarDias(hoje(), -paciente.ultimoAtendimentoEmDias);
            const hojeEhODia = emDias === 0;

            return (
              <ItemLista
                key={paciente.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3"
              >
                <Avatar nome={paciente.nome} tom={hojeEhODia ? "verde" : "neutro"} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-sm font-medium text-on-surface">
                      {paciente.nome}
                    </span>
                    <span
                      className={cn(
                        "tabular text-xs font-medium",
                        hojeEhODia ? "text-primary" : "text-outline",
                      )}
                    >
                      {formatarDiaMes(data)} · {descreverPrazo(emDias)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-outline">
                    Último atendimento em {formatarData(ultimo)}
                  </p>
                </div>

                <BotaoIndisponivel motivo="O envio de mensagens chega em uma próxima etapa">
                  Enviar mensagem
                </BotaoIndisponivel>
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      <CardRodape className="text-outline">
        O envio de mensagens será configurado no módulo Relacionamento.
      </CardRodape>
    </Card>
  );
}
