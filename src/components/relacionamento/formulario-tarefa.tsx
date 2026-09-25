"use client";

import { CircleAlert, ClipboardPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { RodapeAcoesFormulario } from "@/components/ui/form-actions";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PRIORIDADES, ROTULO_TAREFA, TIPOS_TAREFA, type EstadoRelacionamento } from "@/lib/relacionamento";
import { criarTarefa } from "@/server/acoes/relacionamento";

export function FormularioTarefa() {
  const [estado, enviar] = useActionState(criarTarefa, { erros: {} } as EstadoRelacionamento);
  const { erros, valores = {} } = estado;

  return <form action={enviar} noValidate className="flex flex-col gap-6">
    {erros.geral ? (
      <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-4 py-3 text-sm leading-6 text-negativo">
        <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
        {erros.geral}
      </p>
    ) : null}

    <GrupoDeCampos titulo="Classificação" descricao="Defina o tipo e a prioridade para a fila organizar o que exige atenção primeiro.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Campo id="tipo" rotulo="Tipo" obrigatorio erro={erros.tipo}>
          <select key={`tipo-${valores.tipo}`} id="tipo" name="tipo" defaultValue={valores.tipo || "retorno"} className={cn(ENTRADA, erros.tipo && ENTRADA_ERRO)}>
            {TIPOS_TAREFA.map((tipo) => <option key={tipo} value={tipo}>{ROTULO_TAREFA[tipo]}</option>)}
          </select>
        </Campo>
        <Campo id="prioridade" rotulo="Prioridade" obrigatorio erro={erros.prioridade}>
          <select key={`prioridade-${valores.prioridade}`} id="prioridade" name="prioridade" defaultValue={valores.prioridade || "media"} className={cn(ENTRADA, erros.prioridade && ENTRADA_ERRO)}>
            {PRIORIDADES.map((prioridade) => <option key={prioridade} value={prioridade}>{prioridade === "media" ? "Média" : prioridade === "alta" ? "Alta" : "Baixa"}</option>)}
          </select>
        </Campo>
      </div>
    </GrupoDeCampos>

    <GrupoDeCampos titulo="Responsabilidade de contato" descricao="A paciente é opcional: vincule quando a tarefa estiver ligada a um relacionamento específico.">
      <SeletorPaciente inicial={null} erro={erros.paciente_id} obrigatorio={false} />
    </GrupoDeCampos>

    <GrupoDeCampos titulo="Próximo passo" descricao="Escreva a ação em linguagem operacional e adicione prazo somente quando houver uma data real.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <Campo id="descricao" rotulo="O que precisa ser feito" obrigatorio erro={erros.descricao}>
          <textarea id="descricao" name="descricao" maxLength={500} defaultValue={valores.descricao} placeholder="Ex.: ligar para confirmar se recebeu o orçamento" className={cn(AREA_TEXTO, erros.descricao && ENTRADA_ERRO)} />
        </Campo>

        <Campo id="prazo" rotulo="Prazo" erro={erros.prazo}>
          <input id="prazo" name="prazo" type="date" defaultValue={valores.prazo} className={cn(ENTRADA, erros.prazo && ENTRADA_ERRO)} />
        </Campo>
      </div>
    </GrupoDeCampos>

    <RodapeAcoesFormulario>
      <BotaoDeAcao
        tom="primario"
        tamanho="md"
        icone={<ClipboardPlus aria-hidden="true" strokeWidth={1.75} />}
        rotuloPendente="Criando tarefa…"
      >
        Criar tarefa
      </BotaoDeAcao>
      <Link href="/relacionamento?aba=tarefas" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-[0.985]">
        Cancelar
      </Link>
    </RodapeAcoesFormulario>
  </form>;
}
