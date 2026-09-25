"use client";

import { ClipboardPlus } from "lucide-react";
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

  return <form action={enviar} noValidate className="flex flex-col gap-6 sm:gap-7">
    {erros.geral ? (
      <p role="alert" className="rounded-[var(--radius-painel)] border border-negativo-borda bg-negativo-fundo px-4 py-3 text-sm leading-6 text-negativo shadow-[0_12px_30px_-26px_rgba(153,27,27,.35)]">{erros.geral}</p>
    ) : null}

    <GrupoDeCampos titulo="Organização" descricao="Defina o tipo e a prioridade para a tarefa cair no lugar certo da fila operacional.">
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

    <GrupoDeCampos titulo="Pessoa relacionada" descricao="Vincule uma paciente quando a tarefa fizer parte de um acompanhamento individual.">
      <SeletorPaciente inicial={null} erro={erros.paciente_id} obrigatorio={false} />
    </GrupoDeCampos>

    <GrupoDeCampos titulo="Ação e prazo" descricao="Escreva o próximo passo de forma objetiva e, se necessário, determine quando ele deve estar concluído.">
      <div className="flex flex-col gap-5">
        <Campo id="descricao" rotulo="O que precisa ser feito" obrigatorio erro={erros.descricao}>
          <textarea id="descricao" name="descricao" maxLength={500} defaultValue={valores.descricao} className={cn(AREA_TEXTO, erros.descricao && ENTRADA_ERRO)} />
        </Campo>

        <Campo id="prazo" rotulo="Prazo" erro={erros.prazo} className="sm:max-w-xs">
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
      <Link href="/relacionamento?aba=tarefas" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-surface-container-low hover:text-primary active:scale-[0.985]">
        Cancelar
      </Link>
    </RodapeAcoesFormulario>
  </form>;
}
