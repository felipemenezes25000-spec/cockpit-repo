"use client";

import { Ban, LoaderCircle } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AREA_TEXTO, Campo } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { cancelarDocumento, type EstadoDocumento } from "@/server/acoes/documentos";

const INICIAL: EstadoDocumento = { erro: null };

function Confirmar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-surface px-4 text-sm font-medium text-negativo transition-colors hover:bg-negativo-fundo disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
      ) : null}
      Cancelar em definitivo
    </button>
  );
}

/**
 * Cancelar não apaga: a linha fica, com o motivo. Documento é memória do que
 * foi acordado, e quem apaga esconde.
 *
 * Só aparece enquanto o documento está apenas emitido. Assinado não cancela —
 * para corrigir, emite-se outro apontando para ele.
 */
export function CancelarDocumento({ documentoId }: { documentoId: string }) {
  const [estado, cancelar] = useActionState(cancelarDocumento, INICIAL);
  const [aberto, setAberto] = useState(false);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="inline-flex h-9 items-center gap-2 rounded-[var(--radius-cartao)] px-3 text-sm font-medium text-outline transition-colors hover:bg-negativo-fundo hover:text-negativo"
      >
        <Ban aria-hidden="true" size={16} strokeWidth={1.75} />
        Cancelar documento
      </button>
    );
  }

  return (
    <form
      action={cancelar}
      className="flex w-full flex-col gap-3 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo p-4"
    >
      <input type="hidden" name="id" value={documentoId} />

      <p className="text-xs leading-relaxed text-negativo">
        Use quando o documento foi emitido por engano — modelo errado, paciente
        errada. Ele continua na lista, marcado como cancelado e com o motivo à
        vista.
      </p>

      <Campo
        id={`cancelar-${documentoId}`}
        rotulo="Motivo"
        obrigatorio
        dica="Fica visível na ficha do documento."
      >
        <textarea
          id={`cancelar-${documentoId}`}
          name="motivo"
          required
          minLength={5}
          maxLength={400}
          rows={2}
          placeholder="Emitido para a paciente errada."
          className={cn(AREA_TEXTO, "min-h-16")}
        />
      </Campo>

      {estado.erro ? (
        <p role="alert" className="text-xs font-medium text-error">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <Confirmar />
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="h-9 px-3 text-sm font-medium text-negativo hover:underline"
        >
          Voltar
        </button>
      </div>
    </form>
  );
}
