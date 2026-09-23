"use client";

import { CalendarPlus, LoaderCircle } from "lucide-react";
import Link from "next/link";
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
    {pending ? <LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> : <CalendarPlus aria-hidden="true" size={18} strokeWidth={1.75} />}
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
    {/* Rodapé de todo formulário: divisória, envio com ícone e a saída sem salvar. */}
    <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
      <Enviar />
      <Link href="/relacionamento?aba=retornos" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary">
        Cancelar
      </Link>
    </div>
  </form>;
}
