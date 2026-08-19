"use client";

import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { alternarArquivamento } from "@/server/acoes/pacientes";

function Botao({ arquivada }: { arquivada: boolean }) {
  const { pending } = useFormStatus();
  const Icone = arquivada ? ArchiveRestore : Archive;

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-4 text-sm font-medium text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />
      ) : (
        <Icone aria-hidden="true" size={16} strokeWidth={1.75} />
      )}
      {arquivada ? "Reativar paciente" : "Arquivar paciente"}
    </button>
  );
}

/**
 * Arquivar tira a paciente da lista sem apagar nada — o histórico continua.
 *
 * A confirmação é do navegador de propósito: um diálogo próprio pediria estado,
 * foco preso e tecla Esc para uma pergunta de uma linha só, e a ação é
 * reversível no clique seguinte.
 */
export function BotaoArquivar({
  pacienteId,
  arquivada,
  nome,
}: {
  pacienteId: string;
  arquivada: boolean;
  nome: string;
}) {
  return (
    <form
      action={alternarArquivamento}
      onSubmit={(evento) => {
        const mensagem = arquivada
          ? `Reativar ${nome}? Ela volta a aparecer na lista de pacientes ativas.`
          : `Arquivar ${nome}? O histórico é mantido e ela sai da lista de ativas. Dá para reativar depois.`;

        if (!window.confirm(mensagem)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={pacienteId} />
      <input type="hidden" name="arquivar" value={arquivada ? "nao" : "sim"} />
      <Botao arquivada={arquivada} />
    </form>
  );
}
