"use client";

import { CircleAlert, LoaderCircle, Receipt } from "lucide-react";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { SeletorPaciente } from "@/components/agenda/seletor-paciente";
import { AREA_TEXTO, Campo, ENTRADA, ENTRADA_ERRO, GrupoDeCampos } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { formatarMoeda } from "@/lib/format";
import {
  bpDoBanco,
  custoDaTaxa,
  formatarPercentual,
  paraCentavos,
} from "@/lib/moeda";
import {
  formaParcela,
  formaUsaCartao,
  FORMAS_EM_ORDEM,
  ROTULO_FORMA,
  taxaDaPrevia,
  type FormaPagamento,
} from "@/lib/venda";
import type { OpcaoProcedimento } from "@/server/consultas/agenda";
import type { TaxaParaVenda } from "@/server/consultas/vendas";
import type { EstadoVenda } from "@/server/acoes/vendas";
import type { PacienteParaSelecao } from "@/server/acoes/agenda";
import { registrarVenda } from "@/server/acoes/vendas";

const INICIAL: EstadoVenda = { erros: {} };

function BotaoSalvar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Registrando…
        </>
      ) : (
        <>
          <Receipt aria-hidden="true" size={18} strokeWidth={1.75} />
          Registrar venda
        </>
      )}
    </button>
  );
}

/** Linha do resumo da conta, sempre visível ao lado dos campos. */
function LinhaDaConta({
  rotulo,
  valor,
  destaque = false,
  negativa = false,
}: {
  rotulo: string;
  valor: string;
  destaque?: boolean;
  negativa?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-on-surface-variant">{rotulo}</span>
      <span
        className={cn(
          "tabular",
          destaque ? "text-base font-semibold text-positivo" : "text-sm text-on-surface",
          negativa && "text-on-surface-variant",
        )}
      >
        {valor}
      </span>
    </div>
  );
}

export function FormularioVenda({
  procedimentos,
  taxas,
  pacienteInicial,
  podeAlterarTaxa,
  dataPadrao,
}: {
  procedimentos: OpcaoProcedimento[];
  taxas: TaxaParaVenda[];
  pacienteInicial: PacienteParaSelecao | null;
  podeAlterarTaxa: boolean;
  /** "AAAA-MM-DD" de hoje no relógio da clínica, calculado no servidor. */
  dataPadrao: string;
}) {
  const [estado, enviar] = useActionState(registrarVenda, INICIAL);

  const [forma, setForma] = useState<FormaPagamento>("pix");
  const [operadora, setOperadora] = useState("");
  const [taxaId, setTaxaId] = useState("");
  const [original, setOriginal] = useState("");
  const [desconto, setDesconto] = useState("");
  const [manual, setManual] = useState(false);
  const [percentualManual, setPercentualManual] = useState("");
  const [situacaoInicial, setSituacaoInicial] = useState<"previsto" | "recebido">("previsto");
  const [procedimentoId, setProcedimentoId] = useState("");
  // Uma chave por formulário aberto, repetida em todo envio dele: o duplo
  // clique e o reenvio depois de uma recusa chegam com a mesma, e o banco
  // devolve a venda que já nasceu em vez de criar outra (0028). Na
  // hidratação o React grava o valor do cliente no campo escondido.
  const [chaveEnvio] = useState(() => crypto.randomUUID());

  // Campos não controlados voltam com o que foi digitado quando a ação
  // recusa: o React 19 limpa o formulário depois do envio, e perder a data
  // ou a justificativa a cada erro faria a pessoa digitar tudo de novo.
  const de = (campo: string, padrao = "") => estado.valores?.[campo] ?? padrao;

  const usaCartao = formaUsaCartao(forma);

  // As taxas do tipo escolhido, agrupadas por operadora.
  const taxasDoTipo = useMemo(
    () => taxas.filter((t) => t.tipo === forma),
    [taxas, forma],
  );
  const operadoras = useMemo(
    () => [...new Set(taxasDoTipo.map((t) => t.operadora))],
    [taxasDoTipo],
  );
  const opcoesDeParcela = useMemo(
    () => taxasDoTipo.filter((t) => t.operadora === operadora),
    [taxasDoTipo, operadora],
  );
  const taxaEscolhida = taxasDoTipo.find((t) => t.id === taxaId) ?? null;

  // A conta ao vivo, em centavos — a mesma matemática da ação de servidor.
  const conta = useMemo(() => {
    const originalCent = paraCentavos(original) ?? 0;
    const descontoCent = paraCentavos(desconto || "0") ?? 0;
    const finalCent = Math.max(0, originalCent - descontoCent);

    const bpPadrao = usaCartao && taxaEscolhida ? bpDoBanco(taxaEscolhida.percentual) : 0;
    // Taxa manual vazia ou inválida dá `null`: a prévia mostra "—" em vez
    // de fingir 0% (a ação de servidor recusa esse caso).
    const bp = usaCartao ? taxaDaPrevia({ manual, textoManual: percentualManual, bpPadrao }) : 0;

    const taxaCent = bp === null ? null : custoDaTaxa(finalCent, bp);
    return {
      finalCent,
      bpPadrao,
      bp,
      taxaCent,
      liquidoCent: taxaCent === null ? null : finalCent - taxaCent,
    };
  }, [original, desconto, usaCartao, taxaEscolhida, manual, percentualManual]);

  const erros = estado.erros;

  function aoTrocarForma(nova: FormaPagamento) {
    setForma(nova);
    setOperadora("");
    setTaxaId("");
    setManual(false);
  }

  function aoTrocarOperadora(nova: string) {
    setOperadora(nova);
    // Débito tem uma linha só por operadora: já escolhe.
    const linhas = taxasDoTipo.filter((t) => t.operadora === nova);
    setTaxaId(linhas.length === 1 ? linhas[0].id : "");
  }

  return (
    <form action={enviar} className="flex flex-col gap-8" noValidate>
      <input type="hidden" name="chave_envio" value={chaveEnvio} />
      {erros.geral ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erros.geral}
        </p>
      ) : null}

      <SeletorPaciente inicial={pacienteInicial} erro={erros.paciente_id} />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Campo
          id="procedimento_id"
          rotulo="Procedimento ou serviço"
          obrigatorio
          erro={erros.procedimento_id}
        >
          <select
            id="procedimento_id"
            name="procedimento_id"
            required
            value={procedimentoId}
            onChange={(e) => {
              setProcedimentoId(e.target.value);
              const p = procedimentos.find((x) => x.id === e.target.value);
              if (p && p.valorPadrao > 0) {
                setOriginal(p.valorPadrao.toFixed(2).replace(".", ","));
              }
            }}
            className={cn(ENTRADA, erros.procedimento_id && ENTRADA_ERRO)}
          >
            <option value="">Escolher…</option>
            {procedimentos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>

        <Campo id="data_venda" rotulo="Data da venda" obrigatorio erro={erros.data_venda}>
          <input
            id="data_venda"
            name="data_venda"
            type="date"
            required
            defaultValue={de("data_venda", dataPadrao)}
            className={cn(ENTRADA, erros.data_venda && ENTRADA_ERRO)}
          />
        </Campo>

        <Campo
          id="valor_original"
          rotulo="Valor original (R$)"
          obrigatorio
          erro={erros.valor_original}
          dica="Preenchido pela tabela do procedimento; ajuste se for o caso."
        >
          <input
            id="valor_original"
            name="valor_original"
            type="text"
            inputMode="decimal"
            required
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="0,00"
            className={cn(ENTRADA, "tabular", erros.valor_original && ENTRADA_ERRO)}
          />
        </Campo>

        <Campo
          id="desconto"
          rotulo="Desconto (R$)"
          erro={erros.desconto}
          dica="Vazio quando não houver."
        >
          <input
            id="desconto"
            name="desconto"
            type="text"
            inputMode="decimal"
            value={desconto}
            onChange={(e) => setDesconto(e.target.value)}
            placeholder="0,00"
            className={cn(ENTRADA, "tabular", erros.desconto && ENTRADA_ERRO)}
          />
        </Campo>
      </div>

      {/* Pagamento --------------------------------------------------------- */}
      <GrupoDeCampos titulo="Pagamento">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Campo id="forma" rotulo="Forma de pagamento" obrigatorio erro={erros.forma}>
            <select
              id="forma"
              name="forma"
              required
              value={forma}
              onChange={(e) => aoTrocarForma(e.target.value as FormaPagamento)}
              className={cn(ENTRADA, erros.forma && ENTRADA_ERRO)}
            >
              {FORMAS_EM_ORDEM.map((f) => (
                <option key={f} value={f}>
                  {ROTULO_FORMA[f]}
                </option>
              ))}
            </select>
          </Campo>

          {usaCartao ? (
            <>
              <Campo
                id="operadora"
                rotulo="Operadora ou maquininha"
                obrigatorio
                erro={operadoras.length === 0 ? erros.taxa : undefined}
              >
                <select
                  id="operadora"
                  value={operadora}
                  onChange={(e) => aoTrocarOperadora(e.target.value)}
                  className={ENTRADA}
                >
                  <option value="">Escolher…</option>
                  {operadoras.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {operadoras.length === 0 ? (
                  <p className="mt-1.5 text-xs text-atencao">
                    Nenhuma taxa de {ROTULO_FORMA[forma].toLowerCase()} cadastrada.
                    A administradora configura em Financeiro → Taxas de cartão.
                  </p>
                ) : null}
              </Campo>

              {formaParcela(forma) ? (
                <Campo id="taxa_cartao_id_campo" rotulo="Parcelas" obrigatorio erro={erros.parcelas}>
                  <select
                    id="taxa_cartao_id_campo"
                    value={taxaId}
                    onChange={(e) => setTaxaId(e.target.value)}
                    disabled={!operadora}
                    className={ENTRADA}
                  >
                    <option value="">Escolher…</option>
                    {opcoesDeParcela.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.parcelas}x — taxa {formatarPercentual(bpDoBanco(t.percentual))}
                      </option>
                    ))}
                  </select>
                </Campo>
              ) : null}

              {/* O que a ação de servidor lê. */}
              <input type="hidden" name="taxa_cartao_id" value={taxaId} />
              <input
                type="hidden"
                name="parcelas"
                value={taxaEscolhida ? String(taxaEscolhida.parcelas) : "1"}
              />
            </>
          ) : (
            <input type="hidden" name="parcelas" value="1" />
          )}
        </div>

        {erros.taxa && operadoras.length > 0 ? (
          <p role="alert" className="mt-3 text-xs text-error">
            {erros.taxa}
          </p>
        ) : null}

        {/* Taxa manual — só para quem pode; a paciente nunca paga a taxa. */}
        {usaCartao && taxaEscolhida ? (
          podeAlterarTaxa ? (
            <div className="mt-4 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-on-surface">
                <input
                  type="checkbox"
                  name="taxa_manual"
                  value="sim"
                  checked={manual}
                  onChange={(e) => setManual(e.target.checked)}
                  className="size-4 accent-[var(--color-primary-container)]"
                />
                Alterar a taxa desta venda
              </label>

              {manual ? (
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Campo
                    id="taxa_percentual"
                    rotulo="Nova taxa (%)"
                    obrigatorio
                    erro={erros.taxa_percentual}
                    dica={`Taxa padrão: ${formatarPercentual(conta.bpPadrao)}. A tabela não muda — só esta venda.`}
                  >
                    <input
                      id="taxa_percentual"
                      name="taxa_percentual"
                      type="text"
                      inputMode="decimal"
                      value={percentualManual}
                      onChange={(e) => setPercentualManual(e.target.value)}
                      placeholder={formatarPercentual(conta.bpPadrao).replace("%", "")}
                      className={cn(ENTRADA, "tabular", erros.taxa_percentual && ENTRADA_ERRO)}
                    />
                  </Campo>

                  <Campo
                    id="taxa_justificativa"
                    rotulo="Justificativa"
                    obrigatorio
                    erro={erros.taxa_justificativa}
                    dica="Fica registrada com seu nome, data e hora."
                  >
                    <input
                      id="taxa_justificativa"
                      name="taxa_justificativa"
                      type="text"
                      maxLength={500}
                      defaultValue={de("taxa_justificativa")}
                      placeholder="Negociação especial com a operadora"
                      className={cn(ENTRADA, erros.taxa_justificativa && ENTRADA_ERRO)}
                    />
                  </Campo>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-xs text-outline">
              Taxa padrão de {formatarPercentual(conta.bpPadrao)} aplicada. Alterar a
              taxa é restrito ao financeiro e à administradora.
            </p>
          )
        ) : null}

        {/* Resumo da conta ------------------------------------------------- */}
        <div className="mt-5 flex flex-col gap-2 rounded-[var(--radius-cartao)] border border-card-border bg-surface p-4">
          <LinhaDaConta rotulo="Valor final negociado" valor={formatarMoeda(conta.finalCent / 100)} />
          {usaCartao ? (
            <LinhaDaConta
              rotulo={
                conta.bp === null
                  ? "Taxa do cartão (informe a nova taxa) — descontada da clínica"
                  : `Taxa do cartão (${formatarPercentual(conta.bp)}) — descontada da clínica`
              }
              valor={conta.taxaCent === null ? "—" : `− ${formatarMoeda(conta.taxaCent / 100)}`}
              negativa
            />
          ) : null}
          <div className="border-t border-card-border pt-2">
            <LinhaDaConta
              rotulo="Líquido para a clínica"
              valor={conta.liquidoCent === null ? "—" : formatarMoeda(conta.liquidoCent / 100)}
              destaque
            />
          </div>
          {usaCartao && taxaEscolhida && taxaEscolhida.parcelas > 1 ? (
            <p className="text-xs text-outline">
              A paciente parcela em {taxaEscolhida.parcelas}x; a operadora antecipa e a
              clínica recebe <strong>um único repasse</strong> — a taxa já inclui a
              antecipação.
            </p>
          ) : null}
        </div>
      </GrupoDeCampos>

      {/* Recebimento ------------------------------------------------------- */}
      <GrupoDeCampos
        titulo="Recebimento"
        descricao="A venda gera um recebimento só, pelo valor líquido."
      >
        <div className="flex flex-col gap-4">
          <div
            role="radiogroup"
            aria-label="Situação do recebimento"
            aria-invalid={erros.situacao_inicial ? true : undefined}
            aria-describedby={erros.situacao_inicial ? "situacao_inicial-erro" : undefined}
            className="flex flex-wrap gap-3"
          >
            {(
              [
                ["previsto", "A receber"],
                ["recebido", "Já recebido"],
              ] as const
            ).map(([valor, rotulo]) => (
              <label
                key={valor}
                className={cn(
                  // O rádio é sr-only: o foco do teclado aparece no rótulo.
                  "flex cursor-pointer items-center gap-2 rounded-[var(--radius-controle)] border px-4 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                  situacaoInicial === valor
                    ? "border-primary bg-secondary-fixed text-primary"
                    : "border-card-border bg-surface text-on-surface-variant hover:border-primary",
                )}
              >
                <input
                  type="radio"
                  name="situacao_inicial"
                  value={valor}
                  checked={situacaoInicial === valor}
                  onChange={() => setSituacaoInicial(valor)}
                  className="sr-only"
                />
                {rotulo}
              </label>
            ))}
          </div>

          {erros.situacao_inicial ? (
            <p id="situacao_inicial-erro" role="alert" className="text-xs text-error">
              {erros.situacao_inicial}
            </p>
          ) : null}

          {situacaoInicial === "previsto" ? (
            <Campo
              id="vencimento"
              rotulo="Data prevista"
              obrigatorio
              erro={erros.vencimento}
              className="sm:max-w-xs"
              dica="No cartão, o dia do repasse da operadora."
            >
              <input
                id="vencimento"
                name="vencimento"
                type="date"
                defaultValue={de("vencimento", dataPadrao)}
                className={cn(ENTRADA, erros.vencimento && ENTRADA_ERRO)}
              />
            </Campo>
          ) : (
            <Campo
              id="recebido_em"
              rotulo="Recebido em"
              obrigatorio
              erro={erros.recebido_em}
              className="sm:max-w-xs"
            >
              <input
                id="recebido_em"
                name="recebido_em"
                type="date"
                max={dataPadrao}
                defaultValue={de("recebido_em", dataPadrao)}
                className={cn(ENTRADA, erros.recebido_em && ENTRADA_ERRO)}
              />
            </Campo>
          )}
        </div>
      </GrupoDeCampos>

      <Campo id="observacoes" rotulo="Observações">
        <textarea
          id="observacoes"
          name="observacoes"
          maxLength={2000}
          defaultValue={de("observacoes")}
          className={AREA_TEXTO}
        />
      </Campo>

      <div className="flex flex-wrap items-center gap-3 border-t border-card-border pt-6">
        <BotaoSalvar />
        <Link
          href="/financeiro/vendas"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-controle)] px-6 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
