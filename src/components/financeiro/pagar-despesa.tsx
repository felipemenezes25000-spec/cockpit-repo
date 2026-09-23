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
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-pago-em`} className="rotulo">
            Paga em
          </label>
          <input
            id={`${id}-pago-em`}
            type="date"
            name="pago_em"
            defaultValue={dataPadrao}
            max={dataPadrao}
            required
            className={classeDeEntrada({ altura: "compacta", largura: "auto" })}
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-forma`} className="rotulo">
            Forma
          </label>
          <select
            id={`${id}-forma`}
            name="forma"
            defaultValue="pix"
            className={classeDeEntrada({ altura: "compacta", largura: "auto" })}
          >
            {FORMAS_EM_ORDEM.map((f) => (
              <option key={f} value={f}>
                {ROTULO_FORMA[f]}
              </option>
            ))}
          </select>
        </div>

        <BotaoDeAcao tom="primario" icone={<CircleCheckBig strokeWidth={1.75} />}>
          Marcar como paga
        </BotaoDeAcao>
      </div>
    </FormularioDeAcao>
  );
}
