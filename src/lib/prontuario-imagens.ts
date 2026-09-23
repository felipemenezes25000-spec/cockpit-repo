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
// Minúsculo, sem a flag `i`: a política do bucket e a CHECK
// `prontuario_imagens_caminho_forma` (0022) só aceitam hexadecimal minúsculo.
// Com `i`, um caminho em maiúsculas passaria aqui e cairia no banco.
// E o ponto vai escapado duas vezes: dentro de template literal, `\.` vira
// só `.`, e o ponto solto casava com qualquer caractere ("<uuid>Xjpg").
const CAMINHO = new RegExp(`^${UUID}/${UUID}\\.(jpg|png|webp)$`);

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

/** A extensão do caminho, que precisa bater com o tipo do arquivo. */
export function extensaoDoTipo(tipo: TipoAceito): string {
  return EXTENSAO[tipo];
}

/**
 * O tipo pelo conteúdo, não pelo que foi declarado.
 *
 * O `mimetype` que o Storage guarda é o `Content-Type` que o navegador
 * mandou — declarado, não conferido. Os primeiros bytes dizem o que o arquivo
 * é de fato: JPEG começa em `FF D8 FF`, PNG na assinatura de 8 bytes e WebP em
 * `RIFF....WEBP`. Qualquer outra coisa devolve `null`.
 */
export function tipoPeloConteudo(inicio: Uint8Array): TipoAceito | null {
  const b = inicio;
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    return "image/jpeg";
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (b.length >= 8 && png.every((byte, i) => b[i] === byte)) {
    return "image/png";
  }
  const ascii = (de: number, ate: number) => String.fromCharCode(...b.slice(de, ate));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

const NOME_DO_TIPO: Record<TipoAceito, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/**
 * Por que o conteúdo não bate com o tipo declarado. O declarado vem da
 * extensão do nome: um PNG salvo como ".jpg" é uma imagem válida, e dizer
 * que "não é imagem" levaria a pessoa a repetir o envio e falhar de novo.
 */
export function motivoDoConteudoDivergente(declarado: string, real: TipoAceito | null): string {
  if (real && tipoAceito(declarado) && real !== declarado) {
    return `O arquivo é ${NOME_DO_TIPO[real]}, mas foi enviado como ${NOME_DO_TIPO[declarado]}. Salve com a extensão .${EXTENSAO[real]} e envie de novo.`;
  }
  return "O conteúdo do arquivo não é uma imagem JPEG, PNG ou WebP válida.";
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

// ---------------------------------------------------------------------------
// Conferência das fotos: bucket x linhas (migração 0024)
// ---------------------------------------------------------------------------

/**
 * As duas sobras que a função `prontuario_imagens_reconciliar()` aponta.
 *
 * - `metadado_sem_arquivo`: a linha existe e o arquivo sumiu do bucket. A foto
 *   aparece no prontuário sem imagem, e a eliminação com motivo resolve.
 * - `arquivo_sem_metadado`: o arquivo está no bucket e nenhuma linha o
 *   descreve — um envio que parou no meio. Não aparece em tela nenhuma.
 */
export type SituacaoDaSobra = "metadado_sem_arquivo" | "arquivo_sem_metadado";

export type SobraDeFoto = {
  situacao: SituacaoDaSobra;
  caminho: string;
  /** Nulo quando é arquivo sem linha. */
  imagemId: string | null;
  /** Nulo quando a pasta do arquivo não é o id de um prontuário. */
  prontuarioId: string | null;
  desde: Date;
  /**
   * Menos de uma hora: pode ser um envio ainda em andamento (o arquivo sobe
   * antes de a linha ser gravada), e não uma sobra de verdade.
   */
  recente: boolean;
};

/** Quanto tempo uma sobra fica como "envio possivelmente em andamento". */
export const FOLGA_DE_ENVIO_MS = 60 * 60 * 1000;

// A mesma forma que a função do banco usa para reconhecer a pasta.
const PASTA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Normaliza as linhas da função de reconciliação.
 *
 * Os tipos gerados marcam `imagem_id` e `prontuario_id` como texto, mas a
 * função devolve nulo neles (arquivo sem linha; pasta que não é uuid). Linha
 * com situação desconhecida ou data ilegível é descartada em vez de virar um
 * item que a tela não sabe explicar. A ordem é a do banco (desde, caminho).
 */
export function lerSobrasDasFotos(
  linhas: ReadonlyArray<{
    situacao: string;
    caminho: string;
    imagem_id: string | null;
    prontuario_id: string | null;
    desde: string;
  }>,
  agora: Date,
): SobraDeFoto[] {
  const sobras: SobraDeFoto[] = [];
  for (const linha of linhas) {
    if (linha.situacao !== "metadado_sem_arquivo" && linha.situacao !== "arquivo_sem_metadado") {
      continue;
    }
    const desde = new Date(linha.desde);
    if (Number.isNaN(desde.getTime())) continue;
    const prontuarioId =
      linha.prontuario_id && PASTA_UUID.test(linha.prontuario_id) ? linha.prontuario_id : null;
    sobras.push({
      situacao: linha.situacao,
      caminho: linha.caminho,
      imagemId: linha.situacao === "metadado_sem_arquivo" ? (linha.imagem_id ?? null) : null,
      prontuarioId,
      desde,
      recente: agora.getTime() - desde.getTime() < FOLGA_DE_ENVIO_MS,
    });
  }
  return sobras;
}
