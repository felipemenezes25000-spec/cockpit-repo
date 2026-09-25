"use client";

import { CalendarPlus, Info } from "lucide-react";
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

  return <form action={enviar} noValidate className="flex flex-col gap-6 sm:gap-7">
    {erros.geral ? (
      <p role="alert" className="rounded-[var(--radius-painel)] border border-negativo-borda bg-negativo-fundo px-4 py-3 text-sm leading-6 text-negativo shadow-[0_12px_30px_-26px_rgba(153,27,27,.35)]">{erros.geral}</p>
    ) : null}

    <GrupoDeCampos titulo="Paciente" descricao="O retorno fica vinculado à ficha e aparece na fila de relacionamento quando chegar a data.">
      <SeletorPaciente inicial={null} erro={erros.paciente_id} />
    </GrupoDeCampos>

    <GrupoDeCampos titulo="Próximo contato" descricao="Registre a data combinada pela equipe e o contexto necessário para a abordagem.">
      <div className="flex flex-col gap-5">
        <Campo id="sugerido_para" rotulo="Data combinada para contato" obrigatorio erro={erros.sugerido_para} className="sm:max-w-xs">
          <input id="sugerido_para" name="sugerido_para" type="date" defaultValue={valores.sugerido_para} className={cn(ENTRADA, erros.sugerido_para && ENTRADA_ERRO)} />
        </Campo>

        <Campo id="observacoes" rotulo="Observações" erro={erros.observacoes}>
          <textarea id="observacoes" name="observacoes" maxLength={2000} defaultValue={valores.observacoes} className={cn(AREA_TEXTO, erros.observacoes && ENTRADA_ERRO)} />
        </Campo>

        <p className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-informativo-borda bg-informativo-fundo px-3.5 py-3 text-xs leading-5 text-on-surface-variant">
          <Info aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-informativo-texto" />
          A data é informada pela equipe; o sistema não sugere prazo clínico.
        </p>
      </div>
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
      <Link href="/relacionamento?aba=retornos" className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-surface-container-low hover:text-primary active:scale-[0.985]">
        Cancelar
      </Link>
    </RodapeAcoesFormulario>
  </form>;
}
