"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoRelacionamento } from "@/lib/relacionamento";

type Acao = (estado: EstadoRelacionamento, dados: FormData) => Promise<EstadoRelacionamento>;

function BotaoEnviar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-xs font-medium text-primary transition-colors hover:bg-surface-container-low disabled:opacity-60">
    {pending && <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />}
    {pending ? "Salvando…" : rotulo}
  </button>;
}

export function AcaoInline({ acao, campos, rotulo }: { acao: Acao; campos: Record<string, string>; rotulo: string }) {
  const [estado, enviar] = useActionState(acao, { erros: {} } as EstadoRelacionamento);
  return <form action={enviar} className="inline-flex flex-wrap items-center gap-2">
    {Object.entries(campos).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}
    <BotaoEnviar rotulo={rotulo} />
    {estado.erros.geral && <span role="alert" className="text-xs text-error">{estado.erros.geral}</span>}
    {estado.mensagem && <span role="status" className="text-xs text-positivo">{estado.mensagem}</span>}
  </form>;
}
