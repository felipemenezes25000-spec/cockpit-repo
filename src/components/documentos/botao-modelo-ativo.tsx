"use client";

import { Archive, ArchiveRestore, LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { alternarModeloAtivo } from "@/server/acoes/documentos";

function Botao({ ativo }: { ativo: boolean }) {
  const { pending } = useFormStatus();
  const Icone = ativo ? Archive : ArchiveRestore;

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-tag)] px-2.5 text-xs font-medium text-outline transition-colors hover:bg-surface-container-low hover:text-primary disabled:opacity-55"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
      ) : (
        <Icone aria-hidden="true" size={14} strokeWidth={1.75} />
      )}
      {ativo ? "Aposentar" : "Reativar"}
    </button>
  );
}

/**
 * Aposentar tira o modelo da tela de emissão sem apagar nada. Ele continua
 * explicando os documentos que já gerou — e esses documentos não dependem
 * dele de todo modo, porque carregam o texto congelado.
 */
export function BotaoModeloAtivo({
  modeloId,
  ativo,
  nome,
}: {
  modeloId: string;
  ativo: boolean;
  nome: string;
}) {
  return (
    <form
      action={alternarModeloAtivo}
      onSubmit={(evento) => {
        const mensagem = ativo
          ? `Aposentar "${nome}"? Ele sai da lista de emissão. Os documentos já emitidos continuam intactos.`
          : `Reativar "${nome}"? Ele volta a aparecer na tela de emissão.`;

        if (!window.confirm(mensagem)) evento.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={modeloId} />
      <input type="hidden" name="ativar" value={ativo ? "nao" : "sim"} />
      <Botao ativo={ativo} />
    </form>
  );
}
