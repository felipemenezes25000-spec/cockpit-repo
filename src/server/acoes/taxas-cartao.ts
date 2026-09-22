"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { ehAdministradora, usuarioAtual } from "@/lib/auth";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { bpParaBanco, lerPercentual } from "@/lib/moeda";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import type { TipoCartao } from "@/lib/venda";

/**
 * Tabela padrão de taxas de cartão. Só a administradora mexe — na
 * aplicação e na RLS.
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

const TAXA_REPETIDA = "Já existe uma taxa ativa para esta operadora, tipo e parcelas.";

async function exigirAdministradora(): Promise<string | null> {
  const usuario = await usuarioAtual();
  if (!usuario) return "Sessão expirada. Entre novamente.";
  if (!(await ehAdministradora())) return "Só a administradora configura a tabela de taxas.";
  return null;
}

function validar(dados: FormData):
  | { erros: ErrosTaxa }
  | { campos: { operadora: string; tipo: TipoCartao; parcelas: number; percentual: number } } {
  const erros: ErrosTaxa = {};

  const operadora = campoTexto(dados, "operadora", 60);
  const tipo = campoTexto(dados, "tipo", 10);
  const bp = lerPercentual(campoTexto(dados, "percentual", 10));
  const parcelas = tipo === "debito" ? 1 : Number(campoTexto(dados, "parcelas", 3) || "1");

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

function revalidar() {
  revalidatePath("/financeiro/taxas");
  revalidatePath("/financeiro/vendas/nova");
}

export async function criarTaxa(
  _anterior: EstadoTaxa,
  dados: FormData,
): Promise<EstadoTaxa> {
  const barrada = await exigirAdministradora();
  if (barrada) return { erros: { geral: barrada } };

  const resultado = validar(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: valoresDigitados(dados) };

  const supabase = await clienteServidor();
  const { error } = await supabase.from("taxas_cartao").insert(resultado.campos);

  if (error) {
    if (error.code !== "23505") registrarFalha("taxas: criar", error);
    return {
      erros: {
        geral: mensagemDoBanco(error, "Não foi possível salvar a taxa. Tente de novo.", {
          "23505": TAXA_REPETIDA,
        }),
      },
      valores: valoresDigitados(dados),
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
  if (barrada) return { erros: { geral: barrada } };

  const id = campoTexto(dados, "id", 36);
  if (!uuidValido(id)) return { erros: { geral: "Taxa não identificada." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return { erros: resultado.erros, valores: valoresDigitados(dados) };

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("taxas_cartao")
    .update(resultado.campos)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code !== "23505") registrarFalha("taxas: atualizar", error);
    return {
      erros: {
        geral: mensagemDoBanco(error, "Não foi possível salvar a taxa. Tente de novo.", {
          "23505": TAXA_REPETIDA,
        }),
      },
      valores: valoresDigitados(dados),
    };
  }
  if (!data) return { erros: { geral: "Taxa não encontrada." }, valores: valoresDigitados(dados) };

  revalidar();
  redirect("/financeiro/taxas");
}

/**
 * Ativa ou desativa. Reativar pode esbarrar no índice único — outra linha
 * ativa para a mesma combinação —, e isso agora aparece na tela: era a falha
 * silenciosa citada no AGENTS.md §13 (bug 2).
 */
export async function alternarAtivaTaxa(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const barrada = await exigirAdministradora();
  if (barrada) return falha(barrada);

  const id = campoTexto(dados, "id", 36);
  const ativar = dados.get("ativar") === "sim";
  if (!uuidValido(id)) return falha("Taxa não identificada.");

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("taxas_cartao")
    .update({ ativa: ativar })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code !== "23505") registrarFalha("taxas: ativar/desativar", error);
    return falha(
      mensagemDoBanco(error, "Não foi possível alterar a taxa. Tente de novo.", {
        "23505": "Já existe outra taxa ativa para esta operadora, tipo e parcelas. Desative-a antes.",
      }),
    );
  }
  if (!data) return falha("Taxa não encontrada.");

  revalidar();
  return sucesso(ativar ? "Taxa reativada." : "Taxa desativada.");
}
