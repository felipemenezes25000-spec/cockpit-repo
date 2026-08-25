"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ehFinanceira, usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { centavosParaBanco } from "@/lib/moeda";
import { validarDespesa, type ErrosDespesa } from "@/lib/despesa";
import type { FormaPagamento } from "@/lib/venda";
import { FORMAS_EM_ORDEM } from "@/lib/venda";

/**
 * Despesas: criar, editar, pagar, cancelar e reabrir.
 *
 * Restritas ao financeiro e à administradora — na aplicação e na RLS
 * (`despesas_financeiro`). Despesa não se apaga: cancela e reabre.
 *
 * A taxa de cartão NÃO entra aqui. Ela já é descontada no líquido dos
 * recebimentos; registrá-la como despesa contaria o custo duas vezes.
 */

export type EstadoDespesa = {
  erros: ErrosDespesa;
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

async function exigirFinanceira(): Promise<EstadoDespesa | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };
  if (!(await ehFinanceira())) {
    return { erros: { geral: "Despesas são do financeiro e da administradora." } };
  }
  return null;
}

function lerFormulario(dados: FormData) {
  return validarDespesa({
    descricao: texto(dados, "descricao"),
    categoria: texto(dados, "categoria"),
    valor: texto(dados, "valor"),
    vencimento: texto(dados, "vencimento"),
    observacoes: texto(dados, "observacoes"),
  });
}

function revalidar() {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/despesas");
  revalidatePath("/");
}

export async function criarDespesa(
  _anterior: EstadoDespesa,
  dados: FormData,
): Promise<EstadoDespesa> {
  const barrada = await exigirFinanceira();
  if (barrada) return barrada;

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: digitados(dados) };

  const c = resultado.campos;
  const supabase = await clienteServidor();
  const { error } = await supabase.from("despesas").insert({
    descricao: c.descricao,
    categoria: c.categoria,
    valor: centavosParaBanco(c.valorCent),
    vencimento: c.vencimento,
    // Competência é o mês do vencimento — regra simples até a clínica pedir outra.
    competencia: `${c.vencimento.slice(0, 7)}-01`,
    observacoes: c.observacoes,
    criado_por: (await usuarioAtual())!.id,
  });

  if (error) {
    return {
      erros: { geral: `Não foi possível salvar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  revalidar();
  redirect("/financeiro/despesas");
}

export async function atualizarDespesa(
  _anterior: EstadoDespesa,
  dados: FormData,
): Promise<EstadoDespesa> {
  const barrada = await exigirFinanceira();
  if (barrada) return barrada;

  const id = texto(dados, "id");
  if (!UUID.test(id)) return { erros: { geral: "Despesa não identificada." } };

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: digitados(dados) };

  const c = resultado.campos;
  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("despesas")
    .update({
      descricao: c.descricao,
      categoria: c.categoria,
      valor: centavosParaBanco(c.valorCent),
      vencimento: c.vencimento,
      competencia: `${c.vencimento.slice(0, 7)}-01`,
      observacoes: c.observacoes,
    })
    .eq("id", id);

  if (error) {
    return {
      erros: { geral: `Não foi possível salvar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  revalidar();
  redirect("/financeiro/despesas");
}

/**
 * Paga, cancela ou reabre. A constraint `despesa_coerente` garante que
 * paga tem data de pagamento e pendente não tem.
 */
export async function mudarSituacaoDespesa(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (!(await ehFinanceira())) return;

  const id = texto(dados, "id");
  const acao = texto(dados, "acao");
  if (!UUID.test(id)) return;

  const supabase = await clienteServidor();

  if (acao === "pagar") {
    const pagoEm = texto(dados, "pago_em");
    const forma = texto(dados, "forma");
    await supabase
      .from("despesas")
      .update({
        situacao: "paga",
        pago_em: DATA.test(pagoEm) ? pagoEm : null,
        forma: FORMAS_EM_ORDEM.includes(forma as FormaPagamento)
          ? (forma as FormaPagamento)
          : null,
      })
      .eq("id", id)
      .eq("situacao", "pendente");
  } else if (acao === "reabrir") {
    await supabase
      .from("despesas")
      .update({ situacao: "pendente", pago_em: null, forma: null })
      .in("situacao", ["paga", "cancelada"])
      .eq("id", id);
  } else if (acao === "cancelar") {
    await supabase
      .from("despesas")
      .update({ situacao: "cancelada", pago_em: null })
      .eq("id", id)
      .eq("situacao", "pendente");
  }

  revalidar();
}
