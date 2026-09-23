"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { falha, sucesso, type ResultadoAcao } from "@/lib/acao";
import { usuarioAtual } from "@/lib/auth";
import { dataValida } from "@/lib/dates";
import { mensagemDoBanco, type ErroDoBanco } from "@/lib/erros-banco";
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
 * A origem do endereço público: `ORIGEM_PUBLICA` quando configurada (ver
 * `.env.local.example`), senão o host da requisição, conferido. As regras
 * moram em `origemPublica` (`lib/documento.ts`), testadas sem servidor.
 *
 * Nunca registra o token: o log leva só o motivo da recusa da origem.
 */
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
 * Frases de `raise exception` das funções da 0014/0022 passam (são nossas, em
 * português); o resto vira frase segura. Ver `lib/erros-banco.ts`.
 */
function erroDoBanco(error: ErroDoBanco, padrao: string, contexto: string): string {
  if (error) registrarFalha(contexto, error);
  return mensagemDoBanco(error, padrao);
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

  // Mesmo formato da CHECK `documento_links_canal_formato` (0022). Fora dele
  // o banco recusaria; o registro diz o que houve em vez de perder calado.
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

  // Não sobe para a tela (ver acima), mas também não some: vai para o log.
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

  // A função devolve `void` e não reclama de zero linhas (link de outro
  // documento, anamnese para quem não é administradora). Relê para saber se
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
  /** Por onde a assinatura entrou (`balcao` ou `link`): a via diz a forma certa. */
  assinadoCanal: string | null;
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
    assinadoCanal: null,
    campos: [],
  };

  if (!tokenPlausivel(token)) return vazio;
  if (!dataValida(nascimento)) return { ...vazio, situacao: "data_incorreta" };

  // Sem os cookies de quem estiver logado neste navegador: ver `clienteAnonimo`.
  const supabase = clienteAnonimo();
  const { data, error } = await supabase.rpc("documento_para_assinatura", {
    p_token: token,
    p_nascimento: nascimento,
  });

  // Falha de infraestrutura não é "link inexistente": a paciente precisa
  // saber que pode tentar de novo, e não que o link é inválido.
  if (error) {
    registrarFalha("assinatura: abrir pelo link", error);
    return { ...vazio, situacao: "falhou" };
  }

  const linha = Array.isArray(data) ? data[0] : null;
  if (!linha) return vazio;

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
    // descreve é a função do banco, a partir do canal de envio do link.
    verificacao: "assinatura a distancia",
  });

  const erros = validarAssinatura(valores);
  delete erros.verificacao;
  if (Object.keys(erros).length > 0) return { situacao: null, erros };

  const cabecalhos = await headers();
  const encaminhado = cabecalhos.get("x-forwarded-for") ?? "";

  // Sem os cookies de quem estiver logado neste navegador: ver `clienteAnonimo`.
  const supabase = clienteAnonimo();
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
      erros: {
        geral: erroDoBanco(error, "Não foi possível registrar a assinatura. Tente de novo.", "assinatura: assinar pelo link"),
      },
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

  // Sem os cookies de quem estiver logado neste navegador: ver `clienteAnonimo`.
  const supabase = clienteAnonimo();
  const { data, error } = await supabase.rpc("documento_responder_por_link", {
    p_token: entrada.token,
    p_nascimento: entrada.nascimento,
    p_respostas: respostas,
  });

  if (error) {
    registrarFalha("assinatura: responder pelo link", error);
    return "falhou";
  }
  return String(data ?? "nao_encontrado");
}
