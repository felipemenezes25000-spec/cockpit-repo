"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";
import {
  normalizarAssinatura,
  normalizarCampos,
  normalizarModelo,
  uuidValido,
  validarAssinatura,
  validarCampos,
  validarModelo,
  type CampoDoModelo,
  type ErrosAssinatura,
  type ErrosModelo,
  type TipoDocumento,
  type ValoresModelo,
} from "@/lib/documento";
import { clienteServidor } from "@/lib/supabase/server";

export type EstadoModelo = {
  erros: ErrosModelo;
  valores?: Record<string, string>;
};

export type EstadoAssinatura = {
  erros: ErrosAssinatura;
  valores?: Record<string, string>;
};

export type EstadoDocumento = { erro: string | null };

function texto(dados: FormData, campo: string): string {
  return String(dados.get(campo) ?? "").trim();
}

function valoresDigitados(dados: FormData): Record<string, string> {
  return Object.fromEntries(
    [...dados.entries()].filter(([, valor]) => typeof valor === "string"),
  ) as Record<string, string>;
}

/**
 * Erro de banco vira frase em português (invariante §9).
 *
 * O caso `P0001` é o `raise exception` das funções da 0013 — "Modelo fora de
 * uso", "Só documento emitido pode ser assinado". Essas mensagens foram
 * escritas por nós, em português, para serem lidas por gente: repassá-las é o
 * contrário de vazar detalhe interno. Qualquer outro código vira frase
 * genérica, porque aí a mensagem é do Postgres, não nossa.
 */
function erroDoBanco(
  error: { code?: string; message?: string } | null | undefined,
  padrao: string,
): string {
  if (!error) return padrao;

  if (
    error.code === "PGRST202" ||
    error.code === "PGRST205" ||
    error.message?.includes("schema cache")
  ) {
    return "A migração de documentos ainda não foi aplicada no banco. Aplique a 0013 antes.";
  }

  if (error.code === "P0001" && error.message) return error.message;

  if (error.code === "42501") {
    return "Seu perfil não tem permissão para esta ação.";
  }
  if (error.code === "23503") return "Paciente ou modelo não encontrado.";
  if (error.code === "23505") return "Este documento já foi assinado.";
  if (error.code === "23514") return "O banco recusou os dados. Revise os campos.";

  return padrao;
}

async function exigirAcesso(): Promise<{ id: string; administradora: boolean } | string> {
  const usuario = await usuarioAtual();
  if (!usuario) return "Sessão expirada. Entre novamente.";
  return { id: usuario.id, administradora: usuario.papel === "administradora" };
}

// ---------------------------------------------------------------------
// Modelos — só a administradora
// ---------------------------------------------------------------------

/**
 * As perguntas chegam como JSON num campo escondido: elas são uma lista que o
 * editor monta no navegador, e `FormData` não tem forma para isso.
 *
 * JSON quebrado vira lista vazia em vez de exceção — e aí a validação recusa
 * com mensagem, que é o que a pessoa consegue entender.
 */
function lerCampos(dados: FormData): CampoDoModelo[] {
  try {
    const bruto = JSON.parse(String(dados.get("campos") ?? "[]"));
    if (!Array.isArray(bruto)) return [];
    return normalizarCampos(bruto as CampoDoModelo[]);
  } catch {
    return [];
  }
}

function lerModelo(dados: FormData): ValoresModelo {
  return normalizarModelo({
    tipo: texto(dados, "tipo"),
    nome: texto(dados, "nome"),
    descricao: texto(dados, "descricao"),
    // Sem `trim` global: o corpo é texto de contrato e a formatação importa.
    corpo: String(dados.get("corpo") ?? ""),
    motivo: texto(dados, "motivo"),
  });
}

export async function criarModelo(
  _anterior: EstadoModelo,
  dados: FormData,
): Promise<EstadoModelo> {
  const quem = await exigirAcesso();
  if (typeof quem === "string") return { erros: { geral: quem } };
  if (!quem.administradora) {
    return { erros: { geral: "Apenas a administradora gerencia modelos." } };
  }

  const valores = lerModelo(dados);
  const campos = lerCampos(dados);
  const erros = validarModelo(valores);

  const erroCampos = validarCampos(campos);
  if (erroCampos) erros.geral = erroCampos;
  if (valores.tipo === "anamnese" && campos.length === 0) {
    erros.geral = "Anamnese precisa de pelo menos uma pergunta.";
  }

  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("modelo_documento_criar", {
    p_tipo: valores.tipo as TipoDocumento,
    p_nome: valores.nome,
    p_descricao: valores.descricao,
    p_corpo: valores.corpo,
    p_campos: campos,
  });

  if (error || !data) {
    return {
      erros: { geral: erroDoBanco(error, "Não foi possível criar o modelo.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/formularios/modelos");
  revalidatePath("/formularios");
  redirect(`/formularios/modelos/${data}/editar`);
}

export async function salvarNovaVersaoModelo(
  _anterior: EstadoModelo,
  dados: FormData,
): Promise<EstadoModelo> {
  const quem = await exigirAcesso();
  if (typeof quem === "string") return { erros: { geral: quem } };
  if (!quem.administradora) {
    return { erros: { geral: "Apenas a administradora gerencia modelos." } };
  }

  const modeloId = texto(dados, "modelo_id").slice(0, 36);
  if (!uuidValido(modeloId)) {
    return { erros: { geral: "Modelo não identificado." } };
  }

  const valores = lerModelo(dados);
  const campos = lerCampos(dados);
  const erros = validarModelo(valores, { exigirMotivo: true });

  const erroCampos = validarCampos(campos);
  if (erroCampos) erros.geral = erroCampos;

  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("modelo_documento_nova_versao", {
    p_modelo_id: modeloId,
    p_nome: valores.nome,
    p_descricao: valores.descricao,
    p_corpo: valores.corpo,
    p_campos: campos,
    p_motivo: valores.motivo,
  });

  if (error) {
    return {
      erros: { geral: erroDoBanco(error, "Não foi possível salvar a nova versão.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/formularios/modelos");
  revalidatePath(`/formularios/modelos/${modeloId}/editar`);
  redirect(`/formularios/modelos/${modeloId}/editar`);
}

/**
 * Aposenta o modelo sem apagar. Ele some da tela de emissão e continua
 * explicando os documentos que já gerou.
 */
export async function alternarModeloAtivo(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/entrar");
  if (usuario.papel !== "administradora") return;

  const id = texto(dados, "id").slice(0, 36);
  if (!uuidValido(id)) return;

  const supabase = await clienteServidor();
  await supabase
    .from("modelos_documento")
    .update({ ativo: dados.get("ativar") === "sim" })
    .eq("id", id);

  revalidatePath("/formularios/modelos");
  revalidatePath("/formularios/novo");
}

// ---------------------------------------------------------------------
// Documentos — trabalho de balcão
// ---------------------------------------------------------------------

export async function emitirDocumento(
  _anterior: EstadoModelo,
  dados: FormData,
): Promise<EstadoModelo> {
  const quem = await exigirAcesso();
  if (typeof quem === "string") return { erros: { geral: quem } };

  const pacienteId = texto(dados, "paciente_id").slice(0, 36);
  const modeloId = texto(dados, "modelo_id").slice(0, 36);
  const anteriorId = texto(dados, "documento_anterior_id").slice(0, 36);

  const erros: ErrosModelo = {};
  if (!uuidValido(pacienteId)) erros.geral = "Escolha a paciente.";
  if (!uuidValido(modeloId)) erros.tipo = "Escolha o modelo do documento.";
  if (anteriorId && !uuidValido(anteriorId)) {
    erros.geral = "Documento anterior inválido.";
  }

  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_emitir", {
    p_paciente_id: pacienteId,
    p_modelo_id: modeloId,
    p_titulo: texto(dados, "titulo").slice(0, 160),
    // O gerador de tipos do Supabase declara todo parâmetro como obrigatório:
    // sem DEFAULT no SQL, ele não sabe que este aceita nulo. A função trata o
    // nulo de propósito — documento que não corrige nenhum outro. Mesmo
    // contorno já usado em `acoes/vendas.ts` e `acoes/prontuarios.ts`.
    p_documento_anterior_id: (anteriorId || null) as unknown as string,
  });

  if (error || !data) {
    return {
      erros: { geral: erroDoBanco(error, "Não foi possível emitir o documento.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/formularios");
  revalidatePath(`/pacientes/${pacienteId}`);
  revalidatePath("/");
  redirect(`/formularios/${data}`);
}

/**
 * Colhe a assinatura no balcão.
 *
 * O IP e o dispositivo vêm dos cabeçalhos da requisição, não do formulário:
 * são evidência, e evidência que o próprio assinante pudesse digitar não
 * serviria de evidência. Quando o ambiente não informa, ficam nulos — a
 * função do banco trata isso, porque não saber o IP não invalida o que foi
 * acordado presencialmente.
 */
export async function assinarDocumento(
  _anterior: EstadoAssinatura,
  dados: FormData,
): Promise<EstadoAssinatura> {
  const quem = await exigirAcesso();
  if (typeof quem === "string") return { erros: { geral: quem } };

  const documentoId = texto(dados, "documento_id").slice(0, 36);
  if (!uuidValido(documentoId)) {
    return { erros: { geral: "Documento não identificado." } };
  }

  if (dados.get("confirmacao") !== "sim") {
    return {
      erros: {
        confirmacao: "Confirme que a paciente leu o documento e concordou.",
      },
      valores: valoresDigitados(dados),
    };
  }

  const valores = normalizarAssinatura({
    nome: texto(dados, "nome"),
    cpf: texto(dados, "cpf"),
    verificacao: texto(dados, "verificacao"),
  });

  const erros = validarAssinatura(valores);
  if (Object.keys(erros).length > 0) {
    return { erros, valores: valoresDigitados(dados) };
  }

  const cabecalhos = await headers();
  // `x-forwarded-for` é uma lista; o primeiro é o cliente. Em rede local ou
  // sem proxy o cabeçalho não existe, e aí não há IP para registrar.
  const encaminhado = cabecalhos.get("x-forwarded-for") ?? "";
  const ip = encaminhado.split(",")[0]?.trim() ?? "";

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("documento_assinar", {
    p_documento_id: documentoId,
    p_nome: valores.nome,
    p_cpf: valores.cpf,
    p_verificacao: valores.verificacao,
    p_ip: ip,
    p_dispositivo: (cabecalhos.get("user-agent") ?? "").slice(0, 400),
  });

  if (error) {
    return {
      erros: { geral: erroDoBanco(error, "Não foi possível registrar a assinatura.") },
      valores: valoresDigitados(dados),
    };
  }

  revalidatePath("/formularios");
  revalidatePath(`/formularios/${documentoId}`);
  revalidatePath("/");
  return { erros: {} };
}

/**
 * Cancela um documento emitido por engano. Não apaga: a linha fica, com o
 * motivo, porque quem apaga esconde. Documento assinado não cancela — para
 * corrigir, emite-se outro apontando para ele.
 */
export async function cancelarDocumento(
  _anterior: EstadoDocumento,
  dados: FormData,
): Promise<EstadoDocumento> {
  const quem = await exigirAcesso();
  if (typeof quem === "string") return { erro: quem };

  const id = texto(dados, "id").slice(0, 36);
  if (!uuidValido(id)) return { erro: "Documento não identificado." };

  const motivo = texto(dados, "motivo").replace(/\s+/g, " ").slice(0, 400);
  if (motivo.length < 5) {
    return { erro: "Descreva o motivo do cancelamento." };
  }

  const supabase = await clienteServidor();

  // A checagem de situação também existe no gatilho do banco. Aqui ela serve
  // para responder em português, em vez de deixar a exceção subir.
  const { data: documento, error: erroBusca } = await supabase
    .from("documentos")
    .select("situacao")
    .eq("id", id)
    .maybeSingle();

  if (erroBusca) {
    return { erro: erroDoBanco(erroBusca, "Não foi possível ler o documento.") };
  }
  if (!documento) return { erro: "Documento não encontrado." };

  if (documento.situacao === "assinado") {
    return {
      erro: "Documento assinado não se cancela. Emita um novo corrigindo este.",
    };
  }
  if (documento.situacao === "cancelado") {
    return { erro: "Este documento já está cancelado." };
  }

  const { error } = await supabase
    .from("documentos")
    .update({ situacao: "cancelado", motivo_cancelamento: motivo })
    .eq("id", id);

  if (error) {
    return { erro: erroDoBanco(error, "Não foi possível cancelar o documento.") };
  }

  revalidatePath("/formularios");
  revalidatePath(`/formularios/${id}`);
  return { erro: null };
}

// ---------------------------------------------------------------------
// Anamnese
// ---------------------------------------------------------------------

export type ResultadoDasRespostas = { ok: boolean; erro: string | null };

/**
 * Grava as respostas preenchidas na consulta.
 *
 * Anamnese não tem passo de confirmação e a resposta pode ser corrigida
 * quando for preciso — é conteúdo que evolui, ao contrário do contrato. Quem
 * guarda o histórico de cada mudança é o gatilho de auditoria de
 * `documento_campos`, não uma trava.
 */
export async function responderAnamnese(entrada: {
  documentoId: string;
  respostas: Record<string, string | string[] | null>;
}): Promise<ResultadoDasRespostas> {
  const quem = await exigirAcesso();
  if (typeof quem === "string") return { ok: false, erro: quem };
  if (!quem.administradora) {
    return { ok: false, erro: "Apenas a administradora preenche anamnese." };
  }

  const documentoId = String(entrada.documentoId ?? "").slice(0, 36);
  if (!uuidValido(documentoId)) {
    return { ok: false, erro: "Documento não identificado." };
  }

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("documento_campos_responder", {
    p_documento_id: documentoId,
    p_respostas: entrada.respostas,
  });

  if (error) {
    return {
      ok: false,
      erro: erroDoBanco(error, "Não foi possível salvar as respostas."),
    };
  }

  revalidatePath(`/formularios/${documentoId}`);
  return { ok: true, erro: null };
}
