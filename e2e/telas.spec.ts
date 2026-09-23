import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { arquivoDaSessao } from "./contas";

/**
 * Toda tela, em três larguras: celular, tablet e desktop.
 *
 * Confere o que dá para conferir sem olho humano — nenhuma rolagem horizontal
 * na página, nenhum erro no console, um `<h1>` e o `<main>` presentes — e
 * guarda a captura em `e2e/capturas/` para a revisão visual.
 */

const PACIENTE = "c0000000-0000-4000-8000-000000000001";

const TELAS_DO_SISTEMA = [
  "/",
  "/pacientes",
  `/pacientes/${PACIENTE}`,
  `/pacientes/${PACIENTE}/editar`,
  "/pacientes/novo",
  "/pacientes/importar",
  "/agenda",
  "/agenda/novo",
  "/financeiro",
  "/financeiro/vendas",
  "/financeiro/vendas/nova",
  "/financeiro/despesas",
  "/financeiro/despesas/nova",
  "/financeiro/taxas",
  "/financeiro/taxas/nova",
  "/financeiro/movimentacoes",
  "/financeiro/fluxo",
  "/prontuarios",
  "/prontuarios/novo",
  "/formularios",
  "/formularios/novo",
  "/formularios/modelos",
  "/formularios/modelos/novo",
  "/relacionamento",
  "/relacionamento?aba=retornos",
  "/relacionamento?aba=tarefas",
  "/relacionamento?aba=avaliacoes",
  "/relacionamento/retornos/novo",
  "/relacionamento/tarefas/nova",
  "/busca?q=ana",
  "/configuracoes",
  "/configuracoes/procedimentos",
  "/configuracoes/procedimentos/novo",
  "/relatorios",
];

const TELAS_PUBLICAS = ["/entrar", "/recuperar-senha", "/redefinir-senha", "/assinar/link-que-nao-existe-xxxxxxxxxxxxxxxxxxxxxxxxx", "/nao-existe"];

const LARGURAS = [
  { nome: "celular", width: 360, height: 800 },
  { nome: "tablet", width: 768, height: 1024 },
  { nome: "desktop", width: 1440, height: 900 },
];

const PASTA = "e2e/capturas";
mkdirSync(PASTA, { recursive: true });

function nomeDoArquivo(rota: string, largura: string) {
  const limpo = rota.replace(/^\//, "").replace(/[^a-z0-9]+/gi, "-").replace(/-$/, "") || "visao-geral";
  return `${PASTA}/${limpo}--${largura}.png`;
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

  await pagina.screenshot({ path: nomeDoArquivo(rota, largura), fullPage: true });

  expect(erros, `erros de console em ${rota} (${largura})`).toEqual([]);
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
        // A 404 é esperada no console para a rota inexistente.
        expect(erros.filter((e) => !/404|Not Found/i.test(e))).toEqual([]);
      });
    }
  });
}
