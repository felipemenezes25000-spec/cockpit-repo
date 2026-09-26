import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { carimbar, hexParaBytes, lerRespostaDoCarimbo, pedidoDeCarimbo } from "./carimbo";
import { aparelhoLegivel, evidenciaDaRequisicao, rotuloDoFator } from "./evidencia";
import { caminhoDaRubrica, rubricaSuficiente, rubricaValida, type Ponto } from "./rubrica";

/**
 * Resposta de verdade da DigiCert (RFC 3161), gravada uma vez: o hash pedido
 * e a hora que ela carimbou. `openssl ts -reply -in ... -text` diz "Granted".
 */
const RESPOSTA = new Uint8Array(
  Buffer.from(readFileSync(new URL("./fixtures/digicert.tsr.b64", import.meta.url), "utf8").trim(), "base64"),
);
const HASH = "5b69b6475240d7f1f0e0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2";

describe("carimbo de tempo (RFC 3161)", () => {
  it("o pedido é um TimeStampReq v1 com SHA-256, o hash, o nonce e certReq", () => {
    const nonce = Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const pedido = pedidoDeCarimbo(HASH, nonce);
    const hex = Buffer.from(pedido).toString("hex");

    expect(pedido[0]).toBe(0x30);
    expect(hex).toContain("020101"); // version 1
    expect(hex).toContain("608648016503040201"); // OID do SHA-256
    expect(hex).toContain(`0420${HASH}`); // messageImprint
    expect(hex).toContain("02080102030405060708"); // nonce
    expect(hex.endsWith("0101ff")).toBe(true); // certReq TRUE
  });

  it("lê a hora da resposta real e confere que é do hash pedido", () => {
    const lido = lerRespostaDoCarimbo(RESPOSTA, HASH);
    expect(lido).toEqual({ ok: true, hora: new Date("2026-09-26T11:37:57Z") });
  });

  it("resposta de outro hash não vale", () => {
    const lido = lerRespostaDoCarimbo(RESPOSTA, "0".repeat(64));
    expect(lido.ok).toBe(false);
  });

  it("status recusado e lixo não viram carimbo", () => {
    // TimeStampResp { status { PKIStatus 2 (rejection) } }
    const recusa = Uint8Array.from([0x30, 0x05, 0x30, 0x03, 0x02, 0x01, 0x02]);
    expect(lerRespostaDoCarimbo(recusa, HASH)).toEqual({ ok: false, motivo: "carimbo recusado (status 2)" });
    expect(lerRespostaDoCarimbo(Uint8Array.from([1, 2, 3]), HASH).ok).toBe(false);
  });

  it("autoridade fora do ar: tenta a próxima, e diz o que falhou", async () => {
    const pedidos: string[] = [];
    const buscar = (async (url: string) => {
      pedidos.push(url);
      if (url.includes("primeira")) return new Response("fora", { status: 503 });
      return new Response(RESPOSTA, { status: 200 });
    }) as unknown as typeof fetch;

    const { carimbo, falhas } = await carimbar(HASH, {
      buscar,
      autoridades: [
        { nome: "Primeira", url: "http://primeira.exemplo" },
        { nome: "Segunda", url: "http://segunda.exemplo" },
      ],
    });
    expect(pedidos).toEqual(["http://primeira.exemplo", "http://segunda.exemplo"]);
    expect(falhas).toEqual(["Primeira: HTTP 503"]);
    expect(carimbo?.autoridade).toBe("Segunda");
    expect(carimbo?.hora.toISOString()).toBe("2026-09-26T11:37:57.000Z");
    expect(Buffer.from(carimbo?.tokenBase64 ?? "", "base64")).toEqual(Buffer.from(RESPOSTA));
  });

  it("nenhuma autoridade responde: sem carimbo, e a assinatura segue sem ele", async () => {
    const buscar = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const { carimbo, falhas } = await carimbar(HASH, { buscar, autoridades: [{ nome: "Única", url: "http://x" }] });
    expect(carimbo).toBeNull();
    expect(falhas).toEqual(["Única: TypeError"]);
  });

  it("hex para bytes: só SHA-256 (64 hex); outra coisa é recusada antes de ir à autoridade", () => {
    const bytes = hexParaBytes(`00ff10${"a".repeat(58)}`);
    expect(bytes).toHaveLength(32);
    expect(Array.from(bytes.slice(0, 3))).toEqual([0, 255, 16]);
    expect(() => hexParaBytes("00ff10")).toThrow(/inválido/);
    expect(() => hexParaBytes("z".repeat(64))).toThrow(/inválido/);
  });
});

describe("rubrica", () => {
  const traco = (pontos: [number, number][]): Ponto[] => pontos.map(([x, y]) => ({ x, y }));

  it("normaliza para 0–1000 × 0–400, inteiro, e descarta ponto repetido", () => {
    const caminho = caminhoDaRubrica([traco([[0, 0], [0.1, 0.1], [50, 20], [100, 40]])], 100, 40);
    expect(caminho).toBe("M0 0L500 200L1000 400");
    expect(rubricaValida(caminho)).toBe(true);
  });

  it("vários traços; traço de um ponto só vira um ponto visível", () => {
    const caminho = caminhoDaRubrica([traco([[10, 10], [20, 10]]), traco([[30, 30]])], 1000, 400);
    expect(caminho).toBe("M10 10L20 10 M30 30L31 30");
    expect(rubricaValida(caminho)).toBe(true);
  });

  it("fora do quadro é trazido para a borda", () => {
    expect(caminhoDaRubrica([traco([[-5, -5], [2000, 900]])], 1000, 400)).toBe("M0 0L1000 400");
  });

  it("aceita só o formato do banco: nada de SVG, script ou texto livre", () => {
    expect(rubricaValida(null)).toBe(true);
    expect(rubricaValida("M1 1L2 2L3 3")).toBe(true);
    expect(rubricaValida('<svg onload="x">')).toBe(false);
    expect(rubricaValida("M1 1 Z")).toBe(false);
    expect(rubricaValida("M1 1L2 2 C3 3 4 4 5 5")).toBe(false);
    expect(rubricaValida("M10000 1L2 2L3 3")).toBe(false);
    expect(rubricaValida("M1 1")).toBe(false);
    expect(rubricaValida(`M1 1${"L2 2".repeat(10_000)}`)).toBe(false);
  });

  it("um toque acidental não é rubrica; um traço de verdade é", () => {
    expect(rubricaSuficiente([traco([[10, 10], [11, 11]])])).toBe(false);
    const rabisco = traco(Array.from({ length: 20 }, (_, i) => [100 + i * 20, 200 + (i % 2) * 30]));
    expect(rubricaSuficiente([rabisco])).toBe(true);
  });
});

describe("evidência da requisição", () => {
  const cabecalhos = (valores: Record<string, string>) => new Headers(valores);

  it("IP da plataforma (x-real-ip) vence a lista do x-forwarded-for", () => {
    expect(evidenciaDaRequisicao(cabecalhos({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" })).ip).toBe("203.0.113.9");
    expect(evidenciaDaRequisicao(cabecalhos({ "x-forwarded-for": "198.51.100.4, 10.0.0.1" })).ip).toBe("198.51.100.4");
    expect(evidenciaDaRequisicao(cabecalhos({})).ip).toBe("");
  });

  it("local aproximado vem dos cabeçalhos da Vercel, decodificados", () => {
    const evidencia = evidenciaDaRequisicao(
      cabecalhos({ "x-vercel-ip-city": "S%C3%A3o%20Paulo", "x-vercel-ip-country-region": "SP", "x-vercel-ip-country": "BR" }),
    );
    expect(evidencia.localizacao).toBe("São Paulo, SP, BR");
    expect(evidenciaDaRequisicao(cabecalhos({ "x-vercel-ip-city": "%E0%A4%A" })).localizacao).toBe("%E0%A4%A");
  });

  it("aparelho limitado a 400 caracteres", () => {
    expect(evidenciaDaRequisicao(cabecalhos({ "user-agent": "x".repeat(900) })).dispositivo).toHaveLength(400);
  });

  it("aparelho em português de gente", () => {
    expect(aparelhoLegivel("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1")).toBe("iPhone · Safari");
    expect(aparelhoLegivel("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36")).toBe("Android · Chrome");
    expect(aparelhoLegivel("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/128.0 Safari/537.36 Edg/128.0")).toBe("Windows · Edge");
    expect(aparelhoLegivel("curl/8.0")).toBeNull();
    expect(aparelhoLegivel(null)).toBeNull();
  });

  it("fatores em frases; fator desconhecido aparece como veio", () => {
    expect(rotuloDoFator("codigo_por_email")).toBe("Código por e-mail confirmado");
    expect(rotuloDoFator("fator_novo")).toBe("fator_novo");
  });
});
