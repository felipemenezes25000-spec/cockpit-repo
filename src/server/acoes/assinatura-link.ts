"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { evidenciaDaRequisicao } from "@/lib/assinatura/evidencia";
import { rubricaValida } from "@/lib/assinatura/rubrica";
import { usuarioAtual } from "@/lib/auth";
import { dataValida } from "@/lib/dates";
import { mensagemDoBanco, type ErroDoBanco } from "@/lib/erros-banco";
import { CLINICA } from "@/lib/nav";
import { registrarFalha } from "@/lib/registro";
import {
  canalDeEnvioValido,
  enderecoDoLink,
  normalizarAssinatura,
  origemPublica,
  tokenPlausivel,
  uuidValido,
  validarAssinatura,
  type CampoRespondido,
  type ErrosAssinatura,
  type TipoCampo,
} from "@/lib/documento";
import { clienteAnonimo, clienteServidor } from "@/lib/supabase/server";
import { agendarCarimbo, carimbarAssinatura } from "@/server/assinatura/carimbar";
import { qrEmSvg } from "@/server/assinatura/qr";
import { verificarAssinaturaPublica } from "@/server/consultas/documentos";
import { segredoDoServidor } from "@/server/assinatura/segredo";
import { emailDisponivel, enviarEmail, html } from "@/server/email";

/**
 * Assinatura à distância: criar o link, mandar o código, abrir o documento,
 * assinar, carimbar.
 *
 * As funções da paciente rodam para quem NÃO tem sessão. O que as sustenta
 * são as funções do banco (0014, 0032), que conferem token, validade, data de
 * nascimento, código por e-mail e situação a cada chamada — e que desde a
 * 0032 só atendem quem apresenta o segredo do servidor. Aqui não há
 * checagem que o banco não repita; o que só este arquivo faz é atestar IP,
 * aparelho e localização (lidos dos cabeçalhos da plataforma, nunca do
 * formulário) e falar com o mundo de fora: e-mail e autoridade de carimbo.
 */

// ---------------------------------------------------------------------
// Equipe: gerar e revogar o link
// ---------------------------------------------------------------------

/**
 * 32 bytes de aleatoriedade criptográfica, em base64url: 43 caracteres,
 * 256 bits. O banco guarda só o SHA-256; este valor em claro existe uma vez,
 * no retorno de `criarLinkAssinatura`, e vira link.
 */
function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

async function origemDoLink(): Promise<string | null> {
  const cabecalhos = await headers();
  const resultado = origemPublica({
    configurada: process.env.ORIGEM_PUBLICA,
    host: cabecalhos.get("host"),
    protocolo: cabecalhos.get("x-forwarded-proto"),
    producao: process.env.NODE_ENV === "production",
  });

  if (!resultado.ok) {
    registrarFalha("assinatura: origem pública", { code: "configuracao", message: resultado.motivo });
    return null;
  }
  return resultado.origem;
}

/**
 * Frases de `raise exception` das funções do banco passam (são nossas, em
 * português); o resto vira frase segura. Ver `lib/erros-banco.ts`.
 */
function erroDoBanco(error: ErroDoBanco, padrao: string, contexto: string): string {
  if (error) registrarFalha(contexto, error);
  return mensagemDoBanco(error, padrao);
}

/** O segredo, ou o registro de que ele falta (a tela mostra "falhou"). */
function segredoOuRegistro(contexto: string): string | null {
  const segredo = segredoDoServidor();
  if (!segredo) {
    registrarFalha(contexto, { code: "configuracao", message: "ASSINATURA_SEGREDO_SERVIDOR ausente" });
  }
  return segredo;
}

function naoAutorizado(contexto: string): void {
  registrarFalha(contexto, { code: "configuracao", message: "segredo do servidor não confere com o banco" });
}

export type ResultadoDaCriacao =
  | { ok: true; endereco: string; linkId: string }
  | { ok: false; erro: string };

export type VerificacaoDoLink = "nascimento" | "nascimento_email";

export async function criarLinkAssinatura(entrada: {
  documentoId: string;
  dias: number;
  verificacao?: VerificacaoDoLink;
}): Promise<ResultadoDaCriacao> {
  const usuario = await usuarioAtual();
  if (!usuario) return { ok: false, erro: "Sessão expirada. Entre novamente." };

  const documentoId = String(entrada.documentoId ?? "").slice(0, 36);
  if (!uuidValido(documentoId)) {
    return { ok: false, erro: "Documento não identificado." };
  }

  const dias = Math.min(90, Math.max(1, Math.trunc(Number(entrada.dias) || 15)));
  const verificacao: VerificacaoDoLink = entrada.verificacao === "nascimento_email" ? "nascimento_email" : "nascimento";

  if (verificacao === "nascimento_email" && !emailDisponivel()) {
    return {
      ok: false,
      erro: "O envio de e-mail do sistema não está configurado. Gere o link só com a data de nascimento ou avise quem cuida do sistema.",
    };
  }

  // A origem é conferida ANTES de criar o link: criar revoga o anterior, e
  // não adianta trocar um link que funciona por um endereço que não abre.
  const origem = await origemDoLink();
  if (!origem) {
    return {
      ok: false,
      erro: "O endereço público do sistema não está configurado corretamente. Avise quem cuida do sistema.",
    };
  }

  const token = gerarToken();
  const endereco = enderecoDoLink(origem, token);
  if (!endereco) return { ok: false, erro: "Não foi possível gerar o link." };

  const supabase = await clienteServidor();
  const { data, error } = await supabase.rpc("documento_link_criar", {
    p_documento_id: documentoId,
    p_token: token,
    p_dias: dias,
    // Vazio na criação: quem diz por onde foi é o clique no envio.
    p_canal: "",
    p_verificacao: verificacao,
  });

  if (error || !data) {
    return {
      ok: false,
      erro: erroDoBanco(error, "Não foi possível gerar o link.", "assinatura: criar link"),
    };
  }

  revalidatePath(`/formularios/${documentoId}`);

  return { ok: true, endereco, linkId: data };
}

/**
 * Grava por onde o link foi enviado, no momento em que o envio começa. Falhar
 * aqui não atrapalha o envio (a conversa já abriu): vai para o log.
 */
export async function registrarCanalDoLink(entrada: {
  linkId: string;
  documentoId: string;
  canal: string;
}): Promise<void> {
  const usuario = await usuarioAtual();
  if (!usuario) return;
  if (!uuidValido(entrada.linkId)) return;

  const canal = String(entrada.canal ?? "").trim().slice(0, 160);
  if (!canalDeEnvioValido(canal)) {
    registrarFalha("assinatura: canal do link", {
      code: "formato",
      message: "canal fora do formato aceito pelo banco",
    });
    return;
  }

  const supabase = await clienteServidor();
  const { error } = await supabase
    .from("documento_links")
    .update({ canal_envio: canal })
    .eq("id", entrada.linkId);

  if (error) registrarFalha("assinatura: registrar canal do link", error);

  if (uuidValido(entrada.documentoId)) {
    revalidatePath(`/formularios/${entrada.documentoId}`);
  }
}

export async function revogarLinkAssinatura(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre novamente.");

  const linkId = String(dados.get("link_id") ?? "").slice(0, 36);
  const documentoId = String(dados.get("documento_id") ?? "").slice(0, 36);
  if (!uuidValido(linkId)) return falha("Link não identificado.");

  const supabase = await clienteServidor();
  const { error } = await supabase.rpc("documento_link_revogar", { p_link_id: linkId });

  if (error) {
    return falha(erroDoBanco(error, "Não foi possível revogar o link. Tente de novo.", "assinatura: revogar link"));
  }

  // A função devolve `void` e não reclama de zero linhas. Relê para saber se
  // a revogação alcançou o link — zero linhas não é sucesso.
  const { data: revogado, error: erroLeitura } = await supabase
    .from("documento_links")
    .select("id")
    .eq("id", linkId)
    .not("revogado_em", "is", null)
    .maybeSingle();

  if (erroLeitura) {
    return falha(erroDoBanco(erroLeitura, "Não foi possível confirmar a revogação. Recarregue a página.", "assinatura: conferir revogação"));
  }
  if (!revogado) return falha("Link não encontrado.");

  if (uuidValido(documentoId)) revalidatePath(`/formularios/${documentoId}`);
  return sucesso("Link revogado. Quem o tiver não consegue mais abrir o documento.");
}

// ---------------------------------------------------------------------
// Carimbo de tempo (RFC 3161)
// ---------------------------------------------------------------------

/** Para a ficha da equipe: carimbar agora a assinatura que ficou sem. */
export async function carimbarAgora(
  _anterior: ResultadoAcao,
  dados: FormData,
): Promise<ResultadoAcao> {
  const usuario = await usuarioAtual();
  if (!usuario) return falha("Sessão expirada. Entre novamente.");

  const documentoId = String(dados.get("documento_id") ?? "").slice(0, 36);
  if (!uuidValido(documentoId)) return falha("Documento não identificado.");

  // Lida pela sessão: a RLS decide se esta pessoa enxerga a assinatura.
  const supabase = await clienteServidor();
  const { data, error } = await supabase
    .from("documento_assinaturas")
    .select("codigo_verificacao")
    .eq("documento_id", documentoId)
    .maybeSingle();

  if (error) return falha(erroDoBanco(error, "Não foi possível ler a assinatura.", "assinatura: carimbar agora"));
  if (!data?.codigo_verificacao) return falha("Assinatura não encontrada.");

  const resultado = await carimbarAssinatura(data.codigo_verificacao);
  revalidatePath(`/formularios/${documentoId}`);
  if (resultado === "falhou") {
    return falha("A autoridade de carimbo não respondeu agora. Tente de novo em alguns minutos.");
  }
  return sucesso("Carimbo de tempo registrado.");
}

// ---------------------------------------------------------------------
// Paciente: código, abrir, assinar — sem sessão
// ---------------------------------------------------------------------

export type ResultadoDoCodigo = {
  situacao: string;
  emailMascarado: string | null;
  reenviarEm: string | null;
};

/**
 * Segundo fator: gera o código no banco (que confere token e data de
 * nascimento, contando o erro) e manda por e-mail. O código em claro só
 * passa por aqui, a caminho do e-mail.
 */
export async function enviarCodigoDeVerificacao(token: string, nascimento: string): Promise<ResultadoDoCodigo> {
  const vazio: ResultadoDoCodigo = { situacao: "nao_encontrado", emailMascarado: null, reenviarEm: null };
  if (!tokenPlausivel(token)) return vazio;
  if (!dataValida(nascimento)) return { ...vazio, situacao: "data_incorreta" };

  const segredo = segredoOuRegistro("assinatura: enviar código");
  if (!segredo) return { ...vazio, situacao: "falhou" };

  const { data, error } = await clienteAnonimo().rpc("documento_link_codigo_enviar", {
    p_token: token,
    p_nascimento: nascimento,
    p_servidor: segredo,
  });

  if (error) {
    registrarFalha("assinatura: enviar código", error);
    return { ...vazio, situacao: "falhou" };
  }

  const linha = Array.isArray(data) ? data[0] : null;
  if (!linha) return vazio;
  if (linha.situacao === "nao_autorizado") {
    naoAutorizado("assinatura: enviar código");
    return { ...vazio, situacao: "falhou" };
  }

  const resultado: ResultadoDoCodigo = {
    situacao: linha.situacao,
    emailMascarado: linha.email_mascarado,
    reenviarEm: linha.reenviar_em,
  };
  if (linha.situacao !== "ok" || !linha.email || !linha.codigo) return resultado;

  const envio = await enviarEmail({
    para: linha.email,
    assunto: `${linha.codigo} é o seu código para abrir o documento — ${CLINICA.nome}`,
    texto: [
      `Seu código para abrir o documento enviado por ${CLINICA.nome}: ${linha.codigo}`,
      "",
      "Ele vale por 15 minutos. Se você não pediu este código, ignore esta mensagem — sem ele, e sem a sua data de nascimento, ninguém abre o documento.",
    ].join("\n"),
    html: emailDoCodigo(linha.codigo),
  });

  if (!envio.ok) {
    registrarFalha("assinatura: e-mail do código", { code: "email", message: envio.motivo });
    return { ...resultado, situacao: "email_falhou" };
  }
  return resultado;
}

function emailDoCodigo(codigo: string): string {
  const digitos = codigo
    .split("")
    .map((d) => `<span style="display:inline-block;min-width:34px;padding:10px 0;margin:0 3px;border:1px solid #c7d5e5;border-radius:10px;background:#f5f9ff;font:700 26px/1 'Segoe UI',Arial,sans-serif;color:#063f7c;text-align:center">${html(d)}</span>`)
    .join("");
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#f3f7fc;padding:28px 12px;font-family:'Segoe UI',Arial,sans-serif;color:#0f1b2d">
<table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #d9e3ee;border-radius:18px;padding:28px">
<tr><td>
<p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0854a0">${html(CLINICA.nome)}</p>
<h1 style="margin:0 0 12px;font-size:22px;color:#063f7c">Seu código para abrir o documento</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#3f4f63">Digite este código na página do documento. Ele vale por <strong>15 minutos</strong>.</p>
<div style="margin:0 0 22px;text-align:center">${digitos}</div>
<p style="margin:0;font-size:13px;line-height:1.55;color:#5b6b82">Se você não pediu este código, ignore esta mensagem. Sem ele, e sem a sua data de nascimento, ninguém abre o documento. A clínica nunca pede este código por telefone.</p>
</td></tr></table></body></html>`;
}

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
  /** Por onde a assinatura entrou (`balcao` ou `link`): a via diz a forma certa. */
  assinadoCanal: string | null;
  /** As perguntas da anamnese, com o que já foi respondido. Vazio nos demais. */
  campos: CampoRespondido[];
  /** `nascimento` ou `nascimento_email` — a tela pede o código quando é o caso. */
  verificacao: string | null;
  emailMascarado: string | null;
  /** A via: evidências da assinatura (0032). */
  codigoVerificacao: string | null;
  manifestoHash: string | null;
  fatores: string[];
  rubrica: string | null;
  rubricaDispensada: boolean;
  carimboEm: string | null;
  carimboAutoridade: string | null;
  ip: string | null;
  localizacao: string | null;
  dispositivo: string | null;
  /** Endereço de verificação e o QR dele, prontos para a via impressa. */
  enderecoVerificacao: string | null;
  qrVerificacao: string | null;
};

const DOCUMENTO_VAZIO: DocumentoParaAssinar = {
  situacao: "nao_encontrado",
  titulo: null,
  corpo: null,
  paciente: null,
  tipo: null,
  emitidoEm: null,
  hash: null,
  assinadoEm: null,
  assinadoPor: null,
  assinadoCanal: null,
  campos: [],
  verificacao: null,
  emailMascarado: null,
  codigoVerificacao: null,
  manifestoHash: null,
  fatores: [],
  rubrica: null,
  rubricaDispensada: false,
  carimboEm: null,
  carimboAutoridade: null,
  ip: null,
  localizacao: null,
  dispositivo: null,
  enderecoVerificacao: null,
  qrVerificacao: null,
};

/**
 * Fronteira do `jsonb`: depois daqui o resto trabalha com tipo do domínio.
 * Pergunta malformada é descartada em vez de derrubar a página.
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

/** O endereço público de verificação da assinatura, e o QR dele. */
async function verificacaoDaVia(codigo: string | null): Promise<{ endereco: string | null; qr: string | null }> {
  if (!codigo) return { endereco: null, qr: null };
  const origem = await origemDoLink();
  if (!origem) return { endereco: null, qr: null };
  const endereco = `${origem}/verificar/${codigo}`;
  try {
    return { endereco, qr: await qrEmSvg(endereco) };
  } catch (erro) {
    registrarFalha("assinatura: QR da via", { code: "qr", message: erro instanceof Error ? erro.message : "falha" });
    return { endereco, qr: null };
  }
}

/**
 * Abre o documento mediante data de nascimento e, quando o link exige, o
 * código por e-mail. Não devolve mensagem pronta: devolve a situação, e quem
 * a traduz é a tela.
 */
export async function abrirDocumentoParaAssinatura(
  token: string,
  nascimento: string,
  codigo = "",
): Promise<DocumentoParaAssinar> {
  if (!tokenPlausivel(token)) return DOCUMENTO_VAZIO;
  if (!dataValida(nascimento)) return { ...DOCUMENTO_VAZIO, situacao: "data_incorreta" };

  const segredo = segredoOuRegistro("assinatura: abrir pelo link");
  if (!segredo) return { ...DOCUMENTO_VAZIO, situacao: "falhou" };

  const supabase = clienteAnonimo();
  const { data, error } = await supabase.rpc("documento_para_assinatura", {
    p_token: token,
    p_nascimento: nascimento,
    p_codigo: String(codigo ?? "").replace(/\D/g, "").slice(0, 6),
    p_servidor: segredo,
  });

  if (error) {
    registrarFalha("assinatura: abrir pelo link", error);
    return { ...DOCUMENTO_VAZIO, situacao: "falhou" };
  }

  const linha = Array.isArray(data) ? data[0] : null;
  if (!linha) return DOCUMENTO_VAZIO;
  if (linha.situacao === "nao_autorizado") {
    naoAutorizado("assinatura: abrir pelo link");
    return { ...DOCUMENTO_VAZIO, situacao: "falhou" };
  }

  const via = linha.situacao === "ja_assinado" ? await verificacaoDaVia(linha.codigo_verificacao) : { endereco: null, qr: null };

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
    assinadoCanal: linha.assinado_canal,
    campos: camposRespondidos(linha.campos),
    verificacao: linha.verificacao,
    emailMascarado: linha.email_mascarado,
    codigoVerificacao: linha.codigo_verificacao,
    manifestoHash: linha.manifesto_hash,
    fatores: linha.fatores ?? [],
    rubrica: linha.rubrica,
    rubricaDispensada: linha.rubrica_dispensada === true,
    carimboEm: linha.carimbo_em,
    carimboAutoridade: linha.carimbo_autoridade,
    ip: linha.ip,
    localizacao: linha.localizacao,
    dispositivo: linha.dispositivo,
    enderecoVerificacao: via.endereco,
    qrVerificacao: via.qr,
  };
}

export type EstadoAssinaturaLink = {
  situacao: string | null;
  erros: ErrosAssinatura;
};

export async function assinarPorLink(entrada: {
  token: string;
  nascimento: string;
  codigo?: string;
  nome: string;
  cpf: string;
  confirmou: boolean;
  rubrica?: string | null;
  rubricaDispensada?: boolean;
  leituraSegundos?: number | null;
  leituraCompleta?: boolean | null;
}): Promise<EstadoAssinaturaLink> {
  if (!tokenPlausivel(entrada.token) || !dataValida(String(entrada.nascimento ?? ""))) {
    return { situacao: "nao_encontrado", erros: {} };
  }

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
    // descreve é a função do banco, a partir dos fatores que ela conferiu.
    verificacao: "assinatura a distancia",
  });

  const erros = validarAssinatura(valores);
  delete erros.verificacao;
  if (Object.keys(erros).length > 0) return { situacao: null, erros };

  const rubrica = typeof entrada.rubrica === "string" && entrada.rubrica.trim() ? entrada.rubrica.trim() : null;
  const dispensada = !rubrica && entrada.rubricaDispensada === true;
  if (!rubrica && !dispensada) {
    return { situacao: null, erros: { rubrica: "Faça a sua rubrica no quadro, ou marque que prefere assinar só pelo nome." } };
  }
  if (!rubricaValida(rubrica)) {
    return { situacao: null, erros: { rubrica: "Não conseguimos ler a rubrica. Limpe o quadro e desenhe de novo." } };
  }

  const segredo = segredoOuRegistro("assinatura: assinar pelo link");
  if (!segredo) {
    return { situacao: null, erros: { geral: "Não foi possível registrar a assinatura agora. Tente de novo em instantes." } };
  }

  const evidencia = evidenciaDaRequisicao(await headers());
  const leitura = Number(entrada.leituraSegundos);

  const { data, error } = await clienteAnonimo().rpc("documento_assinar_por_link", {
    p_token: entrada.token,
    p_nascimento: entrada.nascimento,
    p_codigo: String(entrada.codigo ?? "").replace(/\D/g, "").slice(0, 6),
    p_nome: valores.nome,
    p_cpf: valores.cpf,
    p_rubrica: rubrica ?? "",
    p_rubrica_dispensada: dispensada,
    // -1 = não medido: o banco grava nulo fora de 0..86400.
    p_leitura_segundos: Number.isFinite(leitura) ? Math.max(0, Math.min(86400, Math.round(leitura))) : -1,
    p_leitura_completa: entrada.leituraCompleta === true,
    p_ip: evidencia.ip,
    p_dispositivo: evidencia.dispositivo,
    p_localizacao: evidencia.localizacao,
    p_servidor: segredo,
  });

  if (error) {
    return {
      situacao: null,
      erros: {
        geral: erroDoBanco(error, "Não foi possível registrar a assinatura. Tente de novo.", "assinatura: assinar pelo link"),
      },
    };
  }

  const linha = Array.isArray(data) ? data[0] : null;
  const situacao = String(linha?.situacao ?? "nao_encontrado");
  if (situacao === "nao_autorizado") {
    naoAutorizado("assinatura: assinar pelo link");
    return { situacao: null, erros: { geral: "Não foi possível registrar a assinatura agora. Tente de novo em instantes." } };
  }

  if (situacao === "ok") agendarCarimbo(linha?.codigo_verificacao);

  return { situacao, erros: {} };
}

/**
 * A paciente respondendo a anamnese pelo link. Mesma porta: data de
 * nascimento, código quando o link exige, e o segredo do servidor.
 */
export async function responderPorLink(entrada: {
  token: string;
  nascimento: string;
  codigo?: string;
  respostas: Record<string, string | string[] | null>;
}): Promise<string> {
  if (!tokenPlausivel(entrada.token)) return "nao_encontrado";
  if (!dataValida(String(entrada.nascimento ?? ""))) return "data_incorreta";

  const respostas = entrada.respostas;
  if (
    !respostas ||
    typeof respostas !== "object" ||
    Array.isArray(respostas) ||
    Object.keys(respostas).length > 200 ||
    JSON.stringify(respostas).length > 200_000
  ) {
    return "respostas_invalidas";
  }

  const segredo = segredoOuRegistro("assinatura: responder pelo link");
  if (!segredo) return "falhou";

  const { data, error } = await clienteAnonimo().rpc("documento_responder_por_link", {
    p_token: entrada.token,
    p_nascimento: entrada.nascimento,
    p_respostas: respostas,
    p_codigo: String(entrada.codigo ?? "").replace(/\D/g, "").slice(0, 6),
    p_servidor: segredo,
  });

  if (error) {
    registrarFalha("assinatura: responder pelo link", error);
    return "falhou";
  }
  if (data === "nao_autorizado") {
    naoAutorizado("assinatura: responder pelo link");
    return "falhou";
  }
  return String(data ?? "nao_encontrado");
}

/**
 * O carimbo chega logo depois da assinatura (`agendarCarimbo`). A via
 * pergunta por ele pelo código de verificação — o mesmo dado que a página
 * pública /verificar mostra a qualquer um, sem abrir o documento de novo
 * (o que contaria mais uma abertura do link).
 */
export async function carimboDaVia(
  codigoVerificacao: string,
): Promise<{ carimboEm: string | null; carimboAutoridade: string | null }> {
  const verificacao = await verificarAssinaturaPublica(codigoVerificacao);
  return {
    carimboEm: verificacao.carimboEm ? verificacao.carimboEm.toISOString() : null,
    carimboAutoridade: verificacao.carimboAutoridade,
  };
}
