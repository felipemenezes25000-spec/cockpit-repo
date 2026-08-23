"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ehAdministradora, usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { validarProcedimento, type ErrosProcedimento } from "@/lib/procedimento";

/**
 * Tabela de procedimentos: criar, editar, ativar e desativar.
 *
 * Só a administradora escreve. A RLS já garante isso no banco
 * (`procedimentos_escrita`); a checagem aqui devolve mensagem em vez de erro
 * cru. Não existe apagar: procedimento com atendimento no histórico não pode
 * sumir — o banco recusaria (`on delete restrict`). Desativar tira da agenda e
 * preserva o passado.
 */

export type EstadoProcedimento = {
  erros: ErrosProcedimento;
  valores?: Record<string, string>;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

function lerFormulario(dados: FormData) {
  return validarProcedimento({
    nome: texto(dados, "nome"),
    duracao_min: texto(dados, "duracao_min"),
    valor_padrao: texto(dados, "valor_padrao"),
    retorno_sugerido_dias: texto(dados, "retorno_sugerido_dias"),
  });
}

async function exigirAdministradora(): Promise<EstadoProcedimento | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };
  if (!(await ehAdministradora())) {
    return { erros: { geral: "Só a administradora altera a tabela de procedimentos." } };
  }
  return null;
}

function revalidar(id?: string) {
  revalidatePath("/configuracoes");
  revalidatePath("/configuracoes/procedimentos");
  if (id) revalidatePath(`/configuracoes/procedimentos/${id}/editar`);
  // O formulário da agenda e a ficha leem o catálogo.
  revalidatePath("/agenda/novo");
}

export async function criarProcedimento(
  _anterior: EstadoProcedimento,
  dados: FormData,
): Promise<EstadoProcedimento> {
  const barrado = await exigirAdministradora();
  if (barrado) return barrado;

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: digitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("procedimentos").insert(resultado.campos);

  if (error) {
    return {
      erros: { geral: `Não foi possível salvar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  revalidar();
  redirect("/configuracoes/procedimentos");
}

export async function atualizarProcedimento(
  _anterior: EstadoProcedimento,
  dados: FormData,
): Promise<EstadoProcedimento> {
  const barrado = await exigirAdministradora();
  if (barrado) return barrado;

  const id = texto(dados, "id");
  if (!UUID.test(id)) return { erros: { geral: "Procedimento não identificado." } };

  const resultado = lerFormulario(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: digitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("procedimentos")
    .update(resultado.campos)
    .eq("id", id);

  if (error) {
    return {
      erros: { geral: `Não foi possível salvar: ${error.message}` },
      valores: digitados(dados),
    };
  }

  revalidar(id);
  redirect("/configuracoes/procedimentos");
}

/** Desativar tira da agenda; reativar devolve. O histórico não muda. */
export async function alternarAtivoProcedimento(dados: FormData): Promise<void> {
  const barrado = await exigirAdministradora();
  if (barrado) return;

  const id = texto(dados, "id");
  const ativar = dados.get("ativar") === "sim";
  if (!UUID.test(id)) return;

  const supabase = await clienteServidor();
  await supabase.from("procedimentos").update({ ativo: ativar }).eq("id", id);

  revalidar(id);
}
