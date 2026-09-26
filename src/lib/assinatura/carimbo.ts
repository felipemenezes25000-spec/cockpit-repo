/**
 * Carimbo de tempo (RFC 3161) do manifesto da assinatura.
 *
 * Uma autoridade de carimbo de tempo (TSA) assina "este hash existia neste
 * instante" com o relógio e a chave dela. É o que tira a data e a hora da
 * assinatura das mãos da clínica: nem o banco nem o servidor conseguem
 * produzir um carimbo com outra data depois.
 *
 * Sem biblioteca de ASN.1: o pedido é pequeno e de forma fixa, e da resposta
 * só se extrai o que o sistema usa — o status, a confirmação de que o carimbo
 * é do hash pedido e a hora (`genTime`). O arquivo inteiro fica guardado
 * (base64) e pode ser conferido fora do sistema com
 * `openssl ts -reply -in carimbo.tsr -text`.
 */

/** Autoridades, em ordem de preferência. Gratuitas, sem cadastro. */
export const AUTORIDADES: ReadonlyArray<{ nome: string; url: string }> = [
  { nome: "DigiCert", url: "http://timestamp.digicert.com" },
  { nome: "Sectigo", url: "http://timestamp.sectigo.com" },
  { nome: "FreeTSA", url: "https://freetsa.org/tsr" },
];

// OID 2.16.840.1.101.3.4.2.1 (SHA-256) com parâmetro NULL.
const ALGORITMO_SHA256 = Uint8Array.from([
  0x30, 0x0d, 0x06, 0x09, 0x60, 0x86, 0x48, 0x01, 0x65, 0x03, 0x04, 0x02, 0x01, 0x05, 0x00,
]);

function comprimento(n: number): number[] {
  if (n < 0x80) return [n];
  const bytes: number[] = [];
  let resto = n;
  while (resto > 0) {
    bytes.unshift(resto & 0xff);
    resto >>= 8;
  }
  return [0x80 | bytes.length, ...bytes];
}

function tlv(tag: number, conteudo: Uint8Array): Uint8Array {
  const cabeca = [tag, ...comprimento(conteudo.length)];
  const saida = new Uint8Array(cabeca.length + conteudo.length);
  saida.set(cabeca, 0);
  saida.set(conteudo, cabeca.length);
  return saida;
}

function juntar(...partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const saida = new Uint8Array(total);
  let posicao = 0;
  for (const parte of partes) {
    saida.set(parte, posicao);
    posicao += parte.length;
  }
  return saida;
}

export function hexParaBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]{64}$/i.test(hex)) throw new Error("hash SHA-256 inválido");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

/**
 * TimeStampReq: versão 1, o hash (SHA-256), um nonce de 8 bytes (positivo) e
 * `certReq` verdadeiro — a resposta traz o certificado da autoridade, e o
 * arquivo guardado se confere sozinho.
 */
export function pedidoDeCarimbo(hashHex: string, nonce: Uint8Array): Uint8Array {
  if (nonce.length !== 8) throw new Error("nonce de 8 bytes");
  const nonceSemSinal = Uint8Array.from(nonce);
  nonceSemSinal[0] = nonceSemSinal[0] & 0x7f;

  const versao = tlv(0x02, Uint8Array.from([0x01]));
  const impressao = tlv(0x30, juntar(ALGORITMO_SHA256, tlv(0x04, hexParaBytes(hashHex))));
  const campoNonce = tlv(0x02, nonceSemSinal);
  const pedeCertificado = tlv(0x01, Uint8Array.from([0xff]));
  return tlv(0x30, juntar(versao, impressao, campoNonce, pedeCertificado));
}

type Elemento = { tag: number; inicio: number; conteudo: number; fim: number };

/** Lê um elemento DER na posição dada. Comprimento indefinido não é DER: recusa. */
function lerElemento(der: Uint8Array, posicao: number): Elemento {
  if (posicao + 2 > der.length) throw new Error("DER truncado");
  const tag = der[posicao];
  let n = der[posicao + 1];
  let conteudo = posicao + 2;
  if (n & 0x80) {
    const bytes = n & 0x7f;
    if (bytes === 0 || bytes > 4) throw new Error("comprimento DER inválido");
    n = 0;
    for (let i = 0; i < bytes; i++) n = n * 256 + der[conteudo + i];
    conteudo += bytes;
  }
  const fim = conteudo + n;
  if (fim > der.length) throw new Error("DER truncado");
  return { tag, inicio: posicao, conteudo, fim };
}

function procurar(der: Uint8Array, agulha: Uint8Array, desde = 0): number {
  externo: for (let i = desde; i <= der.length - agulha.length; i++) {
    for (let j = 0; j < agulha.length; j++) if (der[i + j] !== agulha[j]) continue externo;
    return i;
  }
  return -1;
}

/** "20260926135102Z" ou "20260926135102.123Z" → Date. */
function horaGeneralizada(texto: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\.(\d{1,6}))?Z$/.exec(texto);
  if (!m) return null;
  const ms = m[7] ? Number(m[7].padEnd(3, "0").slice(0, 3)) : 0;
  const data = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], ms));
  return Number.isNaN(data.getTime()) ? null : data;
}

export type CarimboLido =
  | { ok: true; hora: Date }
  | { ok: false; motivo: string };

/**
 * Confere a TimeStampResp: status concedido (0 ou 1), o carimbo é do hash
 * pedido (o `messageImprint` aparece na resposta) e a hora (`genTime`, o
 * primeiro GeneralizedTime depois do hash — no TSTInfo ele vem logo após o
 * número de série, antes dos certificados).
 */
export function lerRespostaDoCarimbo(der: Uint8Array, hashHex: string): CarimboLido {
  try {
    const resposta = lerElemento(der, 0);
    if (resposta.tag !== 0x30) return { ok: false, motivo: "resposta não é SEQUENCE" };
    const statusInfo = lerElemento(der, resposta.conteudo);
    if (statusInfo.tag !== 0x30) return { ok: false, motivo: "sem PKIStatusInfo" };
    const status = lerElemento(der, statusInfo.conteudo);
    if (status.tag !== 0x02 || status.fim - status.conteudo !== 1) return { ok: false, motivo: "status ilegível" };
    const valor = der[status.conteudo];
    if (valor !== 0 && valor !== 1) return { ok: false, motivo: `carimbo recusado (status ${valor})` };
    if (statusInfo.fim >= resposta.fim) return { ok: false, motivo: "resposta sem carimbo" };

    const impressao = juntar(Uint8Array.from([0x04, 0x20]), hexParaBytes(hashHex));
    const onde = procurar(der, impressao, statusInfo.fim);
    if (onde < 0) return { ok: false, motivo: "o carimbo não é do hash pedido" };

    for (let i = onde + impressao.length; i < der.length - 2; i++) {
      if (der[i] !== 0x18) continue;
      const elemento = lerElemento(der, i);
      const texto = new TextDecoder().decode(der.slice(elemento.conteudo, elemento.fim));
      const hora = horaGeneralizada(texto);
      if (hora) return { ok: true, hora };
    }
    return { ok: false, motivo: "sem genTime" };
  } catch (erro) {
    return { ok: false, motivo: erro instanceof Error ? erro.message : "DER inválido" };
  }
}

export type Carimbo = { autoridade: string; hora: Date; tokenBase64: string };

/**
 * Pede o carimbo às autoridades, em ordem, até uma responder bem. Cada uma
 * tem `limiteMs`; se nenhuma responder, devolve `null` — a assinatura vale
 * sem carimbo, e a ficha oferece carimbar depois.
 */
export async function carimbar(
  hashHex: string,
  { limiteMs = 6000, autoridades = AUTORIDADES, buscar = fetch }: {
    limiteMs?: number;
    autoridades?: ReadonlyArray<{ nome: string; url: string }>;
    buscar?: typeof fetch;
  } = {},
): Promise<{ carimbo: Carimbo | null; falhas: string[] }> {
  const falhas: string[] = [];
  const nonce = crypto.getRandomValues(new Uint8Array(8));
  const pedido = pedidoDeCarimbo(hashHex, nonce);

  for (const autoridade of autoridades) {
    const controle = new AbortController();
    const prazo = setTimeout(() => controle.abort(), limiteMs);
    try {
      const resposta = await buscar(autoridade.url, {
        method: "POST",
        headers: { "Content-Type": "application/timestamp-query", Accept: "application/timestamp-reply" },
        body: pedido as unknown as BodyInit,
        signal: controle.signal,
        cache: "no-store",
      });
      if (!resposta.ok) {
        falhas.push(`${autoridade.nome}: HTTP ${resposta.status}`);
        continue;
      }
      const der = new Uint8Array(await resposta.arrayBuffer());
      const lido = lerRespostaDoCarimbo(der, hashHex);
      if (!lido.ok) {
        falhas.push(`${autoridade.nome}: ${lido.motivo}`);
        continue;
      }
      return {
        carimbo: { autoridade: autoridade.nome, hora: lido.hora, tokenBase64: Buffer.from(der).toString("base64") },
        falhas,
      };
    } catch (erro) {
      falhas.push(`${autoridade.nome}: ${erro instanceof Error ? erro.name : "falha"}`);
    } finally {
      clearTimeout(prazo);
    }
  }
  return { carimbo: null, falhas };
}
