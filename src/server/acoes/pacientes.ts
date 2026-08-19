"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";
import {
  normalizarPaciente,
  paraOBanco,
  validarPaciente,
  type CamposDoBanco,
  type ErrosPaciente,
} from "@/lib/paciente";

/**
 * Cadastro e edição de paciente.
 *
 * A validação aqui é a que vale. O formulário valida antes só para responder
 * rápido — quem envia o formulário por fora não passa por ele.
 *
 * As regras em si moram em `lib/paciente.ts`, junto das da importação em massa:
 * uma regra escrita duas vezes vira duas regras diferentes na terceira mudança.
 *
 * A RLS já barra quem não tem acesso; a checagem de sessão no começo existe
 * para devolver mensagem em vez de um erro cru do banco.
 */

export type ErrosDoFormulario = ErrosPaciente;

export type EstadoPaciente = {
  erros: ErrosDoFormulario;
  /** O que a pessoa digitou, para o formulário não esvaziar no erro. */
  valores?: Record<string, string>;
};

// Um arquivo "use server" só pode exportar função assíncrona — por isso o
// estado inicial fica no formulário, como em `app/entrar/actions.ts`.

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

/** Valida e normaliza. Devolve os erros ou os campos prontos para o banco. */
function validar(
  dados: FormData,
):
  | { erros: ErrosDoFormulario; valores: Record<string, string> }
  | { campos: CamposDoBanco } {
  const valores = normalizarPaciente({
    nome: texto(dados, "nome"),
    nome_social: texto(dados, "nome_social"),
    cpf: texto(dados, "cpf"),
    data_nascimento: texto(dados, "data_nascimento"),
    telefone: texto(dados, "telefone"),
    email: texto(dados, "email"),
    origem: texto(dados, "origem"),
    observacoes: texto(dados, "observacoes"),
    cep: texto(dados, "cep"),
    logradouro: texto(dados, "logradouro"),
    numero: texto(dados, "numero"),
    complemento: texto(dados, "complemento"),
    bairro: texto(dados, "bairro"),
    cidade: texto(dados, "cidade"),
    uf: texto(dados, "uf"),
  });

  const erros = validarPaciente(valores);

  if (Object.keys(erros).length > 0) {
    // Devolve o que veio para o formulário reaparecer preenchido.
    const digitados: Record<string, string> = {};
    for (const [chave, valor] of dados.entries()) {
      if (typeof valor === "string") digitados[chave] = valor;
    }
    return { erros, valores: digitados };
  }

  return { campos: paraOBanco(valores) };
}

/** 23505 é a violação do índice único de CPF. */
function mensagemDoBanco(codigo: string | undefined, padrao: string): ErrosDoFormulario {
  if (codigo === "23505") {
    return { cpf: "Já existe uma paciente cadastrada com este CPF." };
  }
  return { geral: padrao };
}

export async function cadastrarPaciente(
  _anterior: EstadoPaciente,
  dados: FormData,
): Promise<EstadoPaciente> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return resultado;

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("pacientes")
    .insert({ ...resultado.campos, criado_por: usuario.id })
    .select("id")
    .single();

  if (error || !data) {
    return {
      erros: mensagemDoBanco(
        error?.code,
        "Não foi possível salvar o cadastro. Tente de novo.",
      ),
      valores: Object.fromEntries(
        [...dados.entries()].filter(([, v]) => typeof v === "string"),
      ) as Record<string, string>,
    };
  }

  revalidatePath("/pacientes");
  revalidatePath("/");
  redirect(`/pacientes/${data.id}`);
}

export async function atualizarPaciente(
  _anterior: EstadoPaciente,
  dados: FormData,
): Promise<EstadoPaciente> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = texto(dados, "id").slice(0, 36);
  if (!id) return { erros: { geral: "Paciente não identificada." } };

  const resultado = validar(dados);
  if ("erros" in resultado) return resultado;

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("pacientes")
    .update(resultado.campos)
    .eq("id", id);

  if (error) {
    return {
      erros: mensagemDoBanco(
        error.code,
        "Não foi possível salvar as alterações. Tente de novo.",
      ),
      valores: Object.fromEntries(
        [...dados.entries()].filter(([, v]) => typeof v === "string"),
      ) as Record<string, string>,
    };
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/");
  redirect(`/pacientes/${id}`);
}

/**
 * Arquiva ou reativa.
 *
 * Não existe apagar: a paciente tem atendimento, recebimento e — mais adiante —
 * documento assinado apontando para ela. O banco recusaria a exclusão
 * (`on delete restrict`), e apagar histórico clínico não é o que a clínica
 * quer. Arquivar tira da lista e preserva tudo.
 */
export async function alternarArquivamento(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");

  const id = texto(dados, "id").slice(0, 36);
  const arquivar = dados.get("arquivar") === "sim";
  if (!id) return;

  const supabase = await clienteServidor();
  await supabase.from("pacientes").update({ ativo: !arquivar }).eq("id", id);

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/");
}
