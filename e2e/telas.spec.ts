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

/**
 * Abre a rota e espera a página assentar: rede parada e navegador ocioso.
 *
 * Rede parada não quer dizer página hidratada. No `next dev`, com o trace
 * ligado (playwright.config.ts), a /captacao ainda hidrata uns 300 ms depois
 * do `networkidle`. O React hidrata em fatias e agenda a próxima na hora, então
 * o navegador só fica ocioso (`requestIdleCallback`) quando a hidratação
 * acaba: daí em diante o console já disse o que tinha a dizer, e a captura
 * mostra a tela pronta. O prazo é só para uma tela que nunca sossega não
 * travar o teste.
 */
async function abrir(pagina: Page, rota: string) {
  await pagina.goto(rota);
  await pagina.waitForLoadState("networkidle");
  await pagina.evaluate(
    () => new Promise<void>((pronta) => requestIdleCallback(() => pronta(), { timeout: 5_000 })),
  );
}

/**
 * A captura não mexe na página. Para esconder o cursor (`caret: "hide"`, o
 * padrão), o Playwright 1.63 grava `caret-color: transparent !important` no
 * `style` de todo input e textarea e, ao terminar, deixa um `style=""` vazio
 * no lugar: se o React ainda estiver hidratando, acusa o atributo a mais como
 * erro de hidratação. A captura é para revisão visual, não comparação de
 * pixels — o cursor à vista não atrapalha.
 */
const CAPTURA = { fullPage: true, caret: "initial" } as const;

async function conferir(pagina: Page, rota: string, largura: string, erros: string[]) {
  await abrir(pagina, rota);

  // Nada de rolagem horizontal na página inteira. Tabela larga rola dentro
  // do próprio contêiner, nunca empurrando a tela.
  const excesso = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(excesso, `rolagem horizontal de ${excesso}px em ${rota} (${largura})`).toBeLessThanOrEqual(0);

  await expect(pagina.locator("main")).toHaveCount(1);
  await expect(pagina.locator("h1").first()).toBeVisible();

  await pagina.screenshot({ ...CAPTURA, path: nomeDoArquivo(rota, largura, true) });

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
        await abrir(page, rota);
        const excesso = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(excesso).toBeLessThanOrEqual(0);
        await expect(page.locator("h1").first()).toBeVisible();
        await page.screenshot({ ...CAPTURA, path: nomeDoArquivo(rota, nome) });
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
