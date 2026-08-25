"use client";

import { CircleCheckBig, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { ENTRADA } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { FORMAS_EM_ORDEM, ROTULO_FORMA } from "@/lib/venda";
import { mudarSituacaoDespesa } from "@/server/acoes/despesas";

function Botao() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-cartao)] bg-primary-container px-4 text-xs font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
      ) : (
        <CircleCheckBig aria-hidden="true" size={14} strokeWidth={1.75} />
      )}
      Marcar como paga
    </button>
  );
}

/** Pagamento em linha: data, forma e um clique. */
export function PagarDespesa({
  despesaId,
  dataPadrao,
}: {
  despesaId: string;
  dataPadrao: string;
}) {
  return (
    <form
      action={mudarSituacaoDespesa}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="id" value={despesaId} />
      <input type="hidden" name="acao" value="pagar" />

      <label className="flex flex-col gap-1">
        <span className="rotulo">Paga em</span>
        <input
          type="date"
          name="pago_em"
          defaultValue={dataPadrao}
          required
          className={cn(ENTRADA, "h-9 w-auto")}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="rotulo">Forma</span>
        <select name="forma" defaultValue="pix" className={cn(ENTRADA, "h-9 w-auto")}>
          {FORMAS_EM_ORDEM.map((f) => (
            <option key={f} value={f}>
              {ROTULO_FORMA[f]}
            </option>
          ))}
        </select>
      </label>

      <Botao />
    </form>
  );
}
