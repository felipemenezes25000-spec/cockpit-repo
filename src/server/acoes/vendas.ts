"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ehFinanceira, usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import {
  bpDoBanco,
  bpParaBanco,
  centavosDoBanco,
  centavosParaBanco,
  lerPercentual,
  paraCentavos,
} from "@/lib/moeda";
import {
  calcularVenda,
  formaUsaCartao,
  FORMAS_EM_ORDEM,
  parcelasValidas,
  type FormaPagamento,
} from "@/lib/venda";

/**
 * Ações do módulo de vendas.
 *
 * Toda gravação composta passa pelas funções do banco (`venda_registrar`,
 * `venda_alterar_pagamento`): tudo ou nada, com a RLS de quem chama. O
 * dinheiro é calculado em centavos inteiros e as CHECK constraints conferem
 * a conta de novo na chegada.
 */

export type ErrosVenda = Partial<
  Record<
    | "paciente_id"
    | "procedimento_id"
    | "data_venda"
    | "valor_original"
    | "desconto"
    | "forma"
    | "parcelas"
    | "taxa"
    | "vencimento"
    | "recebido_em"
    | "motivo"
    | "geral",
    string
  >
>;

export type EstadoVenda = {
  erros: ErrosVenda;
  valores?: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

function digitados(dados: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of dados.entries()) {
    if (typeof valor === "string") valores[chave] = valor;
  }
  return valores;
}

/**
 * Resolve a taxa da venda a partir do formulário.
 *
 * Cartão exige uma linha da tabela padrão — é ela que preenche o percentual.
 * Taxa manual só entra para quem pode, com justificativa; a tabela padrão
 * nunca é tocada por aqui. Formas sem cartão têm taxa zero, sempre.
 */
async function resolverTaxa(
  dados: FormData,
  forma: FormaPagamento,
  parcelas: number,
  podeManual: boolean,
): Promise<
  | { taxaBp: number; taxaCartaoId: string | null; manual: boolean; justificativa: string | null }
  | { erroTaxa: string }
> {
  if (!formaUsaCartao(forma)) {
    return { taxaBp: 0, taxaCartaoId: null, manual: false, justificativa: null };
  }

  const taxaCartaoId = texto(dados, "taxa_cartao_id");
  const querManual = dados.get("taxa_manual") === "sim";

  if (!UUID.test(taxaCartaoId)) {
    return {
      erroTaxa:
        "Escolha a operadora e o parcelamento. Se a combinação não existir, a administradora cadastra em Financeiro → Taxas de cartão.",
    };
  }

  const supabase = await clienteServidor();
  const { data: taxa } = await supabase
    .from("taxas_cartao")
    .select("id, tipo, parcelas, percentual, ativa")
    .eq("id", taxaCartaoId)
    .maybeSingle();

  if (!taxa || !taxa.ativa) {
    return { erroTaxa: "Esta taxa não está mais ativa. Escolha outra." };
  }
  if (taxa.tipo !== forma) {
    return { erroTaxa: "A taxa escolhida é de outro tipo de cartão." };
  }
  if (taxa.parcelas !== parcelas) {
    return { erroTaxa: "A taxa escolhida é de outro parcelamento." };
  }

  if (!querManual) {
    return {
      taxaBp: bpDoBanco(Number(taxa.percentual)),
      taxaCartaoId,
      manual: false,
      justificativa: null,
    };
  }

  // Daqui para baixo é alteração manual: restrita e justificada.
  if (!podeManual) {
    return { erroTaxa: "Alterar a taxa é restrito ao financeiro e à administradora." };
  }

  const bp = lerPercentual(texto(dados, "taxa_percentual"));
  if (bp === null) {
    return { erroTaxa: "Percentual inválido. Use 6 ou 6,5." };
  }

  const justificativa = texto(dados, "taxa_justificativa").slice(0, 500);
  if (justificativa.length < 5) {
    return { erroTaxa: "A taxa manual exige uma justificativa." };
  }

  return { taxaBp: bp, taxaCartaoId, manual: true, justificativa };
}

export async function registrarVenda(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const erros: ErrosVenda = {};

  const pacienteId = texto(dados, "paciente_id");
  const procedimentoId = texto(dados, "procedimento_id");
  const dataVenda = texto(dados, "data_venda");
  const forma = texto(dados, "forma") as FormaPagamento;
  const parcelas = Number(texto(dados, "parcelas") || "1");
  const originalCent = paraCentavos(texto(dados, "valor_original"));
  const descontoCent = paraCentavos(texto(dados, "desconto") || "0");
  const situacaoInicial = texto(dados, "situacao_inicial");
  const vencimento = texto(dados, "vencimento");
  const recebidoEm = texto(dados, "recebido_em");
  const observacoes = texto(dados, "observacoes").slice(0, 2000);

  if (!UUID.test(pacienteId)) erros.paciente_id = "Escolha a paciente.";
  if (!UUID.test(procedimentoId)) erros.procedimento_id = "Escolha o procedimento.";
  if (!DATA.test(dataVenda)) erros.data_venda = "Informe a data da venda.";
  if (!FORMAS_EM_ORDEM.includes(forma)) erros.forma = "Escolha a forma de pagamento.";
  if (originalCent === null) erros.valor_original = "Valor inválido. Use 150 ou 150,00.";
  if (descontoCent === null) erros.desconto = "Desconto inválido.";
  if (FORMAS_EM_ORDEM.includes(forma) && !parcelasValidas(forma, parcelas)) {
    erros.parcelas = "Parcelamento inválido para esta forma.";
  }

  if (situacaoInicial !== "previsto" && situacaoInicial !== "recebido") {
    erros.geral = "Situação inicial inválida.";
  }
  if (situacaoInicial === "previsto" && !DATA.test(vencimento)) {
    erros.vencimento = "Informe a data prevista do recebimento.";
  }
  if (situacaoInicial === "recebido" && !DATA.test(recebidoEm)) {
    erros.recebido_em = "Informe quando o valor entrou.";
  }

  if (Object.keys(erros).length > 0) return { erros, valores: digitados(dados) };

  const taxa = await resolverTaxa(dados, forma, parcelas, await ehFinanceira());
  if ("erroTaxa" in taxa) {
    return { erros: { taxa: taxa.erroTaxa }, valores: digitados(dados) };
  }

  const conta = calcularVenda({
    originalCent: originalCent!,
    descontoCent: descontoCent!,
    taxaBp: taxa.taxaBp,
  });
  if ("erro" in conta) {
    return { erros: { desconto: conta.erro }, valores: digitados(dados) };
  }

  const supabase = await clienteServidor();

  // Nome do procedimento vira a descrição do recebimento.
  const { data: procedimento } = await supabase
    .from("procedimentos")
    .select("nome")
    .eq("id", procedimentoId)
    .maybeSingle();

  const { data: vendaId, error } = await supabase.rpc("venda_registrar", {
    p_paciente_id: pacienteId,
    p_procedimento_id: procedimentoId,
    p_data_venda: dataVenda,
    p_valor_original: centavosParaBanco(conta.originalCent),
    p_desconto: centavosParaBanco(conta.descontoCent),
    p_forma: forma,
    p_parcelas: parcelas,
    // O tipo gerado não marca os opcionais como nulos; o Postgres aceita.
    p_taxa_cartao_id: taxa.taxaCartaoId as unknown as string,
    p_taxa_percentual: bpParaBanco(conta.taxaBp),
    p_taxa_valor: centavosParaBanco(conta.taxaCent),
    p_taxa_manual: taxa.manual,
    p_taxa_justificativa: taxa.justificativa as unknown as string,
    p_observacoes: (observacoes || null) as unknown as string,
    p_situacao_inicial: situacaoInicial as "previsto" | "recebido",
    p_vencimento: (situacaoInicial === "previsto" ? vencimento : dataVenda) as string,
    p_recebido_em: (situacaoInicial === "recebido"
      ? recebidoEm
      : null) as unknown as string,
    p_descricao: (procedimento?.nome ?? null) as unknown as string,
  });

  if (error || !vendaId) {
    return {
      erros: { geral: `Não foi possível registrar a venda: ${error?.message}` },
      valores: digitados(dados),
    };
  }

  revalidatePath("/financeiro");
  revalidatePath("/financeiro/vendas");
  revalidatePath("/");
  redirect(`/financeiro/vendas/${vendaId}`);
}

// ---------------------------------------------------------------------
// Alterar forma de pagamento ou taxa
// ---------------------------------------------------------------------

async function executarAlteracao(
  dados: FormData,
  tipo: "forma_pagamento" | "taxa_manual",
): Promise<EstadoVenda> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  if (!(await ehFinanceira())) {
    return {
      erros: { geral: "Alterar uma venda é restrito ao financeiro e à administradora." },
    };
  }

  const vendaId = texto(dados, "venda_id");
  if (!UUID.test(vendaId)) return { erros: { geral: "Venda não identificada." } };

  const motivo = texto(dados, "motivo").slice(0, 500);
  if (motivo.length < 5) {
    return { erros: { motivo: "Explique o motivo da alteração." }, valores: digitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data: venda } = await supabase
    .from("vendas")
    .select("valor_original, desconto, valor_final, forma, parcelas, taxa_cartao_id")
    .eq("id", vendaId)
    .maybeSingle();

  if (!venda) return { erros: { geral: "Venda não encontrada." } };

  let forma: FormaPagamento;
  let parcelas: number;
  let taxaBp: number;
  let taxaCartaoId: string | null;
  let manual: boolean;

  if (tipo === "forma_pagamento") {
    forma = texto(dados, "forma") as FormaPagamento;
    parcelas = Number(texto(dados, "parcelas") || "1");

    if (!FORMAS_EM_ORDEM.includes(forma)) {
      return { erros: { forma: "Escolha a forma de pagamento." }, valores: digitados(dados) };
    }
    if (!parcelasValidas(forma, parcelas)) {
      return { erros: { parcelas: "Parcelamento inválido." }, valores: digitados(dados) };
    }

    const taxa = await resolverTaxa(dados, forma, parcelas, true);
    if ("erroTaxa" in taxa) {
      return { erros: { taxa: taxa.erroTaxa }, valores: digitados(dados) };
    }
    taxaBp = taxa.taxaBp;
    taxaCartaoId = taxa.taxaCartaoId;
    manual = taxa.manual;
  } else {
    // Só a taxa muda; forma e parcelas ficam como estão.
    forma = venda.forma;
    parcelas = venda.parcelas;
    taxaCartaoId = venda.taxa_cartao_id;
    manual = true;

    const bp = lerPercentual(texto(dados, "taxa_percentual"));
    if (bp === null) {
      return { erros: { taxa: "Percentual inválido. Use 6 ou 6,5." }, valores: digitados(dados) };
    }
    taxaBp = bp;
  }

  const conta = calcularVenda({
    originalCent: centavosDoBanco(Number(venda.valor_original)),
    descontoCent: centavosDoBanco(Number(venda.desconto)),
    taxaBp,
  });
  if ("erro" in conta) {
    return { erros: { taxa: conta.erro }, valores: digitados(dados) };
  }

  const { error } = await supabase.rpc("venda_alterar_pagamento", {
    p_venda_id: vendaId,
    p_tipo: tipo,
    p_forma: forma,
    p_parcelas: parcelas,
    p_taxa_cartao_id: taxaCartaoId as unknown as string,
    p_taxa_percentual: bpParaBanco(conta.taxaBp),
    p_taxa_valor: centavosParaBanco(conta.taxaCent),
    p_taxa_manual: manual,
    p_motivo: motivo,
  });

  if (error) {
    return {
      erros: { geral: `Não foi possível alterar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  revalidatePath("/financeiro");
  revalidatePath("/financeiro/vendas");
  revalidatePath(`/financeiro/vendas/${vendaId}`);
  revalidatePath("/");
  redirect(`/financeiro/vendas/${vendaId}`);
}

export async function alterarFormaPagamento(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  return executarAlteracao(dados, "forma_pagamento");
}

export async function alterarTaxaManual(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  return executarAlteracao(dados, "taxa_manual");
}

// ---------------------------------------------------------------------
// Recebimento: confirmar e mudar situação
// ---------------------------------------------------------------------

export async function confirmarRecebimento(
  _anterior: EstadoVenda,
  dados: FormData,
): Promise<EstadoVenda> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  if (!(await ehFinanceira())) {
    return { erros: { geral: "Confirmar recebimento é do financeiro e da administradora." } };
  }

  const id = texto(dados, "recebimento_id");
  const vendaId = texto(dados, "venda_id");
  const recebidoEm = texto(dados, "recebido_em");
  const valorCent = paraCentavos(texto(dados, "valor_recebido"));

  if (!UUID.test(id) || !UUID.test(vendaId)) {
    return { erros: { geral: "Recebimento não identificado." } };
  }
  if (!DATA.test(recebidoEm)) {
    return { erros: { recebido_em: "Informe a data em que o valor entrou." }, valores: digitados(dados) };
  }
  if (valorCent === null || valorCent < 0) {
    return { erros: { geral: "Valor recebido inválido." }, valores: digitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data: recebimento } = await supabase
    .from("recebimentos")
    .select("situacao, valor, taxa_valor")
    .eq("id", id)
    .maybeSingle();

  if (!recebimento) return { erros: { geral: "Recebimento não encontrado." } };
  if (recebimento.situacao !== "previsto" && recebimento.situacao !== "pendente") {
    return { erros: { geral: "Este recebimento já foi confirmado ou cancelado." } };
  }

  // Divergência é fato, não opinião: entrou diferente do líquido previsto.
  const liquidoCent =
    centavosDoBanco(Number(recebimento.valor)) -
    centavosDoBanco(Number(recebimento.taxa_valor));
  const situacao = valorCent === liquidoCent ? "recebido" : "recebido_divergencia";

  const { error } = await supabase
    .from("recebimentos")
    .update({
      situacao,
      recebido_em: recebidoEm,
      valor_recebido: centavosParaBanco(valorCent),
    })
    .eq("id", id);

  if (error) {
    return { erros: { geral: `Não foi possível confirmar: ${error.message}` } };
  }

  revalidatePath("/financeiro");
  revalidatePath(`/financeiro/vendas/${vendaId}`);
  revalidatePath("/");
  redirect(`/financeiro/vendas/${vendaId}`);
}

/** Previsto ↔ pendente e cancelamento. Nada aqui apaga linha nenhuma. */
export async function mudarSituacaoRecebimento(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  if (!(await ehFinanceira())) return;

  const id = texto(dados, "recebimento_id");
  const vendaId = texto(dados, "venda_id");
  const para = texto(dados, "para");

  if (!UUID.test(id) || !["previsto", "pendente", "cancelado"].includes(para)) return;

  const supabase = await clienteServidor();
  await supabase
    .from("recebimentos")
    .update({ situacao: para as "previsto" | "pendente" | "cancelado" })
    .eq("id", id)
    .in("situacao", ["previsto", "pendente"]);

  revalidatePath("/financeiro");
  if (UUID.test(vendaId)) revalidatePath(`/financeiro/vendas/${vendaId}`);
}
