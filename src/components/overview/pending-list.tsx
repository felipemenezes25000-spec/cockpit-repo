import { CheckCircle2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { BotaoLink } from "@/components/ui/button";
import { Card, CardCabecalho, CardCorpo, CardRodape } from "@/components/ui/card";
import { EstadoVazio } from "@/components/ui/empty-state";
import { ItemLista, Lista } from "@/components/ui/data-list";
import { PrioridadeTag } from "@/components/ui/priority-tag";
import { descreverPrazo, formatarData } from "@/lib/format";
import { hoje, somarDias } from "@/lib/dates";
import { nomePaciente } from "@/data/patients";
import { ROTULO_PENDENCIA, pendenciasOrdenadas } from "@/data/pendings";

const LIMITE = 6;

export function PendenciasDaClinica() {
  const todas = pendenciasOrdenadas();
  const visiveis = todas.slice(0, LIMITE);
  const atrasadas = todas.filter((p) => p.prazoEmDias < 0).length;

  if (todas.length === 0) {
    return (
      <Card>
        <CardCabecalho titulo="Pendências da clínica" />
        <EstadoVazio
          icone={CheckCircle2}
          titulo="Nada em aberto"
          descricao="Quando surgir uma anamnese, um termo ou uma cobrança pendente, ela aparece aqui."
        />
      </Card>
    );
  }

  return (
    <Card className="flex flex-col">
      <CardCabecalho
        titulo="Pendências da clínica"
        descricao={
          atrasadas > 0 ? (
            <>
              {todas.length} em aberto ·{" "}
              <span className="font-medium text-error">{atrasadas} fora do prazo</span>
            </>
          ) : (
            `${todas.length} em aberto`
          )
        }
      />

      <CardCorpo className="rolagem-discreta max-h-[560px] flex-1 overflow-y-auto">
        <Lista rotulo="Pendências da clínica">
          {visiveis.map((pendencia) => {
            const atrasada = pendencia.prazoEmDias < 0;
            const data = somarDias(hoje(), pendencia.prazoEmDias);

            return (
              <ItemLista key={pendencia.id}>
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-[var(--radius-tag)] bg-surface-container-low px-2 py-1 text-[0.625rem] font-bold tracking-wider text-outline uppercase">
                      {ROTULO_PENDENCIA[pendencia.tipo]}
                    </span>
                    <span className="truncate text-sm font-medium text-on-surface">
                      {nomePaciente(pendencia.pacienteId)}
                    </span>
                  </div>

                  <Link
                    href={pendencia.destino}
                    aria-label={`Resolver: ${pendencia.detalhe}`}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-cartao)] px-3 py-1.5 text-xs font-medium transition-colors",
                      /* A pendência mais urgente carrega o botão cheio */
                      atrasada
                        ? "bg-primary-container text-on-primary hover:bg-primary"
                        : "border border-primary text-primary hover:bg-surface-container-low",
                    )}
                  >
                    Resolver
                    <ChevronRight aria-hidden="true" size={14} strokeWidth={1.75} />
                  </Link>
                </div>

                <p className="mb-3 text-sm text-on-surface-variant">{pendencia.detalhe}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <PrioridadeTag prioridade={pendencia.prioridade} />
                  <span
                    className={cn(
                      "tabular text-xs",
                      atrasada ? "font-medium text-error" : "text-outline",
                    )}
                  >
                    {atrasada ? "Venceu " : "Prazo "}
                    {descreverPrazo(pendencia.prazoEmDias)} · {formatarData(data)}
                  </span>
                </div>
              </ItemLista>
            );
          })}
        </Lista>
      </CardCorpo>

      {todas.length > LIMITE ? (
        <CardRodape className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-outline">
            {todas.length - LIMITE} pendências além destas
          </span>
          <BotaoLink href="/relacionamento" tamanho="sm">
            Ver todas
          </BotaoLink>
        </CardRodape>
      ) : null}
    </Card>
  );
}
