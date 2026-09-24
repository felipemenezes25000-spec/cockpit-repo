import { Repeat2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { formatarData } from "@/lib/format";
import {
  ROTULO_ACOMPANHAMENTO,
  retornosEmAberto,
  type JanelaContato,
} from "@/server/consultas/retornos";

const LIMITE = 5;

/**
 * Nenhuma fase é vermelha: retorno é oportunidade de cuidado, não falha.
 * "Passou do período" é a paciente que precisa de um telefonema — atenção.
 */
const FASE = {
  aguardando: {
    rotulo: "Ainda cedo",
    barra: "bg-outline-variant",
    texto: "text-outline",
    fundo: "bg-white/58",
    borda: "border-card-border/75",
  },
  no_periodo: {
    rotulo: "No período",
    barra: "bg-informativo",
    texto: "text-informativo-texto",
    fundo: "bg-informativo-fundo/28",
    borda: "border-informativo-borda/45",
  },
  passou: {
    rotulo: "Passou do período",
    barra: "bg-atencao-acento",
    texto: "text-atencao",
    fundo: "bg-atencao-fundo/32",
    borda: "border-atencao-borda/45",
  },
} as const;

export function descreverSugerido(fase: JanelaContato["fase"], diasAteSugerido: number): string {
  const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`);
  if (diasAteSugerido >= 0) return `sugerido em ${dias(diasAteSugerido)}`;
  const passados = Math.abs(diasAteSugerido);
  return fase === "passou" ? `${dias(passados)} além do sugerido` : `sugerido há ${dias(passados)}`;
}

function BarraJanela({ janela }: { janela: JanelaContato }) {
  const fase = FASE[janela.fase];
  const largura = Math.round(janela.progresso * 100);

  return (
    <div className="mt-4">
      <div
        className="relative h-2 w-full overflow-hidden rounded-full border border-card-border/55 bg-white/58 shadow-[inset_0_1px_2px_rgba(15,35,58,0.05)]"
        role="img"
        aria-label={`${fase.rotulo}, dentro de um intervalo sugerido de ${janela.intervaloSugerido} dias`}
      >
        <span aria-hidden="true" className="absolute inset-y-0 right-0 left-[85%] bg-secondary-fixed/75" />
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-0 left-0 rounded-full shadow-[0_0_14px_currentColor] transition-[width] duration-500 ease-out", fase.barra)}
          style={{ width: `${largura}%` }}
        />
      </div>

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold", fase.texto)}>
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", fase.barra)} />
          {fase.rotulo}
        </span>
        <span className="tabular text-xs text-outline">
          {descreverSugerido(janela.fase, janela.diasAteSugerido)}
        </span>
      </div>
    </div>
  );
}

export async function ProximosRetornos() {
  const retornos = await retornosEmAberto();
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
    <Card className="relative overflow-hidden">
      <span aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 size-52 rounded-full bg-secondary-fixed/38 blur-3xl" />
      <CardCabecalho
        titulo="Próximos retornos"
        descricao="Oportunidades de acompanhamento, das mais antigas para as mais recentes."
      />

      <CardCorpo className="relative">
        <Lista rotulo="Pacientes para retorno">
          {visiveis.map((retorno) => {
            const fase = FASE[retorno.janela.fase];
            return (
              <ItemLista
                key={retorno.id}
                className={cn(
                  "premium-interactive relative overflow-hidden border shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]",
                  fase.fundo,
                  fase.borda,
                )}
              >
                <span aria-hidden="true" className={cn("absolute inset-y-3 left-0 w-[3px] rounded-r-full", fase.barra)} />
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pl-1">
                  <span className="truncate text-sm font-semibold text-on-surface">
                    {retorno.paciente}
                  </span>
                  <span className="rounded-[var(--radius-tag)] border border-card-border/70 bg-white/65 px-2 py-1 text-[0.625rem] font-bold tracking-wider text-outline uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
                    {ROTULO_ACOMPANHAMENTO[retorno.situacao]}
                  </span>
                </div>

                <p className="mt-1.5 pl-1 text-sm leading-5 text-outline">
                  {retorno.procedimento} · último atendimento em{" "}
                  {formatarData(retorno.ultimoAtendimento)}
                </p>

                <div className="pl-1"><BarraJanela janela={retorno.janela} /></div>
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      <CardRodape className="relative flex flex-wrap items-center justify-between gap-3">
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
