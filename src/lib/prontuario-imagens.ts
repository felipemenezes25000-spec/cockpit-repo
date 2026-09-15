/**
 * Regras da foto de evolução, válidas nas duas pontas do envio.
 *
 * Uma foto entra no sistema por dois caminhos diferentes e no mesmo ato: o
 * navegador manda o arquivo direto para o Storage, e a ação de servidor grava
 * a linha que descreve esse arquivo. Se as duas pontas discordarem sobre o que
 * é aceitável — ou sobre a forma do caminho — sobra arquivo no bucket sem
 * linha que o explique. Por isso as regras moram aqui, e não em nenhum dos
 * dois lados.
 *
 * Cada limite abaixo tem um par no banco (migração 0011). Eles não são a
 * validação: são a mensagem em português para o que o banco recusaria de
 * qualquer jeito.
 */

import { dataValida } from "./prontuario";

export const BUCKET_IMAGENS = "prontuario-imagens";

/** Espelha `allowed_mime_types` do bucket e o CHECK `prontuario_imagens_tipo`. */
export const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"] as const;
export type TipoAceito = (typeof TIPOS_ACEITOS)[number];

/** 10 MB, como o bucket. Foto de celular cabe; vídeo não entra por engano. */
export const TAMANHO_MAXIMO = 10 * 1024 * 1024;

export const LIMITE_LEGENDA = 300;

/**
 * Quantas fotos de uma vez. Não é regra de banco — é o que impede alguém de
 * selecionar a pasta inteira do celular e pôr 400 uploads na fila.
 */
export const MAXIMO_POR_ENVIO = 12;

const EXTENSAO: Record<TipoAceito, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const CAMINHO = new RegExp(`^${UUID}/${UUID}\.(jpg|png|webp)$`, "i");

export function tipoAceito(valor: string): valor is TipoAceito {
  return (TIPOS_ACEITOS as readonly string[]).includes(valor);
}

/**
 * Caminho no bucket, no formato que o CHECK do banco exige:
 * `<prontuario_id>/<uuid>.<ext>`.
 *
 * O nome do arquivo original não entra no caminho de propósito. Ele costuma
 * trazer o nome da paciente ("maria-antes.jpg"), e o caminho aparece em log,
 * em URL assinada e no painel do Storage — lugares onde nome de paciente não
 * deveria circular. O nome de origem fica na coluna, que é atrás da RLS.
 */
export function caminhoDaImagem(prontuarioId: string, tipo: TipoAceito): string {
  return `${prontuarioId}/${crypto.randomUUID()}.${EXTENSAO[tipo]}`;
}

/**
 * O caminho pertence a este prontuário e tem a forma esperada.
 *
 * O CHECK do banco já barra o caminho de outra paciente. Isto existe para o
 * servidor recusar antes de tentar, com mensagem que se entende.
 */
export function caminhoCoerente(prontuarioId: string, caminho: string): boolean {
  return CAMINHO.test(caminho) && caminho.startsWith(`${prontuarioId}/`);
}

/** O que impede este arquivo de entrar, ou `null` se nada impede. */
export function motivoDaRecusa(arquivo: { tipo: string; tamanho: number }): string | null {
  if (!tipoAceito(arquivo.tipo)) {
    return "Formato não aceito. Use JPEG, PNG ou WebP.";
  }

  if (arquivo.tamanho <= 0) {
    return "Arquivo vazio.";
  }

  if (arquivo.tamanho > TAMANHO_MAXIMO) {
    return `Arquivo de ${formatarTamanho(arquivo.tamanho)}. O limite é ${formatarTamanho(TAMANHO_MAXIMO)}.`;
  }

  return null;
}

export function legendaNormalizada(valor: string): string {
  return valor.trim().replace(/\s+/g, " ").slice(0, LIMITE_LEGENDA);
}

/**
 * Data de captura: quando a foto foi tirada. Precisa existir no calendário e
 * não pode ser no futuro — a clínica fotografa e cadastra depois, nunca antes.
 */
export function motivoDataInvalida(valor: string, hojeNaClinica: string): string | null {
  if (!valor) return "Informe quando a foto foi tirada.";
  if (!dataValida(valor)) return "Data inválida.";
  if (valor > hojeNaClinica) return "A foto não pode ter sido tirada no futuro.";
  return null;
}

/**
 * Dimensões vindas do navegador. O servidor não decodifica a imagem para
 * conferir: elas só reservam o espaço na tela antes de a foto chegar, e o
 * banco exige as duas ou nenhuma.
 */
export function dimensoesSanas(
  largura: unknown,
  altura: unknown,
): { largura: number; altura: number } | null {
  const l = Number(largura);
  const a = Number(altura);

  if (!Number.isInteger(l) || !Number.isInteger(a)) return null;
  if (l <= 0 || a <= 0 || l > 30000 || a > 30000) return null;

  return { largura: l, altura: a };
}

/**
 * Erro do Storage virando frase em português (invariante §9, regra 11).
 *
 * Mora aqui porque as duas pontas precisam da mesma tradução: o navegador
 * erra ao enviar o arquivo, o servidor erra ao conferir ou ao remover. Repetir
 * o mapa nos dois lados garantiria que eles divergissem.
 *
 * O texto do erro NÃO é repassado. O que sobe é o que a pessoa pode fazer a
 * respeito — e quando não há nada específico a dizer, é melhor uma frase
 * honesta e vaga do que uma mensagem em inglês vinda de outra camada.
 */
export function mensagemDoStorage(
  erro: { message?: string; statusCode?: string | number; status?: number } | null,
  padrao: string,
): string {
  if (!erro) return padrao;

  const status = Number(erro.statusCode ?? erro.status ?? 0);
  const texto = (erro.message ?? "").toLowerCase();

  if (status === 413 || texto.includes("exceeded the maximum allowed size")) {
    return `Arquivo acima do limite de ${formatarTamanho(TAMANHO_MAXIMO)}.`;
  }

  if (status === 415 || texto.includes("mime type")) {
    return "Formato não aceito. Use JPEG, PNG ou WebP.";
  }

  if (status === 401 || status === 403 || texto.includes("row-level security")) {
    return "Seu perfil não tem permissão para isto.";
  }

  if (status === 409 || texto.includes("already exists")) {
    return "Já existe um arquivo neste caminho. Tente enviar de novo.";
  }

  if (status === 404 || texto.includes("not found")) {
    return "O arquivo não foi encontrado no armazenamento.";
  }

  // Sem rede, o navegador nem chega a receber status.
  if (texto.includes("failed to fetch") || texto.includes("network")) {
    return "Falha de conexão durante o envio. Verifique a internet e tente de novo.";
  }

  return padrao;
}

export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;

  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}
