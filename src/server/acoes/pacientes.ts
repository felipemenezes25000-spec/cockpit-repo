"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisarNaProximaTela } from "@/server/aviso";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { usuarioAtual } from "@/lib/auth";
import { mensagemDoBanco } from "@/lib/erros-banco";
import { campoTexto, uuidValido, valoresDigitados } from "@/lib/formulario";
import { registrarFalha } from "@/lib/registro";
import { clienteServidor } from "@/lib/supabase/server";
import {
  lerEndereco,
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

/** Valida e normaliza. Devolve os erros ou os campos prontos para o banco. */
function validar(
  dados: FormData,
  cepGravado?: string | null,
):
  | { erros: ErrosDoFormulario; valores: Record<string, string> }
  | { campos: CamposDoBanco } {
  const valores = normalizarPaciente({
    nome: campoTexto(dados, "nome"),
    nome_social: campoTexto(dados, "nome_social"),
    cpf: campoTexto(dados, "cpf"),
    data_nascimento: campoTexto(dados, "data_nascimento"),
    telefone: campoTexto(dados, "telefone"),
    email: campoTexto(dados, "email"),
    origem: campoTexto(dados, "origem"),
    observacoes: campoTexto(dados, "observacoes"),
    cep: campoTexto(dados, "cep"),
    logradouro: campoTexto(dados, "logradouro"),
    numero: campoTexto(dados, "numero"),
    complemento: campoTexto(dados, "complemento"),
    bairro: campoTexto(dados, "bairro"),
    cidade: campoTexto(dados, "cidade"),
    uf: campoTexto(dados, "uf"),
  });

  const erros = validarPaciente(valores, { cepGravado });

  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  return { campos: paraOBanco(valores) };
}

/** O índice único de CPF (`pacientes_cpf_unico`) é o único 23505 da tabela. */
function errosDoBanco(
  erro: Parameters<typeof mensagemDoBanco>[0],
  padrao: string,
): ErrosDoFormulario {
  if (erro?.code === "23505") {
    return { cpf: "Já existe uma paciente cadastrada com este CPF." };
  }
  return { geral: mensagemDoBanco(erro, padrao) };
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
    if (error && error.code !== "23505") registrarFalha("pacientes: cadastrar", error);
    return {
      erros: errosDoBanco(error, "Não foi possível salvar o cadastro. Tente de novo."),
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/pacientes");
  revalidatePath("/");
  await avisarNaProximaTela("paciente-cadastrada");
  redirect(`/pacientes/${data.id}`);
}

export async function atualizarPaciente(
  _anterior: EstadoPaciente,
  dados: FormData,
): Promise<EstadoPaciente> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };

  const id = campoTexto(dados, "id", 36);
  if (!uuidValido(id)) return { erros: { geral: "Paciente não identificada." } };

  const supabase = await clienteServidor();

  // CEP incompleto gravado antes da regra dos 8 dígitos não trava a edição
  // dos outros campos — ver `validarPaciente`.
  // Leitura que falha não pode virar "CEP inválido": a ficha seria recusada
  // por um defeito nos dados que não existe.
  const { data: atual, error: erroLeitura } = await supabase
    .from("pacientes")
    .select("endereco")
    .eq("id", id)
    .maybeSingle();

  if (erroLeitura) {
    registrarFalha("pacientes: ler ficha para editar", erroLeitura);
    return {
      erros: { geral: mensagemDoBanco(erroLeitura, "Não foi possível salvar. Tente de novo.") },
      valores: valoresDigitados(dados),
    };
  }

  const resultado = validar(dados, atual ? lerEndereco(atual.endereco).cep : null);
  if ("erros" in resultado) return resultado;

  const { data, error } = await supabase
    .from("pacientes")
    .update(resultado.campos)
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code !== "23505") registrarFalha("pacientes: atualizar", error);
    return {
      erros: errosDoBanco(error, "Não foi possível salvar as alterações. Tente de novo."),
      valores: valoresDigitados(dados),
    };
  }

  // Ficha inexistente e ficha sem permissão dão a mesma resposta (§8.1).
  if (!data) {
    return { erros: { geral: "Paciente não encontrada." }, valores: valoresDigitados(dados) };
  }

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/");
  await avisarNaProximaTela("paciente-atualizada");
  redirect(`/pacientes/${id}`);
}

/**
 * Arquiva ou reativa.
 *
 * Não existe apagar: a paciente tem atendimento, recebimento e documento
 * assinado apontando para ela, e a 0019 tirou o DELETE do banco. Arquivar tira
 * da lista e preserva tudo.
 */
export async function alternarArquivamento(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre novamente.");

  const id = campoTexto(dados, "id", 36);
  const arquivar = dados.get("arquivar") === "sim";
  if (!uuidValido(id)) return falha("Paciente não identificada.");

  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("pacientes")
    .update({ ativo: !arquivar })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    registrarFalha("pacientes: arquivar", error);
    return falha(mensagemDoBanco(error, "Não foi possível alterar o cadastro. Tente de novo."));
  }
  if (!data) return falha("Paciente não encontrada.");

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${id}`);
  revalidatePath("/relacionamento");
  revalidatePath("/");
  return sucesso(arquivar ? "Paciente arquivada." : "Paciente reativada.");
}
