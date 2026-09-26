"use client";

import { CircleCheckBig } from "lucide-react";
import { useId } from "react";
import { classeDeEntrada } from "@/components/ui/field";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import { FORMAS_EM_ORDEM, ROTULO_FORMA } from "@/lib/venda";
import { mudarSituacaoDespesa } from "@/server/acoes/despesas";

/** Pagamento em linha: data, forma e um clique. */
export function PagarDespesa({
  despesaId,
  dataPadrao,
}: {
  despesaId: string;
  dataPadrao: string;
}) {
  const id = useId();

  return (
    <FormularioDeAcao acao={mudarSituacaoDespesa} campos={{ id: despesaId, acao: "pagar" }}>
      <div className="grid min-w-0 grid-cols-1 gap-3 rounded-[var(--radius-cartao)] bg-surface-container-low p-3 sm:grid-cols-[minmax(9rem,auto)_minmax(10rem,1fr)_auto] sm:items-end sm:p-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-pago-em`} className="rotulo text-on-surface-variant">
            Paga em
          </label>
          <input
            id={`${id}-pago-em`}
            type="date"
            name="pago_em"
            defaultValue={dataPadrao}
            max={dataPadrao}
            required
            className={`${classeDeEntrada({ altura: "compacta" })} bg-surface`}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={`${id}-forma`} className="rotulo text-on-surface-variant">
            Forma
          </label>
          <select
            id={`${id}-forma`}
            name="forma"
            defaultValue="pix"
            className={`${classeDeEntrada({ altura: "compacta" })} bg-surface`}
          >
            {FORMAS_EM_ORDEM.map((f) => (
              <option key={f} value={f}>
                {ROTULO_FORMA[f]}
              </option>
            ))}
          </select>
        </div>

        <BotaoDeAcao tom="primario" icone={<CircleCheckBig strokeWidth={1.75} />} className="w-full sm:w-auto">
          Marcar como paga
        </BotaoDeAcao>
      </div>
    </FormularioDeAcao>
  );
}
