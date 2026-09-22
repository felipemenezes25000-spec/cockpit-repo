"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PRIORIDADES, ROTULO_TAREFA, TIPOS_TAREFA, type EstadoRelacionamento } from "@/lib/relacionamento";
import { criarTarefa } from "@/server/acoes/relacionamento";

function Enviar() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary hover:bg-primary disabled:opacity-60">
    {pending && <LoaderCircle aria-hidden="true" size={16} className="animate-spin" />}
    {pending ? "Salvando…" : "Criar tarefa"}
  </button>;
}

export function FormularioTarefa() {
  const [estado, enviar] = useActionState(criarTarefa, { erros: {} } as EstadoRelacionamento);
  const { erros, valores = {} } = estado;

  return <form action={enviar} noValidate className="space-y-5">
    {erros.geral && <p role="alert" className="rounded-[var(--radius-cartao)] bg-error-container px-4 py-3 text-sm text-on-error-container">{erros.geral}</p>}
    <div className="grid gap-5 sm:grid-cols-2">
      <Campo id="tipo" rotulo="Tipo" obrigatorio erro={erros.tipo}>
        <select id="tipo" name="tipo" defaultValue={valores.tipo || "retorno"} className={cn(ENTRADA, erros.tipo && ENTRADA_ERRO)}>
          {TIPOS_TAREFA.map((tipo) => <option key={tipo} value={tipo}>{ROTULO_TAREFA[tipo]}</option>)}
        </select>
      </Campo>
      <Campo id="prioridade" rotulo="Prioridade" obrigatorio erro={erros.prioridade}>
        <select id="prioridade" name="prioridade" defaultValue={valores.prioridade || "media"} className={cn(ENTRADA, erros.prioridade && ENTRADA_ERRO)}>
          {PRIORIDADES.map((prioridade) => <option key={prioridade} value={prioridade}>{prioridade === "media" ? "Média" : prioridade === "alta" ? "Alta" : "Baixa"}</option>)}
        </select>
      </Campo>
    </div>
    <SeletorPaciente inicial={null} erro={erros.paciente_id} obrigatorio={false} />
    <Campo id="descricao" rotulo="O que precisa ser feito" obrigatorio erro={erros.descricao}>
      <textarea id="descricao" name="descricao" maxLength={500} defaultValue={valores.descricao} className={cn(AREA_TEXTO, erros.descricao && ENTRADA_ERRO)} />
    </Campo>
    <Campo id="prazo" rotulo="Prazo" erro={erros.prazo}>
      <input id="prazo" name="prazo" type="date" defaultValue={valores.prazo} className={cn(ENTRADA, erros.prazo && ENTRADA_ERRO)} />
    </Campo>
    <Enviar />
  </form>;
}
