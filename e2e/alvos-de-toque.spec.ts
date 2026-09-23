import { expect, test, type Page } from "@playwright/test";
import { comoPerfil, fechar } from "./apoio";

/**
 * Link de "voltar" é alvo de toque: no celular (360px) precisa de pelo menos
 * 24px de altura (WCAG 2.5.8). Com `text-sm` a linha tem 20px — por isso os
 * links levam `min-h-6`. Este teste impede que um link novo volte a nascer
 * com 20px.
 */
const LARGURA_CELULAR = { width: 360, height: 800 };
const ALTURA_MINIMA = 24;

async function conferirVoltar(pagina: Page, endereco: string, destino: string): Promise<void> {
  await pagina.goto(endereco);
  const link = pagina.locator(`main a[href="${destino}"]`).first();
  await expect(link).toBeVisible();
  const caixa = await link.boundingBox();
  expect(caixa, `${endereco}: link para ${destino} sem caixa`).not.toBeNull();
  expect(caixa?.height ?? 0, `${endereco}: link para ${destino}`).toBeGreaterThanOrEqual(ALTURA_MINIMA);
}

test.describe("alvo de toque dos links de voltar", () => {
  test("telas sem sessão: voltar para entrar tem 24px em 360px", async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: LARGURA_CELULAR });
    const pagina = await contexto.newPage();
    await conferirVoltar(pagina, "/recuperar-senha", "/entrar");
    await contexto.close();
  });

  test("formulários internos: voltar tem 24px em 360px", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    await pagina.setViewportSize(LARGURA_CELULAR);
    await conferirVoltar(pagina, "/financeiro/vendas/nova", "/financeiro/vendas");
    await conferirVoltar(pagina, "/financeiro/despesas/nova", "/financeiro/despesas");
    await conferirVoltar(pagina, "/configuracoes/procedimentos/novo", "/configuracoes/procedimentos");
    await conferirVoltar(pagina, "/relacionamento/tarefas/nova", "/relacionamento?aba=tarefas");
    await fechar(pagina);
  });
});
