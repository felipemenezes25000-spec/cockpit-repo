"use client";

import { ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PRIORIDADES, ROTULO_TAREFA, TIPOS_TAREFA, type EstadoRelacionamento } from "@/lib/relacionamento";
import { criarTarefa } from "@/server/acoes/relacionamento";

export function FormularioTarefa() {
  const [estado, enviar] = useActionState(criarTarefa, { erros: {} } as EstadoRelacionamento);
  const { erros, valores = {} } = estado;

  return <form action={enviar} noValidate className="space-y-5">
    {erros.geral ? (
      <p role="alert" className="rounded-[14px] border border-negativo-borda/70 bg-negativo-fundo/72 px-4 py-3 text-sm leading-6 text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">{erros.geral}</p>
    ) : null}

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

    <div className="flex flex-wrap items-center gap-3 border-t border-card-border/70 pt-6">
      <BotaoDeAcao
        tom="primario"
        tamanho="md"
        icone={<ClipboardPlus aria-hidden="true" strokeWidth={1.75} />}
        rotuloPendente="Criando tarefa…"
      >
        Criar tarefa
      </BotaoDeAcao>
      <Link href="/relacionamento?aba=tarefas" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-surface-container-low hover:text-primary active:scale-[0.985]">
        Cancelar
      </Link>
    </div>
  </form>;
}
