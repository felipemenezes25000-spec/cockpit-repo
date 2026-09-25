import { Cake, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { BotaoLink } from "@/components/ui/button";
import { ConviteContato } from "@/components/relacionamento/convite-contato";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { CardRecolhivel } from "@/components/ui/card-recolhivel";
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
        <CardCabecalho titulo="Aniversários do mês" />
        <EstadoVazio icone={Cake} titulo="Nenhum aniversário neste mês" descricao="As pacientes que fazem aniversário no mês aparecem aqui para contato." />
      </Card>
    );
  }

  return (
    <CardRecolhivel
        id="vg-aniversarios"
        titulo="Aniversariantes do mês"
        descricao={`${aniversariantes.length} ${aniversariantes.length === 1 ? "paciente faz" : "pacientes fazem"} aniversário neste mês${hoje > 0 ? ` · ${hoje} hoje` : ""}`}
        acao={hoje > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-controle)] border border-primary-fixed bg-selecao px-2.5 py-1.5 text-xs font-semibold text-primary">
            <span className="flex size-5 items-center justify-center rounded-[var(--radius-tag)] bg-surface"><Cake aria-hidden="true" size={12} strokeWidth={1.7} /></span>
            {hoje === 1 ? "1 aniversário hoje" : `${hoje} aniversários hoje`}
          </span>
        ) : undefined}
    >

      <CardCorpo className="relative">
        <Lista rotulo="Aniversariantes do mês">
          {visiveis.map((pessoa) => {
            const hojeEhODia = pessoa.emDias === 0;

            return (
              <ItemLista
                key={pessoa.id}
                className={cn(
                  "premium-interactive relative flex flex-wrap items-center gap-x-4 gap-y-3 overflow-hidden border",
                  hojeEhODia
                    ? "border-primary-fixed bg-selecao"
                    : "border-card-border bg-surface",
                )}
              >
                {hojeEhODia ? <span aria-hidden="true" className="absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-primary-container" /> : null}
                <Avatar nome={pessoa.nome} tom={hojeEhODia ? "marca" : "neutro"} />

                <div className="relative min-w-[11rem] flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="truncate text-sm font-semibold text-on-surface">{pessoa.nome}</span>
                    {hojeEhODia ? (
                      <span className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] border border-primary-fixed bg-primary px-2 py-0.5 text-[0.58rem] font-bold tracking-wide text-on-primary uppercase">
                        <Sparkles aria-hidden="true" size={9} strokeWidth={1.9} /> hoje
                      </span>
                    ) : null}
                  </div>
                  <span className={cn("tabular mt-1 block text-xs font-medium", hojeEhODia ? "text-primary" : "text-outline")}>
                    {formatarDiaMes(pessoa.data)} · {descreverPrazo(pessoa.emDias)}
                  </span>
                  <p className="mt-1 truncate text-sm text-outline">
                    {pessoa.ultimoAtendimento ? `Último atendimento em ${formatarData(pessoa.ultimoAtendimento)}` : "Ainda sem atendimento concluído"}
                  </p>
                </div>

                <ConviteContato pacienteId={pessoa.id} nome={pessoa.nome} telefone={pessoa.telefone} tipo="aniversario" compacto />
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      <CardRodape className="relative flex flex-wrap items-center justify-between gap-3 text-outline">
        <span>O WhatsApp abre com o parabéns escrito; quem envia é a equipe. Depois, marque como enviada para registrar o contato.</span>
        <BotaoLink href="/relacionamento?aba=aniversarios" tamanho="sm">
          {aniversariantes.length > LIMITE ? `Ver os ${aniversariantes.length}` : "Abrir em Relacionamento"}
        </BotaoLink>
      </CardRodape>
    </CardRecolhivel>
  );
}
