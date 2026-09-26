import { Ban, ReceiptText, RotateCcw } from "lucide-react";
import Link from "next/link";
import { ChipDespesa } from "./chips";
import { PagarDespesa } from "./pagar-despesa";
import { BotaoLink } from "@/components/ui/button";
import { EstadoVazio } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";
import { ROTULO_CATEGORIA } from "@/lib/despesa";
import { descreverPrazo, formatarData, formatarMesAno, formatarMoeda } from "@/lib/format";
import { ROTULO_FORMA } from "@/lib/venda";
import { mudarSituacaoDespesa } from "@/server/acoes/despesas";
import { BotaoDeAcao, FormularioDeAcao } from "@/components/ui/formulario-acao";
import type { Despesa } from "@/server/consultas/despesas";

/**
 * Pergunta antes de reabrir, no mesmo padrão de Cancelar.
 *
 * Reabrir uma paga é o mais destrutivo dos botões da lista: a ação grava
 * `pago_em` e `forma` nulos, a despesa sai das pagas e do resultado de caixa
 * do mês em que foi paga — mesmo que esse mês já esteja fechado — e volta a
 * pendente. A data e a forma só ficam na auditoria, que nenhuma tela lê; por
 * isso a pergunta diz quais eram, para quem quiser desfazer pagando de novo.
 */
function confirmacaoDeReabrir(despesa: Despesa): string {
  const pergunta = `Reabrir a despesa "${despesa.descricao}"?`;

  if (despesa.situacao === "paga" && despesa.pagoEm) {
    const forma = despesa.forma ? `, ${ROTULO_FORMA[despesa.forma]}` : "";
    return (
      `${pergunta} O pagamento de ${formatarData(despesa.pagoEm)}${forma} será apagado: ` +
      `ela sai das despesas pagas e do resultado de caixa de ${formatarMesAno(despesa.pagoEm)} ` +
      "e volta a pendente. Para desfazer, será preciso pagar de novo com a mesma data."
    );
  }

  return `${pergunta} Ela deixa de ser cancelada e volta para o que falta pagar.`;
}

export function ListaDespesas({
  despesas,
  dataPadrao,
  filtrada = false,
}: {
  despesas: Despesa[];
  dataPadrao: string;
  /** A lista está vazia por causa dos filtros, não por falta de despesa. */
  filtrada?: boolean;
}) {
  if (despesas.length === 0) {
    return filtrada ? (
      <EstadoVazio
        icone={ReceiptText}
        titulo="Nada com estes filtros"
        descricao="Afrouxe os filtros ou troque o mês para encontrar a despesa."
      />
    ) : (
      <EstadoVazio
        icone={ReceiptText}
        titulo="Nenhuma despesa neste mês"
        descricao="Registre as contas do mês para o resultado de caixa fechar."
        acao={
          <BotaoLink href="/financeiro/despesas/nova" variante="primaria" tamanho="sm">
            Registrar despesa
          </BotaoLink>
        }
      />
    );
  }

  return (
    <ul aria-label="Despesas" className="flex min-w-0 flex-col gap-3">
      {despesas.map((despesa) => (
        <li
          key={despesa.id}
          className={cn(
            "premium-interactive flex min-w-0 flex-col gap-3 rounded-[var(--radius-cartao)] border p-4",
            // Cancelada não usa opacidade: derrubaria o texto terciário para
            // 2,6:1. O estado vem do selo "Cancelada", do fundo recuado e da
            // borda tracejada, como em Configurações.
            despesa.situacao === "cancelada"
              ? "border-dashed border-outline-variant bg-surface-container-low"
              : "border-card-border bg-surface",
          )}
        >
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-0 break-words font-medium text-on-surface">{despesa.descricao}</span>
                <ChipDespesa situacao={despesa.situacao} venceEmDias={despesa.venceEmDias} />
                {despesa.exemplo ? (
                  <span className="rounded-full border border-dashed border-outline-variant px-2 py-0.5 text-[0.6875rem] text-outline">
                    exemplo
                  </span>
                ) : null}
              </div>

              <p className="tabular mt-1 min-w-0 break-words text-xs leading-5 text-outline">
                {ROTULO_CATEGORIA[despesa.categoria]}
                {despesa.situacao === "paga" && despesa.pagoEm
                  ? ` · paga em ${formatarData(despesa.pagoEm)}${despesa.forma ? ` (${ROTULO_FORMA[despesa.forma]})` : ""}`
                  : ` · vence ${formatarData(despesa.vencimento)} (${descreverPrazo(despesa.venceEmDias)})`}
              </p>

              {despesa.observacoes ? (
                <p className="mt-1 min-w-0 break-words text-xs leading-5 text-outline">{despesa.observacoes}</p>
              ) : null}
            </div>

            {/* No celular estreito (320 px) o bloco pode encolher e quebrar em
                linhas; com `shrink-0` ele passava da tela. Do `sm` para cima
                não encolhe, para valor e botões ficarem juntos. */}
            <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2.5 border-t border-card-border pt-3 sm:w-auto sm:justify-start sm:gap-3 sm:border-t-0 sm:pt-0 sm:shrink-0">
              {/* Saída de dinheiro é vermelha. Cancelada perde a força:
                  o valor não saiu nem vai sair. */}
              <span
                // Largura fixa e alinhado à direita do `sm` para cima: o valor
                // fica na mesma coluna em todas as linhas, com "Cancelar" ou
                // "Reabrir" ao lado (também de largura fixa, abaixo).
                className={cn(
                  "tabular min-w-0 break-words text-base font-semibold sm:w-36 sm:text-right",
                  despesa.situacao === "cancelada"
                    ? "text-outline line-through"
                    : "text-negativo",
                )}
              >
                − {formatarMoeda(despesa.valor)}
              </span>

              <Link
                href={`/financeiro/despesas/${despesa.id}/editar`}
                className="inline-flex min-h-8 items-center rounded-[var(--radius-cartao)] border border-card-border px-3 text-xs font-medium text-on-surface-variant transition-[transform,border-color,color,background-color] duration-150 hover:-translate-y-0.5 hover:border-primary hover:bg-selecao hover:text-primary"
              >
                Editar
              </Link>

              <div className="flex sm:w-28 sm:justify-end">
                {despesa.situacao === "pendente" ? (
                  <FormularioDeAcao
                    acao={mudarSituacaoDespesa}
                    campos={{ id: despesa.id, acao: "cancelar" }}
                    confirmacao={`Cancelar a despesa "${despesa.descricao}"? Ela sai do que falta pagar e pode ser reaberta depois.`}
                    alinhamento="fim"
                  >
                    <BotaoDeAcao
                      tom="silencioso"
                      tamanho="xs"
                      icone={<Ban strokeWidth={1.75} />}
                      rotuloAcessivel={`Cancelar a despesa ${despesa.descricao}`}
                    >
                      Cancelar
                    </BotaoDeAcao>
                  </FormularioDeAcao>
                ) : (
                  <FormularioDeAcao
                    acao={mudarSituacaoDespesa}
                    campos={{ id: despesa.id, acao: "reabrir" }}
                    confirmacao={confirmacaoDeReabrir(despesa)}
                    alinhamento="fim"
                  >
                    <BotaoDeAcao
                      tom="silencioso"
                      tamanho="xs"
                      icone={<RotateCcw strokeWidth={1.75} />}
                      rotuloAcessivel={`Reabrir a despesa ${despesa.descricao}`}
                    >
                      Reabrir
                    </BotaoDeAcao>
                  </FormularioDeAcao>
                )}
              </div>
            </div>
          </div>

          {despesa.situacao === "pendente" ? (
            <div className="min-w-0 border-t border-card-border pt-3">
              <PagarDespesa despesaId={despesa.id} dataPadrao={dataPadrao} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
