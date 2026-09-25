#!/usr/bin/env node
/**
 * Gera as imagens da marca a partir do mesmo contorno de `MarcaDaClinica`
 * (`src/components/ui/marca-da-clinica.tsx`), das cores de `globals.css` e do
 * nome em `CLINICA` (`src/lib/nav.ts`) — nenhuma cor nem texto escrito aqui:
 *
 * - `src/app/favicon.ico`: o selo (quadro azul, logo branca) em 16, 32, 48,
 *   64, 128 e 256 px. Cada tamanho é desenhado no próprio tamanho, com o traço
 *   mais grosso quanto menor: reduzida de uma imagem grande, a logo de traço
 *   fino virava um borrão na aba do navegador.
 * - `src/app/apple-icon.png`: 180 × 180, quadro cheio e opaco. É o ícone da
 *   tela de início do iPhone (`appleWebApp` no layout raiz); o iOS arredonda
 *   os cantos sozinho e pinta de preto o que for transparente.
 * - `src/app/opengraph-image.png` (+ `.alt.txt`): 1200 × 630, a prévia do
 *   link no WhatsApp — o link de assinatura chega à paciente com a marca da
 *   clínica. Composição centrada, porque o app às vezes corta a prévia num
 *   quadrado do meio.
 *
 * Mudou a logo, a cor da marca ou o nome: `npm run marca:gerar` e comite as
 * imagens. Usa o Chromium do Playwright, o mesmo do E2E
 * (`npx playwright install chromium`), e busca a Hanken Grotesk no Google
 * Fonts — só aqui, na geração; o site não faz requisição externa. Sem a
 * fonte, para com erro em vez de gerar a prévia com outra letra.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const RAIZ = process.cwd();
const APP = join(RAIZ, "src", "app");

function trecho(arquivo, inicio) {
  const texto = readFileSync(join(RAIZ, arquivo), "utf8");
  const de = texto.indexOf(inicio);
  if (de < 0) throw new Error(`"${inicio}" não encontrado em ${arquivo}.`);
  return texto.slice(de, texto.indexOf(";", de));
}

const CONTORNO = [...trecho("src/components/ui/marca-da-clinica.tsx", "const CONTORNO =").matchAll(/"([^"]*)"/g)]
  .map((m) => m[1])
  .join("");

const identidade = trecho("src/lib/nav.ts", "export const CLINICA =");
const NOME = identidade.match(/nome:\s*"([^"]+)"/)?.[1];
const DESCRICAO = identidade.match(/descricao:\s*"([^"]+)"/)?.[1];

const css = readFileSync(join(APP, "globals.css"), "utf8");
function cor(token) {
  const achada = css.match(new RegExp(`--color-${token}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`));
  if (!achada) throw new Error(`--color-${token} não encontrada em globals.css.`);
  return achada[1];
}

if (!CONTORNO.startsWith("M") || !NOME || !DESCRICAO) {
  throw new Error("Não foi possível ler o contorno da logo ou o nome da clínica.");
}

const AZUL = cor("primary-container");
const BRANCO = cor("on-primary");
const CABINE = cor("cabine");
const CABINE_PROFUNDA = cor("cabine-profunda");
const CABINE_SECUNDARIO = cor("cabine-texto-secundario");

/** A logo como em `MarcaDaClinica`: o mesmo quadro e o mesmo contorno de peso. */
function logo(lado, corDaLogo, peso) {
  return (
    `<svg viewBox="-1 -1 102 102" width="${lado}" height="${lado}" xmlns="http://www.w3.org/2000/svg">` +
    `<path fill="${corDaLogo}" fill-rule="evenodd" stroke="${corDaLogo}" stroke-width="${peso}" ` +
    `stroke-linejoin="round" d="${CONTORNO}"/></svg>`
  );
}

/** Quanto menor o ícone, mais do quadro a logo ocupa e mais grosso o traço. */
const FAVICON = [
  { lado: 16, ocupa: 0.9, peso: 4 },
  { lado: 32, ocupa: 0.84, peso: 2.6 },
  { lado: 48, ocupa: 0.82, peso: 2.1 },
  { lado: 64, ocupa: 0.8, peso: 1.8 },
  { lado: 128, ocupa: 0.8, peso: 1.5 },
  { lado: 256, ocupa: 0.8, peso: 1.4 },
];

/** ICO com as imagens em PNG (aceito por todo navegador e pelo Windows desde o Vista). */
function empacotarIco(imagens) {
  const cabecalho = Buffer.alloc(6);
  cabecalho.writeUInt16LE(0, 0);
  cabecalho.writeUInt16LE(1, 2);
  cabecalho.writeUInt16LE(imagens.length, 4);
  let deslocamento = 6 + 16 * imagens.length;
  const entradas = imagens.map(({ lado, png }) => {
    const entrada = Buffer.alloc(16);
    entrada.writeUInt8(lado >= 256 ? 0 : lado, 0);
    entrada.writeUInt8(lado >= 256 ? 0 : lado, 1);
    entrada.writeUInt16LE(1, 4);
    entrada.writeUInt16LE(32, 6);
    entrada.writeUInt32LE(png.length, 8);
    entrada.writeUInt32LE(deslocamento, 12);
    deslocamento += png.length;
    return entrada;
  });
  return Buffer.concat([cabecalho, ...entradas, ...imagens.map(({ png }) => png)]);
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage({ deviceScaleFactor: 1 });

async function fotografar(html, largura, altura, transparente) {
  await pagina.setViewportSize({ width: largura, height: altura });
  await pagina.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${html}</body></html>`);
  return pagina.locator("#quadro").screenshot({ omitBackground: transparente });
}

const favicons = [];
for (const { lado, ocupa, peso } of FAVICON) {
  const raio = Math.round(lado * 0.22);
  const png = await fotografar(
    `<div id="quadro" style="width:${lado}px;height:${lado}px;border-radius:${raio}px;background:${AZUL};` +
      `display:flex;align-items:center;justify-content:center">${logo(Math.round(lado * ocupa), BRANCO, peso)}</div>`,
    lado,
    lado,
    true,
  );
  favicons.push({ lado, png });
}
writeFileSync(join(APP, "favicon.ico"), empacotarIco(favicons));

const apple = await fotografar(
  `<div id="quadro" style="width:180px;height:180px;background:${AZUL};display:flex;align-items:center;` +
    `justify-content:center">${logo(126, BRANCO, 1.5)}</div>`,
  180,
  180,
  false,
);
writeFileSync(join(APP, "apple-icon.png"), apple);

await pagina.setViewportSize({ width: 1200, height: 630 });
await pagina.setContent(
  `<!doctype html><html><head>` +
    `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@500;700&display=block">` +
    `</head><body style="margin:0">` +
    `<div id="quadro" style="width:1200px;height:630px;box-sizing:border-box;display:flex;flex-direction:column;` +
    `align-items:center;justify-content:center;background:linear-gradient(150deg, ${CABINE}, ${CABINE_PROFUNDA});` +
    `font-family:'Hanken Grotesk';color:${BRANCO};text-align:center">` +
    `<div style="width:208px;height:208px;border-radius:40px;background:${BRANCO};display:flex;align-items:center;` +
    `justify-content:center">${logo(166, CABINE_PROFUNDA, 1.2)}</div>` +
    `<div style="margin-top:44px;font-size:68px;font-weight:700;letter-spacing:-0.02em;line-height:1.05">${NOME}</div>` +
    `<div style="margin-top:16px;font-size:34px;font-weight:500;color:${CABINE_SECUNDARIO}">${DESCRICAO}</div>` +
    `</div></body></html>`,
  { waitUntil: "networkidle" },
);
await pagina.evaluate(() => document.fonts.ready);
const comFonte = await pagina.evaluate(() => document.fonts.check("700 68px 'Hanken Grotesk'"));
if (!comFonte) {
  await navegador.close();
  throw new Error("A Hanken Grotesk não carregou (sem internet?). A prévia do link não foi gerada.");
}
writeFileSync(join(APP, "opengraph-image.png"), await pagina.locator("#quadro").screenshot());
writeFileSync(join(APP, "opengraph-image.alt.txt"), `Logo de ${NOME} — ${DESCRICAO}`);

await navegador.close();
console.log(
  `Marca gerada: favicon.ico (${FAVICON.map((f) => f.lado).join(", ")} px), apple-icon.png (180 px) e ` +
    `opengraph-image.png (1200 × 630), a partir de ${AZUL} e ${CABINE} → ${CABINE_PROFUNDA}.`,
);
