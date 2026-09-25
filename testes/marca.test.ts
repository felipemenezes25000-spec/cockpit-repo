import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLINICA } from "@/lib/nav";

/**
 * As imagens da marca que `src/app` publica, geradas por
 * `scripts/gerar-marca.mjs`. O Next anuncia tamanho e tipo delas no `<head>`
 * lendo o arquivo; aqui se confere que elas existem com a forma que cada
 * lugar pede — e que o middleware as deixa passar sem sessão fica em
 * `src/middleware.test.ts`.
 */

const APP = join(process.cwd(), "src", "app");
const arquivo = (nome: string) => readFileSync(join(APP, nome));

/** Largura, altura e tipo de cor de um PNG, lidos do cabeçalho (IHDR). */
function cabecalhoPng(png: Buffer) {
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { largura: png.readUInt32BE(16), altura: png.readUInt32BE(20), tipoDeCor: png[25] };
}

describe("imagens da marca", () => {
  it("apple-icon.png: 180 × 180 e opaco — o iOS pinta de preto o que for transparente", () => {
    // Tipo de cor 2 é RGB, sem canal alfa.
    expect(cabecalhoPng(arquivo("apple-icon.png"))).toEqual({ largura: 180, altura: 180, tipoDeCor: 2 });
  });

  it("opengraph-image.png: 1200 × 630, com o nome da clínica no texto alternativo", () => {
    const { largura, altura } = cabecalhoPng(arquivo("opengraph-image.png"));
    expect([largura, altura]).toEqual([1200, 630]);
    expect(arquivo("opengraph-image.alt.txt").toString("utf8")).toContain(CLINICA.nome);
  });

  it("favicon.ico: cada tamanho da aba e da área de trabalho desenhado no próprio tamanho", () => {
    const ico = arquivo("favicon.ico");
    expect(ico.readUInt16LE(2)).toBe(1); // ícone, não cursor
    const quantos = ico.readUInt16LE(4);
    const lados = Array.from({ length: quantos }, (_, i) => ico[6 + 16 * i] || 256);
    expect(lados).toEqual([16, 32, 48, 64, 128, 256]);
  });
});
