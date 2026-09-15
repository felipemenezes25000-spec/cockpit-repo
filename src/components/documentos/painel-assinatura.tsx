"use client";

import { CircleAlert, LoaderCircle, PenLine } from "lucide-react";
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
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Registrando…
        </>
      ) : (
        <>
          <PenLine aria-hidden="true" size={18} strokeWidth={1.75} />
          Registrar assinatura
        </>
      )}
    </button>
  );
}

/**
 * A assinatura acontece no balcão: a paciente lê na tela e a recepção registra.
 *
 * Por isso não há link público nem sessão da paciente — o sistema não expõe
 * nada a quem não está autenticado. O que dá força à assinatura simples
 * (Lei 14.063/2020) é o conjunto de circunstâncias, e é ele que esta tela
 * coleta: quem assinou, quem conferiu a identidade e como.
 *
 * IP e dispositivo NÃO estão aqui de propósito. Vêm dos cabeçalhos da
 * requisição, na ação de servidor: evidência que o assinante pudesse digitar
 * não serviria de evidência.
 */
export function PainelAssinatura({ documentoId }: { documentoId: string }) {
  const [estado, enviar] = useActionState(assinarDocumento, INICIAL);
  const listaId = useId();

  return (
    <form action={enviar}>
      <input type="hidden" name="documento_id" value={documentoId} />

      <CardCorpo className="flex flex-col gap-5">
        <p className="text-sm text-on-surface-variant">
          Deixe a paciente ler o texto acima antes de registrar. O que for gravado
          aqui é a prova de que ela leu e concordou.
        </p>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo
            id="assinatura-nome"
            rotulo="Nome completo de quem assina"
            obrigatorio
            erro={estado.erros.nome}
          >
            <input
              id="assinatura-nome"
              name="nome"
              type="text"
              maxLength={160}
              required
              defaultValue={estado.valores?.nome ?? ""}
              autoComplete="off"
              className={cn(ENTRADA, estado.erros.nome && ENTRADA_ERRO)}
            />
          </Campo>

          <Campo
            id="assinatura-cpf"
            rotulo="CPF"
            erro={estado.erros.cpf}
            dica="Reforça a prova, mas não é obrigatório."
          >
            <input
              id="assinatura-cpf"
              name="cpf"
              type="text"
              inputMode="numeric"
              maxLength={14}
              defaultValue={estado.valores?.cpf ?? ""}
              placeholder="000.000.000-00"
              className={cn(ENTRADA, "tabular", estado.erros.cpf && ENTRADA_ERRO)}
            />
          </Campo>
        </div>

        <Campo
          id="assinatura-verificacao"
          rotulo="Como a identidade foi conferida"
          obrigatorio
          erro={estado.erros.verificacao}
          dica="Escolha uma sugestão ou descreva o que aconteceu."
        >
          <input
            id="assinatura-verificacao"
            name="verificacao"
            type="text"
            list={listaId}
            maxLength={240}
            required
            defaultValue={estado.valores?.verificacao ?? ""}
            className={cn(ENTRADA, estado.erros.verificacao && ENTRADA_ERRO)}
          />
          <datalist id={listaId}>
            {VERIFICACOES_SUGERIDAS.map((sugestao) => (
              <option key={sugestao} value={sugestao} />
            ))}
          </datalist>
        </Campo>

        <div>
          <label className="flex items-start gap-2.5 text-sm text-on-surface">
            <input
              type="checkbox"
              name="confirmacao"
              value="sim"
              required
              className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary-container)]"
            />
            A paciente leu o documento na íntegra e concordou com o conteúdo.
          </label>
          {estado.erros.confirmacao ? (
            <p role="alert" className="mt-1.5 text-xs text-error">
              {estado.erros.confirmacao}
            </p>
          ) : null}
        </div>

        {estado.erros.geral ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
          >
            <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
            {estado.erros.geral}
          </p>
        ) : null}
      </CardCorpo>

      <CardRodape className="flex flex-wrap items-center gap-3">
        <Assinar />
        <span className="text-xs text-outline">
          Registra data, hora, IP e dispositivo automaticamente. Não tem desfazer.
        </span>
      </CardRodape>
    </form>
  );
}
