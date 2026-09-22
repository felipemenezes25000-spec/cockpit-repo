import { Cake } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { descreverPrazo, formatarData, formatarDiaMes } from "@/lib/format";
import { aniversariantesDoMes } from "@/server/consultas/aniversarios";

const LIMITE = 5;

export async function Aniversariantes() {
  const aniversariantes = await aniversariantesDoMes();
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
        descricao={`${aniversariantes.length} ${aniversariantes.length === 1 ? "paciente faz" : "pacientes fazem"} aniversário neste mês`}
      />

      <CardCorpo>
        <Lista rotulo="Aniversariantes do mês">
          {visiveis.map((pessoa) => {
            const hojeEhODia = pessoa.emDias === 0;

            return (
              <ItemLista
                key={pessoa.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3"
              >
                <Avatar nome={pessoa.nome} tom={hojeEhODia ? "verde" : "neutro"} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="truncate text-sm font-medium text-on-surface">
                      {pessoa.nome}
                    </span>
                    <span
                      className={cn(
                        "tabular text-xs font-medium",
                        hojeEhODia ? "text-primary" : "text-outline",
                      )}
                    >
                      {formatarDiaMes(pessoa.data)} · {descreverPrazo(pessoa.emDias)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-outline">
                    {pessoa.ultimoAtendimento
                      ? `Último atendimento em ${formatarData(pessoa.ultimoAtendimento)}`
                      : "Ainda sem atendimento concluído"}
                  </p>
                </div>

                <BotaoLink href="/relacionamento?aba=aniversarios" tamanho="sm">
                  Preparar mensagem
                </BotaoLink>
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      <CardRodape className="text-outline">
        O texto é preparado em Relacionamento; a equipe envia a mensagem manualmente.
      </CardRodape>
    </Card>
  );
}
