"use client";

import { CircleAlert, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import {
  CATEGORIAS_EM_ORDEM,
  DESPESA_EM_BRANCO,
  ROTULO_CATEGORIA,
  type ValoresDespesa,
} from "@/lib/despesa";
import type { EstadoDespesa } from "@/server/acoes/despesas";

type Acao = (estado: EstadoDespesa, dados: FormData) => Promise<EstadoDespesa>;

const INICIAL: EstadoDespesa = { erros: {} };

function BotaoSalvar({ rotulo }: { rotulo: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Salvando…
        </>
      ) : (
        <>
          <Save aria-hidden="true" size={18} strokeWidth={1.75} />
          {rotulo}
        </>
      )}
    </button>
  );
}

export function FormularioDespesa({
  acao,
  inicial,
  despesaId,
  rotuloSalvar,
}: {
  acao: Acao;
  inicial?: Partial<ValoresDespesa>;
  despesaId?: string;
  rotuloSalvar: string;
}) {
  const [estado, enviar] = useActionState(acao, INICIAL);

  const partida: ValoresDespesa = { ...DESPESA_EM_BRANCO, ...inicial };
  const de = (campo: keyof ValoresDespesa) => estado.valores?.[campo] ?? partida[campo];

  const erros = estado.erros;

  return (
    <form action={enviar} className="flex flex-col gap-6" noValidate>
      {despesaId ? <input type="hidden" name="id" value={despesaId} /> : null}

      {erros.geral ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <Campo id="descricao" rotulo="Descrição" obrigatorio erro={erros.descricao}>
        <input
          id="descricao"
          name="descricao"
          type="text"
          required
          maxLength={200}
          defaultValue={de("descricao")}
          placeholder="Aluguel da sala"
          className={cn(ENTRADA, erros.descricao && ENTRADA_ERRO)}
        />
      </Campo>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Campo id="categoria" rotulo="Categoria" obrigatorio erro={erros.categoria}>
          <select
            id="categoria"
            name="categoria"
            required
            defaultValue={de("categoria")}
            className={cn(ENTRADA, erros.categoria && ENTRADA_ERRO)}
          >
            {CATEGORIAS_EM_ORDEM.map((c) => (
              <option key={c} value={c}>
                {ROTULO_CATEGORIA[c]}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="valor" rotulo="Valor (R$)" obrigatorio erro={erros.valor}>
          <input
            id="valor"
            name="valor"
            type="text"
            inputMode="decimal"
            required
            defaultValue={de("valor")}
            placeholder="0,00"
            className={cn(ENTRADA, "tabular", erros.valor && ENTRADA_ERRO)}
          />
        </Campo>

        <Campo id="vencimento" rotulo="Vencimento" obrigatorio erro={erros.vencimento}>
          <input
            id="vencimento"
            name="vencimento"
            type="date"
            required
            defaultValue={de("vencimento")}
            className={cn(ENTRADA, erros.vencimento && ENTRADA_ERRO)}
          />
        </Campo>
      </div>

      <Campo
        id="observacoes"
        rotulo="Observação"
        dica="A taxa de cartão não entra como despesa: ela já é descontada no líquido dos recebimentos."
      >
        <textarea
          id="observacoes"
          name="observacoes"
          maxLength={2000}
          defaultValue={de("observacoes")}
          className={AREA_TEXTO}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
        <BotaoSalvar rotulo={rotuloSalvar} />
        <Link
          href="/financeiro/despesas"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
