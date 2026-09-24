"use client";

import { CircleAlert, CircleCheckBig } from "lucide-react";
import { useActionState, useState } from "react";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import { paraCentavos } from "@/lib/moeda";
import { confirmarRecebimento, type EstadoVenda } from "@/server/acoes/vendas";

const INICIAL: EstadoVenda = { erros: {} };

/** Confirma o que entrou; divergência continua explícita antes do envio. */
export function ConfirmarRecebimento({
  recebimentoId,
  vendaId,
  liquidoPrevisto,
  dataPadrao,
}: {
  recebimentoId: string;
  vendaId: string;
  liquidoPrevisto: number;
  dataPadrao: string;
}) {
  const [estado, enviar] = useActionState(confirmarRecebimento, INICIAL);
  const [valor, setValor] = useState(liquidoPrevisto.toFixed(2).replace(".", ","));
  const valorCent = valor.trim() ? paraCentavos(valor) : null;
  const divergente = valorCent !== null && valorCent !== Math.round(liquidoPrevisto * 100);
  const zero = valorCent === 0;
  const erros = estado.erros;

  return (
    <form action={enviar} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="recebimento_id" value={recebimentoId} />
      <input type="hidden" name="venda_id" value={vendaId} />

      {erros.geral ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3 py-2.5 text-xs leading-5 text-negativo">
          <CircleAlert aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo id="recebido_em" rotulo="Entrou em" obrigatorio erro={erros.recebido_em}>
          <input id="recebido_em" name="recebido_em" type="date" max={dataPadrao} defaultValue={estado.valores?.recebido_em ?? dataPadrao} className={cn(ENTRADA, erros.recebido_em && ENTRADA_ERRO)} />
        </Campo>

        <Campo id="valor_recebido" rotulo="Valor que entrou (R$)" obrigatorio erro={erros.valor_recebido} dica={`Previsto: ${formatarMoeda(liquidoPrevisto)}.`}>
          <input id="valor_recebido" name="valor_recebido" type="text" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} className={cn(ENTRADA, "tabular", erros.valor_recebido && ENTRADA_ERRO)} />
        </Campo>
      </div>

      {divergente ? (
        <p className="rounded-[var(--radius-cartao)] border border-atencao-borda bg-atencao-fundo px-3.5 py-3 text-xs leading-5 text-atencao">
          Valor diferente do previsto: será registrado como <strong>recebido com divergência</strong>.
          {zero ? " Atenção: você está confirmando que não entrou nada. Recebimento confirmado não se desfaz." : null}
        </p>
      ) : null}

      <div>
        <BotaoDeAcao
          tom="primario"
          tamanho="md"
          icone={<CircleCheckBig aria-hidden="true" strokeWidth={1.75} />}
          rotuloPendente="Confirmando recebimento…"
        >
          Confirmar recebimento
        </BotaoDeAcao>
      </div>
    </form>
  );
}
