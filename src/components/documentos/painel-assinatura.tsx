"use client";

import { Check, CircleAlert, LoaderCircle, PenLine } from "lucide-react";
import { useActionState, useId } from "react";
import { useFormStatus } from "react-dom";
import { CardCorpo, CardRodape } from "@/components/ui/card";
import { Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { VERIFICACOES_SUGERIDAS } from "@/lib/documento";
import { assinarDocumento, type EstadoAssinatura } from "@/server/acoes/documentos";

const INICIAL: EstadoAssinatura = { erros: {} };

function Assinar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary-container bg-linear-to-b from-primary-container to-primary px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-0.5 hover:brightness-[0.97] hover:shadow-[0_12px_28px_-12px_rgba(8,84,160,0.68)] active:translate-y-px active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-55 disabled:transform-none"
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-7 top-0 h-px bg-white/45" />
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Registrando…
        </>
      ) : (
        <>
          <PenLine aria-hidden="true" size={18} strokeWidth={1.75} className="transition-transform duration-200 group-hover:-rotate-3" />
          Registrar assinatura
        </>
      )}
    </button>
  );
}

export function PainelAssinatura({ documentoId }: { documentoId: string }) {
  const [estado, enviar] = useActionState(assinarDocumento, INICIAL);
  const listaId = useId();

  return (
    <form action={enviar}>
      <input type="hidden" name="documento_id" value={documentoId} />

      <CardCorpo className="flex flex-col gap-5">
        <p className="rounded-[14px] border border-informativo-borda/55 bg-informativo-fundo/48 px-4 py-3 text-sm leading-6 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          Deixe a paciente ler o texto acima antes de registrar. O que for gravado aqui é a prova de que ela leu e concordou.
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo id="assinatura-nome" rotulo="Nome completo de quem assina" obrigatorio erro={estado.erros.nome}>
            <input id="assinatura-nome" name="nome" type="text" maxLength={160} required defaultValue={estado.valores?.nome ?? ""} autoComplete="off" className={cn(ENTRADA, estado.erros.nome && ENTRADA_ERRO)} />
          </Campo>

          <Campo id="assinatura-cpf" rotulo="CPF" erro={estado.erros.cpf} dica="Reforça a prova, mas não é obrigatório.">
            <input id="assinatura-cpf" name="cpf" type="text" inputMode="numeric" maxLength={14} defaultValue={estado.valores?.cpf ?? ""} placeholder="000.000.000-00" className={cn(ENTRADA, "tabular", estado.erros.cpf && ENTRADA_ERRO)} />
          </Campo>
        </div>

        <Campo id="assinatura-verificacao" rotulo="Como a identidade foi conferida" obrigatorio erro={estado.erros.verificacao} dica="Escolha uma sugestão ou descreva o que aconteceu.">
          <input id="assinatura-verificacao" name="verificacao" type="text" list={listaId} maxLength={240} required defaultValue={estado.valores?.verificacao ?? ""} className={cn(ENTRADA, estado.erros.verificacao && ENTRADA_ERRO)} />
          <datalist id={listaId}>
            {VERIFICACOES_SUGERIDAS.map((sugestao) => <option key={sugestao} value={sugestao} />)}
          </datalist>
        </Campo>

        <div className="rounded-[16px] border border-card-border/75 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <label className="group/consentimento flex cursor-pointer items-start gap-3 text-sm leading-6 text-on-surface">
            <input type="checkbox" name="confirmacao" value="sim" required className="peer sr-only" />
            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-outline-variant bg-white text-transparent shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition-[transform,background-color,border-color,box-shadow,color] duration-150 peer-checked:border-primary-container peer-checked:bg-primary-container peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 group-hover/consentimento:border-primary-fixed-dim peer-checked:[&_svg]:scale-100">
              <Check aria-hidden="true" size={13} strokeWidth={2.4} className="scale-0 transition-transform duration-150" />
            </span>
            <span>
              <span className="font-medium">Confirmação de leitura e concordância</span>
              <span className="mt-0.5 block text-xs leading-5 text-outline">A paciente leu o documento na íntegra e concordou com o conteúdo.</span>
            </span>
          </label>
          {estado.erros.confirmacao ? <p role="alert" className="mt-2 text-xs font-medium text-error">{estado.erros.confirmacao}</p> : null}
        </div>

        {estado.erros.geral ? (
          <p role="alert" className="flex items-start gap-2 rounded-[14px] border border-negativo-borda/70 bg-negativo-fundo/72 px-3.5 py-3 text-sm leading-6 text-negativo shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
            <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
            {estado.erros.geral}
          </p>
        ) : null}
      </CardCorpo>

      <CardRodape className="flex flex-wrap items-center gap-3">
        <Assinar />
        <span className="text-xs leading-5 text-outline">Registra data, hora, IP e dispositivo automaticamente. Não tem desfazer.</span>
      </CardRodape>
    </form>
  );
}
