"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ehAdministradora, usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import { bpParaBanco, lerPercentual } from "@/lib/moeda";
import type { TipoCartao } from "@/lib/venda";

/**
 * Tabela padrão de taxas de cartão. Só a administradora mexe — na
 * aplicação e na RLS (`taxas_escrita`).
 *
 * Alterar uma linha daqui NUNCA alcança venda antiga: a venda guarda a
 * própria cópia do percentual. O que muda é o padrão das próximas.
 */

export type ErrosTaxa = Partial<
  Record<"operadora" | "tipo" | "parcelas" | "percentual" | "geral", string>
>;

export type EstadoTaxa = {
  erros: ErrosTaxa;
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

async function exigirAdministradora(): Promise<EstadoTaxa | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };
  if (!(await ehAdministradora())) {
    return { erros: { geral: "Só a administradora configura a tabela de taxas." } };
  }
  return null;
}

function validar(dados: FormData):
  | { erros: ErrosTaxa }
  | { campos: { operadora: string; tipo: TipoCartao; parcelas: number; percentual: number } } {
  const erros: ErrosTaxa = {};

  const operadora = texto(dados, "operadora").slice(0, 60);
  const tipo = texto(dados, "tipo");
  const bp = lerPercentual(texto(dados, "percentual"));
  const parcelas = tipo === "debito" ? 1 : Number(texto(dados, "parcelas") || "1");

  if (operadora.length < 2) erros.operadora = "Informe a operadora ou maquininha.";
  if (tipo !== "debito" && tipo !== "credito") erros.tipo = "Débito ou crédito.";
  if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 24) {
    erros.parcelas = "Parcelas de 1 a 24.";
  }
  if (bp === null) erros.percentual = "Percentual inválido. Use 6 ou 6,5.";

  if (Object.keys(erros).length > 0) return { erros };

  return {
    campos: {
      operadora,
      tipo: tipo as TipoCartao,
      parcelas,
      percentual: bpParaBanco(bp!),
    },
  };
}

/** 23505 é o índice único: a mesma combinação já está ativa. */
function mensagemDoBanco(codigo: string | undefined, padrao: string): ErrosTaxa {
  if (codigo === "23505") {
    return { geral: "Já existe uma taxa ativa para esta operadora, tipo e parcelas." };
  }
  return { geral: padrao };
}

function revalidar() {
  revalidatePath("/financeiro/taxas");
  revalidatePath("/financeiro/vendas/nova");
}

export async function criarTaxa(
  _anterior: EstadoTaxa,
  dados: FormData,
): Promise<EstadoTaxa> {
  const barrada = await exigirAdministradora();
  if (barrada) return barrada;

  const resultado = validar(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: digitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("taxas_cartao").insert(resultado.campos);

  if (error) {
    return {
      erros: mensagemDoBanco(error.code, `Não foi possível salvar: ${error.message}`),
      valores: digitados(dados),
    };
  }

  revalidar();
  redirect("/financeiro/taxas");
}

export async function atualizarTaxa(
  _anterior: EstadoTaxa,
  dados: FormData,
): Promise<EstadoTaxa> {
  const barrada = await exigirAdministradora();
  if (barrada) return barrada;

  const id = texto(dados, "id");
  if (!UUID.test(id)) return { erros: { geral: "Taxa não identificada." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: digitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("taxas_cartao")
    .update(resultado.campos)
    .eq("id", id);

  if (error) {
    return {
      erros: mensagemDoBanco(error.code, `Não foi possível salvar: ${error.message}`),
      valores: digitados(dados),
    };
  }

  revalidar();
  redirect("/financeiro/taxas");
}

export async function alternarAtivaTaxa(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (!(await ehAdministradora())) return;

  const id = texto(dados, "id");
  const ativar = dados.get("ativar") === "sim";
  if (!UUID.test(id)) return;

  const supabase = await clienteServidor();
  await supabase.from("taxas_cartao").update({ ativa: ativar }).eq("id", id);

  revalidar();
}
