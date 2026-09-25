"use client";

import { CircleAlert, Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { BotaoDeAcao } from "@/components/ui/formulario-acao";
import { RodapeAcoesFormulario } from "@/components/ui/form-actions";
import { Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { PROCEDIMENTO_EM_BRANCO, type ValoresProcedimento } from "@/lib/procedimento";
import type { EstadoProcedimento } from "@/server/acoes/procedimentos";

type Acao = (estado: EstadoProcedimento, dados: FormData) => Promise<EstadoProcedimento>;

const INICIAL: EstadoProcedimento = { erros: {} };

export function FormularioProcedimento({
  acao,
  inicial,
  procedimentoId,
  rotuloSalvar,
  cancelarPara,
}: {
  acao: Acao;
  inicial?: Partial<ValoresProcedimento>;
  procedimentoId?: string;
  rotuloSalvar: string;
  cancelarPara: string;
}) {
  const [estado, enviar] = useActionState(acao, INICIAL);
  const partida: ValoresProcedimento = { ...PROCEDIMENTO_EM_BRANCO, ...inicial };
  const de = (campo: keyof ValoresProcedimento) => estado.valores?.[campo] ?? partida[campo];
  const erros = estado.erros;
  const marcar = (campo: keyof typeof erros) => erros[campo] ? ({ "aria-invalid": true as const } as const) : {};

  return (
    <form action={enviar} className="flex flex-col gap-6 sm:gap-7" noValidate>
      {procedimentoId ? <input type="hidden" name="id" value={procedimentoId} /> : null}

      {erros.geral ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-painel)] border border-negativo-borda bg-negativo-fundo px-4 py-3 text-sm leading-6 text-negativo shadow-[0_12px_30px_-26px_rgba(153,27,27,.35)]">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <GrupoDeCampos titulo="Identidade do procedimento" descricao="O nome é o que a equipe vê na Agenda, nos atendimentos e no histórico da paciente.">
        <Campo id="nome" rotulo="Nome do procedimento" obrigatorio erro={erros.nome}>
          <input id="nome" name="nome" type="text" required maxLength={120} defaultValue={de("nome")} placeholder="Limpeza de pele profunda" className={cn(ENTRADA, erros.nome && ENTRADA_ERRO)} {...marcar("nome")} />
        </Campo>
      </GrupoDeCampos>

      <GrupoDeCampos titulo="Padrões operacionais" descricao="Duração, valor e retorno são sugestões para novas marcações; o atendimento individual ainda pode ser ajustado.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Campo id="duracao_min" rotulo="Duração (minutos)" obrigatorio erro={erros.duracao_min} dica="Vira o padrão ao marcar na agenda.">
            <input id="duracao_min" name="duracao_min" type="number" inputMode="numeric" min={5} max={480} step={5} required defaultValue={de("duracao_min")} className={cn(ENTRADA, "tabular", erros.duracao_min && ENTRADA_ERRO)} {...marcar("duracao_min")} />
          </Campo>

          <Campo id="valor_padrao" rotulo="Valor de tabela (R$)" erro={erros.valor_padrao} dica="Sugerido ao marcar; cada atendimento pode ter outro.">
            <input id="valor_padrao" name="valor_padrao" type="text" inputMode="decimal" defaultValue={de("valor_padrao")} placeholder="0,00" className={cn(ENTRADA, "tabular", erros.valor_padrao && ENTRADA_ERRO)} {...marcar("valor_padrao")} />
          </Campo>

          <Campo id="retorno_sugerido_dias" rotulo="Retorno sugerido (dias)" erro={erros.retorno_sugerido_dias} dica="Vazio = sem retorno. É a regra da equipe, não do sistema.">
            <input id="retorno_sugerido_dias" name="retorno_sugerido_dias" type="number" inputMode="numeric" min={1} max={3650} defaultValue={de("retorno_sugerido_dias")} placeholder="90" className={cn(ENTRADA, "tabular", erros.retorno_sugerido_dias && ENTRADA_ERRO)} {...marcar("retorno_sugerido_dias")} />
          </Campo>
        </div>
      </GrupoDeCampos>

      <RodapeAcoesFormulario>
        <BotaoDeAcao tom="primario" tamanho="md" icone={<Save aria-hidden="true" strokeWidth={1.75} />} rotuloPendente="Salvando procedimento…">
          {rotuloSalvar}
        </BotaoDeAcao>
        <Link href={cancelarPara} className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-5 text-sm font-medium text-on-surface-variant transition-[transform,background-color,color] duration-150 hover:bg-surface-container-low hover:text-primary active:scale-[0.985]">
          Cancelar
        </Link>
      </RodapeAcoesFormulario>
    </form>
  );
}
