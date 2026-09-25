"use client";

import { CalendarPlus, CircleAlert, Info } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { RodapeAcoesFormulario } from "@/components/ui/form-actions";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { EstadoRelacionamento } from "@/lib/relacionamento";
import { criarRetorno } from "@/server/acoes/relacionamento";

export function FormularioRetorno() {
  const [estado, enviar] = useActionState(criarRetorno, { erros: {} } as EstadoRelacionamento);
  const { erros, valores = {} } = estado;

  return <form action={enviar} noValidate className="flex flex-col gap-6">
    {erros.geral ? (
      <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-4 py-3 text-sm leading-6 text-negativo">
        <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
        {erros.geral}
      </p>
    ) : null}

    <GrupoDeCampos titulo="Quem e quando" descricao="Vincule a paciente e registre a data real combinada para o próximo contato.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
        <SeletorPaciente inicial={null} erro={erros.paciente_id} />
        <Campo id="sugerido_para" rotulo="Data combinada" obrigatorio erro={erros.sugerido_para}>
          <input id="sugerido_para" name="sugerido_para" type="date" defaultValue={valores.sugerido_para} className={cn(ENTRADA, erros.sugerido_para && ENTRADA_ERRO)} />
        </Campo>
      </div>
    </GrupoDeCampos>

    <GrupoDeCampos titulo="Contexto do retorno" descricao="Deixe apenas o que ajuda a equipe a conduzir a próxima conversa.">
      <Campo id="observacoes" rotulo="Observações" erro={erros.observacoes}>
        <textarea id="observacoes" name="observacoes" maxLength={2000} defaultValue={valores.observacoes} placeholder="Ex.: paciente pediu contato após receber o orçamento" className={cn(AREA_TEXTO, erros.observacoes && ENTRADA_ERRO)} />
      </Campo>

      <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-controle)] border border-informativo-borda bg-informativo-fundo px-3.5 py-3 text-xs leading-5 text-on-surface-variant">
        <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-informativo-texto" />
        A data é informada pela equipe; o sistema organiza a fila, mas não sugere prazo clínico.
      </p>
    </GrupoDeCampos>

    <RodapeAcoesFormulario>
      <BotaoDeAcao
        tom="primario"
        tamanho="md"
        icone={<CalendarPlus aria-hidden="true" strokeWidth={1.75} />}
        rotuloPendente="Registrando retorno…"
      >
        Registrar retorno
      </BotaoDeAcao>
      <Link href="/relacionamento?aba=retornos" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-[0.985]">
        Cancelar
      </Link>
    </RodapeAcoesFormulario>
  </form>;
}
