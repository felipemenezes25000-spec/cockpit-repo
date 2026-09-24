"use client";

import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { EstadoRelacionamento } from "@/lib/relacionamento";
import { criarRetorno } from "@/server/acoes/relacionamento";

export function FormularioRetorno() {
  const [estado, enviar] = useActionState(criarRetorno, { erros: {} } as EstadoRelacionamento);
  const { erros, valores = {} } = estado;

  return <form action={enviar} noValidate className="space-y-5">
    {erros.geral ? (
      <p role="alert" className="rounded-[14px] border border-negativo-borda/70 bg-negativo-fundo/72 px-4 py-3 text-sm leading-6 text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">{erros.geral}</p>
    ) : null}

    <SeletorPaciente inicial={null} erro={erros.paciente_id} />

    <Campo id="sugerido_para" rotulo="Data combinada para contato" obrigatorio erro={erros.sugerido_para}>
      <input id="sugerido_para" name="sugerido_para" type="date" defaultValue={valores.sugerido_para} className={cn(ENTRADA, erros.sugerido_para && ENTRADA_ERRO)} />
    </Campo>

    <Campo id="observacoes" rotulo="Observações" erro={erros.observacoes}>
      <textarea id="observacoes" name="observacoes" maxLength={2000} defaultValue={valores.observacoes} className={cn(AREA_TEXTO, erros.observacoes && ENTRADA_ERRO)} />
    </Campo>

    <p className="rounded-[12px] border border-informativo-borda/55 bg-informativo-fundo/42 px-3.5 py-2.5 text-xs leading-5 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
      A data é informada pela equipe; o sistema não sugere prazo clínico.
    </p>

    <div className="flex flex-wrap items-center gap-3 border-t border-card-border/70 pt-6">
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
    </div>
  </form>;
}
