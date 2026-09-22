"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { usuarioAtual } from "@/lib/auth";
import { dataValida } from "@/lib/prontuario";
import {
  normalizarAssinatura,
  uuidValido,
  validarAssinatura,
  type CampoRespondido,
  type ErrosAssinatura,
  type TipoCampo,
} from "@/lib/documento";
import { clienteServidor } from "@/lib/supabase/server";

/**
 * Assinatura à distância: criar o link, abrir o documento, assinar.
 *
 * Estas três últimas rodam para quem NÃO tem sessão. É a única parte do
 * sistema assim, e o que a sustenta não é este arquivo — são as funções da
 * migração 0014, que `anon` pode executar e que conferem token, validade,
 * data de nascimento e situação a cada chamada. Aqui não há checagem que o
 * banco não repita.
 */

// ---------------------------------------------------------------------
// Equipe: gerar e revogar o link
// ---------------------------------------------------------------------

export type ResultadoDoLink =
  | { ok: true; endereco: string }
  | { ok: false; erro: string };

/**
 * 32 bytes de aleatoriedade criptográfica, em base64url: 43 caracteres,
 * 256 bits. Inadivinhável por força bruta, e é isso que precisa ser — o
 * token é a chave da porta.
 *
 * O banco guarda só o SHA-256 dele. Este valor em claro existe uma vez, no
 * retorno desta função, e vira link. Perdeu-se, gera-se outro.
 */
function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Endereço absoluto, montado a partir do host da requisição.
 *
 * Sem variável de ambiente de propósito: em desenvolvimento é localhost, em
 * produção é o domínio da Vercel, e o cabeçalho já sabe disso sem ninguém
 * precisar manter uma configuração sincronizada.
 */
async function origemDaRequisicao(): Promise<string> {
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "localhost:3000";
  const protocolo =
    cabecalhos.get("x-forwarded-proto") ??
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");

  return `${protocolo}://${host}`;
}

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
    return "A migração da assinatura por link ainda não foi aplicada. Aplique a 0014 antes.";
  }

  // `P0001` é o `raise exception` das funções da 0014 — frases escritas por
  // nós, em português, para serem lidas. Ver a nota em `acoes/documentos.ts`.
  if (error.code === "P0001" && error.message) return error.message;
  if (error.code === "42501") return "Seu perfil não tem permissão para esta ação.";

  return padrao;
}

export type ResultadoDaCriacao =
  | { ok: true; endereco: string; linkId: string }
  | { ok: false; erro: string };

export async function criarLinkAssinatura(entrada: {
  documentoId: string;
  dias: number;
}): Promise<ResultadoDaCriacao> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const documentoId = String(entrada.documentoId ?? "").slice(0, 36);
  if (!uuidValido(documentoId)) {
    return { ok: false, erro: "Documento não identificado." };
  }

  const dias = Math.min(90, Math.max(1, Math.trunc(Number(entrada.dias) || 15)));
  const token = gerarToken();

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_link_criar", {
    p_documento_id: documentoId,
    p_token: token,
    p_dias: dias,
    // Vazio na criação: quem diz por onde foi é o clique no envio.
    p_canal: "",
  });

  if (error || !data) {
    return {
      ok: false,
      erro: erroDoBanco(error, "Não foi possível gerar o link."),
    };
  }

  revalidatePath(`/formularios/${documentoId}`);

  return {
    ok: true,
    endereco: `${await origemDaRequisicao()}/assinar/${token}`,
    linkId: data,
  };
}

/**
 * Grava por onde o link foi enviado, no momento em que o envio começa.
 *
 * Não é validação de nada — é o registro de um ato, e por isso acontece no
 * clique do botão de envio, não na criação do link. Falhar aqui não pode
 * atrapalhar o envio: a conversa do WhatsApp já abriu, e perder o rótulo do
 * canal é menos ruim do que travar a tela por causa dele.
 */
export async function registrarCanalDoLink(entrada: {
  linkId: string;
  documentoId: string;
  canal: string;
}): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) return;
  if (!uuidValido(entrada.linkId)) return;

  const supabase = await clienteServidor();
  await supabase
    .from("documento_links")
    .update({ canal_envio: String(entrada.canal ?? "").trim().slice(0, 160) })
    .eq("id", entrada.linkId);

  if (uuidValido(entrada.documentoId)) {
    revalidatePath(`/formularios/${entrada.documentoId}`);
  }
}

export async function revogarLinkAssinatura(dados: FormData): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) return;

  const linkId = String(dados.get("link_id") ?? "").slice(0, 36);
  const documentoId = String(dados.get("documento_id") ?? "").slice(0, 36);
  if (!uuidValido(linkId)) return;

  const supabase = await clienteServidor();
  await supabase.rpc("documento_link_revogar", { p_link_id: linkId });

  if (uuidValido(documentoId)) revalidatePath(`/formularios/${documentoId}`);
}

// ---------------------------------------------------------------------
// Paciente: abrir e assinar, sem sessão
// ---------------------------------------------------------------------

export type DocumentoParaAssinar = {
  situacao: string;
  titulo: string | null;
  corpo: string | null;
  paciente: string | null;
  tipo: string | null;
  emitidoEm: string | null;
  hash: string | null;
  /** Preenchidos quando `situacao` é `ja_assinado` — é a via da paciente. */
  assinadoEm: string | null;
  assinadoPor: string | null;
  /** As perguntas da anamnese, com o que já foi respondido. Vazio nos demais. */
  campos: CampoRespondido[];
};

/**
 * Fronteira do `jsonb`: depois daqui o resto trabalha com tipo do domínio.
 * Pergunta malformada é descartada em vez de derrubar a página — a paciente
 * não tem como consertar isso, e responder as outras ainda vale.
 */
function camposRespondidos(valor: unknown): CampoRespondido[] {
  if (!Array.isArray(valor)) return [];

  return valor.flatMap((bruto) => {
    if (!bruto || typeof bruto !== "object") return [];
    const campo = bruto as Record<string, unknown>;
    if (typeof campo.chave !== "string" || typeof campo.rotulo !== "string") return [];

    const textos = (item: unknown): string[] =>
      Array.isArray(item) ? item.filter((v): v is string => typeof v === "string") : [];

    return [
      {
        chave: campo.chave,
        rotulo: campo.rotulo,
        tipo: String(campo.tipo ?? "texto") as TipoCampo,
        obrigatorio: campo.obrigatorio === true,
        ajuda: typeof campo.ajuda === "string" ? campo.ajuda : "",
        opcoes: textos(campo.opcoes),
        resposta: typeof campo.resposta === "string" ? campo.resposta : null,
        respostas: Array.isArray(campo.respostas) ? textos(campo.respostas) : null,
      },
    ];
  });
}

/**
 * Abre o documento mediante data de nascimento.
 *
 * Não devolve mensagem pronta: devolve a situação, e quem a traduz é a tela.
 * A função do banco conta as tentativas erradas e fecha o link na décima —
 * por isso ela responde com situação em vez de levantar exceção, e por isso
 * aqui também não se transforma erro em exceção.
 */
export async function abrirDocumentoParaAssinatura(
  token: string,
  nascimento: string,
): Promise<DocumentoParaAssinar> {
  const vazio: DocumentoParaAssinar = {
    situacao: "nao_encontrado",
    titulo: null,
    corpo: null,
    paciente: null,
    tipo: null,
    emitidoEm: null,
    hash: null,
    assinadoEm: null,
    assinadoPor: null,
    campos: [],
  };

  if (!token || !dataValida(nascimento)) return { ...vazio, situacao: "data_incorreta" };

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_para_assinatura", {
    p_token: token,
    p_nascimento: nascimento,
  });

  const linha = Array.isArray(data) ? data[0] : null;
  if (error || !linha) return vazio;

  return {
    situacao: linha.situacao ?? "nao_encontrado",
    titulo: linha.titulo,
    corpo: linha.corpo,
    paciente: linha.paciente,
    tipo: linha.tipo,
    emitidoEm: linha.emitido_em,
    hash: linha.hash,
    assinadoEm: linha.assinado_em,
    assinadoPor: linha.assinado_por,
    campos: camposRespondidos(linha.campos),
  };
}

export type EstadoAssinaturaLink = {
  situacao: string | null;
  erros: ErrosAssinatura;
};

export async function assinarPorLink(entrada: {
  token: string;
  nascimento: string;
  nome: string;
  cpf: string;
  confirmou: boolean;
}): Promise<EstadoAssinaturaLink> {
  if (!entrada.confirmou) {
    return {
      situacao: null,
      erros: { confirmacao: "Confirme que leu o documento e concorda." },
    };
  }

  const valores = normalizarAssinatura({
    nome: entrada.nome,
    cpf: entrada.cpf,
    // A conferência de identidade aqui não é digitada por ninguém: quem a
    // descreve é a função do banco, a partir do canal de envio do link.
    verificacao: "assinatura a distancia",
  });

  const erros = validarAssinatura(valores);
  delete erros.verificacao;
  if (Object.keys(erros).length > 0) return { situacao: null, erros };

  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for") ?? "";

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_assinar_por_link", {
    p_token: entrada.token,
    p_nascimento: entrada.nascimento,
    p_nome: valores.nome,
    p_cpf: valores.cpf,
    p_ip: encaminhado.split(",")[0]?.trim() ?? "",
    p_dispositivo: (cabecalhos.get("user-agent") ?? "").slice(0, 400),
  });

  if (error) {
    return {
      situacao: null,
      erros: { geral: erroDoBanco(error, "Não foi possível registrar a assinatura.") },
    };
  }

  return { situacao: String(data ?? "nao_encontrado"), erros: {} };
}

/**
 * A paciente respondendo a anamnese pelo link.
 *
 * Não devolve mensagem pronta: devolve a situação, e quem a traduz é a tela —
 * mesma razão das outras funções desta porta. A validação que vale é a do
 * banco, que confere token, validade, data de nascimento, tipo do documento e
 * cada alternativa marcada.
 */
export async function responderPorLink(entrada: {
  token: string;
  nascimento: string;
  respostas: Record<string, string | string[] | null>;
}): Promise<string> {
  if (!entrada.token || !dataValida(entrada.nascimento)) return "data_incorreta";

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_responder_por_link", {
    p_token: entrada.token,
    p_nascimento: entrada.nascimento,
    p_respostas: entrada.respostas,
  });

  if (error) return "falhou";
  return String(data ?? "nao_encontrado");
}
