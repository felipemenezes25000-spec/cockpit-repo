"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisarNaProximaTela } from "@/server/aviso";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { ehAdministradora, usuarioAtual } from "@/lib/auth";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { validarProcedimento, type ErrosProcedimento } from "@/lib/procedimento";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";

/**
 * Tabela de procedimentos: criar, editar, ativar e desativar.
 *
 * Só a administradora escreve. A RLS garante isso no banco; a checagem aqui
 * devolve mensagem em vez de erro cru. Não existe apagar: procedimento com
 * atendimento no histórico não pode sumir. Desativar tira da agenda e preserva
 * o passado.
 */

export type EstadoProcedimento = {
  erros: ErrosProcedimento;
  valores?: Record<string, string>;
};

function lerFormulario(dados: FormData) {
  return validarProcedimento({
    nome: campoTexto(dados, "nome", 120),
    duracao_min: campoTexto(dados, "duracao_min", 10),
    valor_padrao: campoTexto(dados, "valor_padrao", 30),
    retorno_sugerido_dias: campoTexto(dados, "retorno_sugerido_dias", 10),
  });
}

async function exigirAdministradora(): Promise<string | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return "Sessão expirada. Entre novamente.";
  if (!(await ehAdministradora())) return "Só a administradora altera a tabela de procedimentos.";
  return null;
}

function revalidar(id?: string) {
  revalidatePath("/configuracoes");
  revalidatePath("/configuracoes/procedimentos");
  if (id) revalidatePath(`/configuracoes/procedimentos/${id}/editar`);
  // O formulário da agenda e o da venda leem o catálogo.
  revalidatePath("/agenda/novo");
  revalidatePath("/financeiro/vendas/nova");
}

export async function criarProcedimento(
  _anterior: EstadoProcedimento,
  dados: FormData,
): Promise<EstadoProcedimento> {
  const barrado = await exigirAdministradora();
  if (barrado) return { erros: { geral: barrado } };

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: valoresDigitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("procedimentos").insert(resultado.campos);

  if (error) {
    registrarFalha("procedimentos: criar", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível salvar o procedimento. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidar();
  await avisarNaProximaTela("procedimento-criado");
  redirect("/configuracoes/procedimentos");
}

export async function atualizarProcedimento(
  _anterior: EstadoProcedimento,
  dados: FormData,
): Promise<EstadoProcedimento> {
  const barrado = await exigirAdministradora();
  if (barrado) return { erros: { geral: barrado } };

  const id = campoTexto(dados, "id", 36);
  if (!uuidValido(id)) return { erros: { geral: "Procedimento não identificado." } };

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: valoresDigitados(dados) };

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("procedimentos")
    .update(resultado.campos)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("procedimentos: atualizar", error);
    return {
      erros: { geral: mensagemDoBanco(error, "Não foi possível salvar as alterações. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }
  if (!data) return { erros: { geral: "Procedimento não encontrado." }, valores: valoresDigitados(dados) };

  revalidar(id);
  await avisarNaProximaTela("procedimento-alterado");
  redirect("/configuracoes/procedimentos");
}

/** Desativar tira da agenda; reativar devolve. O histórico não muda. */
export async function alternarAtivoProcedimento(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const barrado = await exigirAdministradora();
  if (barrado) return falha(barrado);

  const id = campoTexto(dados, "id", 36);
  const ativar = dados.get("ativar") === "sim";
  if (!uuidValido(id)) return falha("Procedimento não identificado.");

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("procedimentos")
    .update({ ativo: ativar })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("procedimentos: ativar/desativar", error);
    return falha(mensagemDoBanco(error, "Não foi possível alterar o procedimento. Tente de novo."));
  }
  if (!data) return falha("Procedimento não encontrado.");

  revalidar(id);
  return sucesso(ativar ? "Procedimento de volta à agenda." : "Procedimento fora da agenda.");
}
