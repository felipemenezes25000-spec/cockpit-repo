"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { ehFinanceira, usuarioAtual } from "@/lib/auth";
import { chaveDoDia, dataValida } from "@/lib/dates";
import { competenciaDoVencimento, validarDespesa, type ErrosDespesa } from "@/lib/despesa";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { centavosParaBanco } from "@/lib/moeda";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import { FORMAS_EM_ORDEM, type FormaPagamento } from "@/lib/venda";

/**
 * Despesas: criar, editar, pagar, cancelar e reabrir.
 *
 * Restritas ao financeiro e à administradora — na aplicação e na RLS. Despesa
 * não se apaga: cancela e reabre. Desde a 0019 o banco também não deixa
 * apagar, e toda mudança entra na auditoria.
 *
 * A taxa de cartão NÃO entra aqui. Ela já é descontada no líquido dos
 * recebimentos; registrá-la como despesa contaria o custo duas vezes.
 */

export type EstadoDespesa = {
  erros: ErrosDespesa;
  valores?: Record<string, string>;
};

async function exigirFinanceira(): Promise<{ id: string } | string> {
  const usuario = await usuarioAtual();
  if (!usuario) return "Sessão expirada. Entre novamente.";
  if (!(await ehFinanceira())) return "Despesas são do financeiro e da administradora.";
  return { id: usuario.id };
}

function lerFormulario(dados: FormData) {
  return validarDespesa({
    descricao: campoTexto(dados, "descricao", 200),
    categoria: campoTexto(dados, "categoria", 30),
    valor: campoTexto(dados, "valor", 30),
    vencimento: campoTexto(dados, "vencimento", 10),
    observacoes: campoTexto(dados, "observacoes", 2000),
  });
}

function revalidar() {
  revalidatePath("/financeiro");
  revalidatePath("/financeiro/despesas");
  revalidatePath("/financeiro/movimentacoes");
  revalidatePath("/financeiro/fluxo");
  revalidatePath("/");
}

export async function criarDespesa(
  _anterior: EstadoDespesa,
  dados: FormData,
): Promise<EstadoDespesa> {
  const quem = await exigirFinanceira();
  if (typeof quem === "string") return { erros: { geral: quem } };

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: valoresDigitados(dados) };

  const c = resultado.campos;
  const supabase = await clienteServidor();
  const { error } = await supabase.from("despesas").insert({
    descricao: c.descricao,
    categoria: c.categoria,
    valor: centavosParaBanco(c.valorCent),
    vencimento: c.vencimento,
    competencia: competenciaDoVencimento(c.vencimento),
    observacoes: c.observacoes,
    criado_por: quem.id,
  });

  if (error) {
    registrarFalha("despesas: criar", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível salvar a despesa. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidar();
  redirect("/financeiro/despesas");
}

export async function atualizarDespesa(
  _anterior: EstadoDespesa,
  dados: FormData,
): Promise<EstadoDespesa> {
  const quem = await exigirFinanceira();
  if (typeof quem === "string") return { erros: { geral: quem } };

  const id = campoTexto(dados, "id", 36);
  if (!uuidValido(id)) return { erros: { geral: "Despesa não identificada." } };

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: valoresDigitados(dados) };

  const c = resultado.campos;
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("despesas")
    .update({
      descricao: c.descricao,
      categoria: c.categoria,
      valor: centavosParaBanco(c.valorCent),
      vencimento: c.vencimento,
      competencia: competenciaDoVencimento(c.vencimento),
      observacoes: c.observacoes,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("despesas: atualizar", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível salvar as alterações. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }
  if (!data) return { erros: { geral: "Despesa não encontrada." }, valores: valoresDigitados(dados) };

  revalidar();
  redirect("/financeiro/despesas");
}

/**
 * Paga, cancela ou reabre. A constraint `despesa_coerente` garante que paga
 * tem data de pagamento e pendente não tem — por isso a data é validada aqui
 * antes, para a recusa vir com frase e não com o CHECK do banco.
 */
export async function mudarSituacaoDespesa(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const quem = await exigirFinanceira();
  if (typeof quem === "string") return falha(quem);

  const id = campoTexto(dados, "id", 36);
  const acao = campoTexto(dados, "acao", 20);
  if (!uuidValido(id)) return falha("Despesa não identificada.");

  const supabase = await clienteServidor();
  let consulta;

  if (acao === "pagar") {
    const pagoEm = campoTexto(dados, "pago_em", 10);
    const forma = campoTexto(dados, "forma", 20);

    if (!dataValida(pagoEm)) return falha("Informe a data do pagamento.");
    if (pagoEm > chaveDoDia()) return falha("A data do pagamento não pode estar no futuro.");

    consulta = supabase
      .from("despesas")
      .update({
        situacao: "paga",
        pago_em: pagoEm,
        forma: (FORMAS_EM_ORDEM as string[]).includes(forma) ? (forma as FormaPagamento) : null,
      })
      .eq("id", id)
      .eq("situacao", "pendente");
  } else if (acao === "reabrir") {
    consulta = supabase
      .from("despesas")
      .update({ situacao: "pendente", pago_em: null, forma: null })
      .eq("id", id)
      .in("situacao", ["paga", "cancelada"]);
  } else if (acao === "cancelar") {
    consulta = supabase
      .from("despesas")
      .update({ situacao: "cancelada", pago_em: null })
      .eq("id", id)
      .eq("situacao", "pendente");
  } else {
    return falha("Ação desconhecida.");
  }

  const { data, error } = await consulta.select("id").maybeSingle();

  if (error) {
    registrarFalha(`despesas: ${acao}`, error);
    return falha(mensagemDoBanco(error, "Não foi possível alterar a despesa. Tente de novo."));
  }
  if (!data) {
    return falha("A despesa já tinha mudado de situação. A lista foi atualizada.");
  }

  revalidar();
  const feito = { pagar: "Despesa paga.", reabrir: "Despesa reaberta.", cancelar: "Despesa cancelada." };
  return sucesso(feito[acao as keyof typeof feito]);
}
