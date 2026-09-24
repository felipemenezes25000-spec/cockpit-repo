import { Cake, Sparkles } from "lucide-react";
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
  const hoje = aniversariantes.filter((pessoa) => pessoa.emDias === 0).length;

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
    <Card className="relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 right-[8%] size-56 rounded-full bg-primary-fixed/38 blur-3xl" />
      <CardCabecalho
        titulo="Aniversariantes do mês"
        descricao={`${aniversariantes.length} ${aniversariantes.length === 1 ? "paciente faz" : "pacientes fazem"} aniversário neste mês${hoje > 0 ? ` · ${hoje} hoje` : ""}`}
        acao={hoje > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-[9px] border border-primary/10 bg-primary-fixed/50 px-2.5 py-1.5 text-xs font-semibold text-primary shadow-[var(--shadow-cartao)]">
            <Sparkles aria-hidden="true" size={13} strokeWidth={1.7} />
            Hoje
          </span>
        ) : undefined}
      />

      <CardCorpo className="relative">
        <Lista rotulo="Aniversariantes do mês">
          {visiveis.map((pessoa) => {
            const hojeEhODia = pessoa.emDias === 0;

            return (
              <ItemLista
                key={pessoa.id}
                className={cn(
                  "premium-interactive relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden border shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                  hojeEhODia
                    ? "border-primary/15 bg-[linear-gradient(135deg,rgba(209,232,255,0.52),rgba(255,255,255,0.72))]"
                    : "border-card-border/70 bg-white/58",
                )}
              >
                {hojeEhODia ? <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-primary-container shadow-[0_0_12px_rgba(10,110,209,0.28)]" /> : null}
                <Avatar nome={pessoa.nome} tom={hojeEhODia ? "marca" : "neutro"} />

                <div className="min-w-[11rem] flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-semibold text-on-surface">
                      {pessoa.nome}
                    </span>
                    {hojeEhODia ? (
                      <span className="inline-flex rounded-[6px] bg-primary px-1.5 py-0.5 text-[0.58rem] font-bold tracking-wide text-on-primary uppercase">aniversário hoje</span>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "tabular mt-1 block text-xs font-medium",
                      hojeEhODia ? "text-primary" : "text-outline",
                    )}
                  >
                    {formatarDiaMes(pessoa.data)} · {descreverPrazo(pessoa.emDias)}
                  </span>
                  <p className="mt-1 truncate text-sm text-outline">
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

      <CardRodape className="relative text-outline">
        O texto é preparado em Relacionamento; a equipe envia a mensagem manualmente.
      </CardRodape>
    </Card>
  );
}
