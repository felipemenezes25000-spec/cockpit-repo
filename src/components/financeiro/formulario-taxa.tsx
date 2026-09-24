"use client";

import { CircleAlert, Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { TipoCartao } from "@/lib/venda";
import type { EstadoTaxa } from "@/server/acoes/taxas-cartao";

type Acao = (estado: EstadoTaxa, dados: FormData) => Promise<EstadoTaxa>;

const INICIAL: EstadoTaxa = { erros: {} };

export type ValoresTaxa = {
  operadora: string;
  tipo: TipoCartao;
  parcelas: string;
  percentual: string;
};

export function FormularioTaxa({
  acao,
  inicial,
  taxaId,
  rotuloSalvar,
}: {
  acao: Acao;
  inicial?: Partial<ValoresTaxa>;
  taxaId?: string;
  rotuloSalvar: string;
}) {
  const [estado, enviar] = useActionState(acao, INICIAL);
  const partida: ValoresTaxa = { operadora: "", tipo: "credito", parcelas: "1", percentual: "", ...inicial };
  const de = (campo: keyof ValoresTaxa) => estado.valores?.[campo] ?? String(partida[campo]);
  const [tipo, setTipo] = useState<TipoCartao>(de("tipo") as TipoCartao);
  const [parcelas, setParcelas] = useState(de("parcelas"));
  const erros = estado.erros;

  return (
    <form action={enviar} className="flex flex-col gap-6" noValidate>
      {taxaId ? <input type="hidden" name="id" value={taxaId} /> : null}

      {erros.geral ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-negativo">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo id="operadora" rotulo="Operadora ou maquininha" obrigatorio erro={erros.operadora}>
          <input id="operadora" name="operadora" type="text" required maxLength={60} defaultValue={de("operadora")} placeholder="Stone, PagSeguro, Rede…" className={cn(ENTRADA, erros.operadora && ENTRADA_ERRO)} />
        </Campo>

        <Campo id="tipo" rotulo="Tipo" obrigatorio erro={erros.tipo}>
          <select id="tipo" name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoCartao)} className={cn(ENTRADA, erros.tipo && ENTRADA_ERRO)}>
            <option value="credito">Crédito</option>
            <option value="debito">Débito</option>
          </select>
        </Campo>

        <Campo id="parcelas" rotulo="Parcelas" obrigatorio erro={erros.parcelas} dica={tipo === "debito" ? "Débito não parcela: fica 1." : "Uma linha por parcelamento."}>
          <input id="parcelas" name="parcelas" type="number" inputMode="numeric" min={1} max={24} value={tipo === "debito" ? "1" : parcelas} onChange={(e) => setParcelas(e.target.value)} readOnly={tipo === "debito"} className={cn(ENTRADA, "tabular", erros.parcelas && ENTRADA_ERRO)} />
        </Campo>

        <Campo id="percentual" rotulo="Taxa (%)" obrigatorio erro={erros.percentual} dica="Já incluindo a antecipação do parcelado.">
          <input id="percentual" name="percentual" type="text" inputMode="decimal" required defaultValue={de("percentual")} placeholder="6,5" className={cn(ENTRADA, "tabular", erros.percentual && ENTRADA_ERRO)} />
        </Campo>
      </div>

      <p className="rounded-[var(--radius-cartao)] border border-informativo-borda bg-informativo-fundo px-3.5 py-3 text-xs leading-5 text-on-surface-variant">
        Alterar a tabela vale só para as próximas vendas: cada venda guarda a própria cópia da taxa do momento.
      </p>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
        <BotaoDeAcao tom="primario" tamanho="md" icone={<Save aria-hidden="true" strokeWidth={1.75} />} rotuloPendente="Salvando taxa…">
          {rotuloSalvar}
        </BotaoDeAcao>
        <Link href="/financeiro/taxas" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-surface-container-low hover:text-primary active:scale-[0.985]">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
