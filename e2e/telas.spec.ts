import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { TELAS_DO_SISTEMA, TELAS_PUBLICAS } from "./apoio";
import { arquivoDaSessao } from "./contas";

/**
 * Toda tela, em três larguras: celular, tablet e desktop.
 *
 * Confere o que dá para conferir sem olho humano — nenhuma rolagem horizontal
 * na página, nenhum erro no console, um `<h1>` e o `<main>` presentes — e
 * guarda a captura em `e2e/capturas/` para a revisão visual.
 *
 * A lista de rotas mora em `apoio.ts` (a mesma do `acessibilidade.spec.ts`).
 * Para rodar só um grupo: `-g "sistema — celular"` ou `-g "público"` — com
 * acento, como está no nome do describe (`-g "publico"` não casa com nada).
 */

const LARGURAS = [
  // 320 px é a largura do critério de refluxo da WCAG (1.4.10): o que não
  // rola na horizontal aqui não rola em celular nenhum.
  { nome: "celular", width: 320, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "desktop", width: 1440, height: 900 },
];

const PASTA = "e2e/capturas";
mkdirSync(PASTA, { recursive: true });

/**
 * `logada` separa a mesma rota aberta com e sem sessão: `/nao-existe` sem
 * sessão é o login, com sessão é a página não encontrada.
 */
function nomeDoArquivo(rota: string, largura: string, logada = false) {
  const limpo = rota.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-$/, "") || "visao-geral";
  const sufixo = logada && rota === "/nao-existe" ? "-logada" : "";
  return `${PASTA}/${limpo}${sufixo}--${largura}.png`;
}

/** A rota inexistente responde 404, e o navegador registra isso no console. */
function semO404Esperado(rota: string, erros: string[]): string[] {
  return rota === "/nao-existe" ? erros.filter((e) => !/404|Not Found/i.test(e)) : erros;
}

async function conferir(pagina: Page, rota: string, largura: string, erros: string[]) {
  await pagina.goto(rota);
  await pagina.waitForLoadState("networkidle");

  // Nada de rolagem horizontal na página inteira. Tabela larga rola dentro
  // do próprio contêiner, nunca empurrando a tela.
  const excesso = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(excesso, `rolagem horizontal de ${excesso}px em ${rota} (${largura})`).toBeLessThanOrEqual(0);

  await expect(pagina.locator("main")).toHaveCount(1);
  await expect(pagina.locator("h1").first()).toBeVisible();

  await pagina.screenshot({ path: nomeDoArquivo(rota, largura, true), fullPage: true });

  expect(semO404Esperado(rota, erros), `erros de console em ${rota} (${largura})`).toEqual([]);
}

function vigiarConsole(pagina: Page): string[] {
  const erros: string[] = [];
  pagina.on("console", (mensagem) => {
    if (mensagem.type() === "error") erros.push(mensagem.text());
  });
  pagina.on("pageerror", (erro) => erros.push(erro.message));
  return erros;
}

for (const { nome, width, height } of LARGURAS) {
  test.describe(`sistema — ${nome}`, () => {
    test.use({ storageState: arquivoDaSessao("administradora"), viewport: { width, height } });

    for (const rota of TELAS_DO_SISTEMA) {
      test(`${rota}`, async ({ page }) => {
        const erros = vigiarConsole(page);
        await conferir(page, rota, nome, erros);
      });
    }
  });

  test.describe(`público — ${nome}`, () => {
    test.use({ viewport: { width, height } });

    for (const rota of TELAS_PUBLICAS) {
      test(`${rota}`, async ({ page }) => {
        const erros = vigiarConsole(page);
        await page.goto(rota);
        await page.waitForLoadState("networkidle");
        const excesso = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(excesso).toBeLessThanOrEqual(0);
        await expect(page.locator("h1").first()).toBeVisible();
        await page.screenshot({ path: nomeDoArquivo(rota, nome), fullPage: true });
        expect(semO404Esperado(rota, erros)).toEqual([]);
      });
    }
  });
}

test.describe("faixa de áreas no celular", () => {
  test.use({ storageState: arquivoDaSessao("administradora"), viewport: { width: 320, height: 800 } });

  // A faixa rola de lado no celular; a área atual precisa abrir à vista, senão
  // a pessoa não sabe em que parte do módulo está.
  for (const [rota, area] of [
    ["/financeiro/fluxo", "Fluxo mensal"],
    ["/financeiro/movimentacoes", "Movimentações"],
    ["/relacionamento?aba=avaliacoes", "Avaliações"],
  ] as const) {
    test(`${rota}: "${area}" aparece sem rolar`, async ({ page }) => {
      await page.goto(rota);
      const atual = page.locator('nav a[aria-current="page"]', { hasText: area });
      await expect(atual).toBeInViewport({ ratio: 1 });
    });
  }
});
