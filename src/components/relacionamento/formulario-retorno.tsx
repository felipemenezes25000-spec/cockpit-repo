"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { EstadoRelacionamento } from "@/lib/relacionamento";
import { criarRetorno } from "@/server/acoes/relacionamento";

function Enviar() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary hover:bg-primary disabled:opacity-60">
    {pending && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
    {pending ? "Salvando…" : "Registrar retorno"}
  </button>;
}

export function FormularioRetorno() {
  const [estado, enviar] = useActionState(criarRetorno, { erros: {} } as EstadoRelacionamento);
  const { erros, valores = {} } = estado;

  return <form action={enviar} noValidate className="space-y-5">
    {erros.geral && <p role="alert" className="rounded-[var(--radius-cartao)] bg-error-container px-4 py-3 text-sm text-on-error-container">{erros.geral}</p>}
    <SeletorPaciente inicial={null} erro={erros.paciente_id} />
    <Campo id="sugerido_para" rotulo="Data combinada para contato" obrigatorio erro={erros.sugerido_para}>
      <input id="sugerido_para" name="sugerido_para" type="date" defaultValue={valores.sugerido_para} className={cn(ENTRADA, erros.sugerido_para && ENTRADA_ERRO)} />
    </Campo>
    <Campo id="observacoes" rotulo="Observações" erro={erros.observacoes}>
      <textarea id="observacoes" name="observacoes" maxLength={2000} defaultValue={valores.observacoes} className={cn(AREA_TEXTO, erros.observacoes && ENTRADA_ERRO)} />
    </Campo>
    <p className="text-xs text-outline">A data é informada pela equipe; o sistema não sugere prazo clínico.</p>
    <Enviar />
  </form>;
}
