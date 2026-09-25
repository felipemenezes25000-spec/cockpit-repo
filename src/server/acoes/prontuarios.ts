"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { avisarNaProximaTela } from "@/server/aviso";
import { usuarioAtual } from "@/lib/auth";
import { mensagemDoBanco, type ErroDoBanco } from "@/lib/erros-banco";
import { registrarFalha } from "@/lib/registro";
import {
  normalizarProntuario,
  validarProntuario,
  uuidValido,
  type ErrosProntuario,
  type ValoresProntuario,
} from "@/lib/prontuario";
import { clienteServidor } from "@/lib/supabase/server";

export type ErrosDoProntuario = ErrosProntuario;

export type EstadoProntuario = {
  erros: ErrosDoProntuario;
  valores?: Record<string, string>;
};

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

function valoresDigitados(dados: FormData): Record<string, string> {
  return Object.fromEntries(
    [...dados.entries()].filter(([, valor]) => typeof valor === "string"),
  ) as Record<string, string>;
}

function lerValores(dados: FormData): ValoresProntuario {
  return normalizarProntuario({
    paciente_id: texto(dados, "paciente_id"),
    atendimento_id: texto(dados, "atendimento_id"),
    data_registro: texto(dados, "data_registro"),
    titulo: texto(dados, "titulo"),
    motivo: texto(dados, "motivo"),
    queixa: texto(dados, "queixa"),
    avaliacao: texto(dados, "avaliacao"),
    conduta: texto(dados, "conduta"),
    evolucao: texto(dados, "evolucao"),
    orientacoes: texto(dados, "orientacoes"),
    observacoes: texto(dados, "observacoes"),
  });
}

function erroDoBanco(error: ErroDoBanco, padrao: string, contexto: string): ErrosDoProntuario {
  if (error) registrarFalha(contexto, error);
  return {
    geral: mensagemDoBanco(error, padrao, {
      "23503": "Paciente ou atendimento não encontrado.",
      "23514": "Revise os campos do prontuário antes de salvar.",
    }),
  };
}

export async function criarProntuario(
  _anterior: EstadoProntuario,
  dados: FormData,
): Promise<EstadoProntuario> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };
  if (usuario.papel !== "administradora") {
    return {
      erros: {
        geral: "Apenas a administradora pode registrar prontuário clínico.",
      },
    };
  }

  const valores = lerValores(dados);
  const erros = validarProntuario(valores);
  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("prontuario_registrar", {
    p_paciente_id: valores.paciente_id,
    // O gerador de tipos do Supabase declara todo parâmetro de função como
    // obrigatório: sem DEFAULT no SQL, ele não sabe que este aceita nulo. A
    // função trata o nulo de propósito — prontuário sem atendimento vinculado.
    // Mesmo contorno já usado em `acoes/vendas.ts`.
    p_atendimento_id: (valores.atendimento_id || null) as unknown as string,
    p_data_registro: valores.data_registro,
    p_titulo: valores.titulo,
    p_queixa: valores.queixa,
    p_avaliacao: valores.avaliacao,
    p_conduta: valores.conduta,
    p_evolucao: valores.evolucao,
    p_orientacoes: valores.orientacoes,
    p_observacoes: valores.observacoes,
  });

  if (error || !data) {
    return {
      erros: erroDoBanco(error, "Não foi possível salvar o prontuário. Tente de novo.", "prontuários: registrar"),
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/prontuarios");
  revalidatePath(`/pacientes/${valores.paciente_id}`);
  revalidatePath("/");
  await avisarNaProximaTela("prontuario-registrado");
  redirect(`/prontuarios/${data}`);
}

export async function registrarNovaVersao(
  _anterior: EstadoProntuario,
  dados: FormData,
): Promise<EstadoProntuario> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erros: { geral: "Sessão expirada. Entre novamente." } };
  if (usuario.papel !== "administradora") {
    return {
      erros: {
        geral: "Apenas a administradora pode alterar prontuário clínico.",
      },
    };
  }

  const prontuarioId = texto(dados, "prontuario_id").slice(0, 36);
  if (!uuidValido(prontuarioId)) {
    return {
      erros: { prontuario_id: "Prontuário não identificado." },
      valores: valoresDigitados(dados),
    };
  }

  const valores = lerValores(dados);
  const erros = validarProntuario(valores, { exigirMotivo: true });
  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("prontuario_nova_versao", {
    p_prontuario_id: prontuarioId,
    // O gerador de tipos do Supabase declara todo parâmetro de função como
    // obrigatório: sem DEFAULT no SQL, ele não sabe que este aceita nulo. A
    // função trata o nulo de propósito — prontuário sem atendimento vinculado.
    // Mesmo contorno já usado em `acoes/vendas.ts`.
    p_atendimento_id: (valores.atendimento_id || null) as unknown as string,
    p_data_registro: valores.data_registro,
    p_titulo: valores.titulo,
    p_motivo: valores.motivo,
    p_queixa: valores.queixa,
    p_avaliacao: valores.avaliacao,
    p_conduta: valores.conduta,
    p_evolucao: valores.evolucao,
    p_orientacoes: valores.orientacoes,
    p_observacoes: valores.observacoes,
  });

  if (error) {
    return {
      erros: erroDoBanco(error, "Não foi possível salvar a nova versão. Tente de novo.", "prontuários: nova versão"),
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/prontuarios");
  revalidatePath(`/prontuarios/${prontuarioId}`);
  revalidatePath(`/pacientes/${valores.paciente_id}`);
  revalidatePath("/");
  await avisarNaProximaTela("prontuario-nova-versao");
  redirect(`/prontuarios/${prontuarioId}`);
}
