import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { SUFIXO, TELAS_DO_SISTEMA, TELAS_PUBLICAS, comoPerfil, criarModeloDeContrato, fechar, rubricar } from "./apoio";
import { arquivoDaSessao } from "./contas";

/**
 * Auditoria automática de acessibilidade (axe-core) em toda tela.
 *
 * Mesmas rotas do `telas.spec.ts`, em duas larguras: 360 px (celular — o menu
 * vira gaveta, as tabelas viram lista) e 1440 px (desktop, com a barra
 * lateral). As regras são as da WCAG 2.0, 2.1 e 2.2 nos níveis A e AA, que é
 * a meta do sistema (AGENTS.md §7.4). Qualquer violação reprova.
 *
 * Nenhuma regra nem elemento é excluído. Se um dia for preciso (componente de
 * terceiros que não controlamos, por exemplo), a exclusão vai aqui, com o
 * motivo escrito do lado — nunca para fazer o teste passar.
 *
 * O axe só vê o estado da tela como ela abre: erro de formulário, gaveta
 * aberta e diálogo ficam por conta dos specs de fluxo e da revisão manual.
 */

const REGRAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const LARGURAS = [
  { nome: "celular", width: 360, height: 800 },
  { nome: "desktop", width: 1440, height: 900 },
];

/** Uma linha por violação, com os seletores dos elementos, para achar no código. */
function descrever(violacoes: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]): string[] {
  return violacoes.map((v) => {
    const alvos = v.nodes
      .slice(0, 5)
      .map((n) => n.target.join(" "))
      .join(" | ");
    const resto = v.nodes.length > 5 ? ` (+${v.nodes.length - 5})` : "";
    return `[${v.impact ?? "?"}] ${v.id}: ${v.help} -> ${alvos}${resto}`;
  });
}

async function auditar(pagina: Page, rota: string, largura: string) {
  await pagina.goto(rota);
  await pagina.waitForLoadState("networkidle");
  await expect(pagina.locator("h1").first()).toBeVisible();
  // O ponteiro no canto de cima, onde ele começa na CI (Linux): em cima do
  // letreiro de pendências. Sem isto o Windows auditava a tela sem hover e a
  // CI com hover, e um alvo de toque coberto só aparecia lá.
  await pagina.mouse.move(2, 2);

  const resultado = await new AxeBuilder({ page: pagina }).withTags(REGRAS_WCAG).analyze();

  expect(descrever(resultado.violations), `violações de acessibilidade em ${rota} (${largura})`).toEqual([]);
}

for (const { nome, width, height } of LARGURAS) {
  test.describe(`acessibilidade — sistema — ${nome}`, () => {
    test.use({ storageState: arquivoDaSessao("administradora"), viewport: { width, height } });

    for (const rota of TELAS_DO_SISTEMA) {
      test(`${rota}`, async ({ page }) => {
        await auditar(page, rota, nome);
      });
    }
  });

  test.describe(`acessibilidade — público — ${nome}`, () => {
    test.use({ viewport: { width, height } });

    for (const rota of TELAS_PUBLICAS) {
      test(`${rota}`, async ({ page }) => {
        await auditar(page, rota, nome);
      });
    }
  });
}

/**
 * A assinatura por link, etapa por etapa: o axe só vê a tela como ela abre, e
 * as etapas da paciente (leitura, rubrica, via) só existem depois de passar a
 * porta. Celular, que é onde ela assina.
 */
test.describe("acessibilidade — assinatura por link, etapa por etapa", () => {
  test.use({ viewport: { width: 360, height: 800 } });

  async function semViolacoes(pagina: Page, etapa: string) {
    await pagina.mouse.move(2, 2);
    const resultado = await new AxeBuilder({ page: pagina }).withTags(REGRAS_WCAG).analyze();
    expect(descrever(resultado.violations), `violações de acessibilidade na etapa "${etapa}"`).toEqual([]);
  }

  test("porta, leitura, assinatura, via, verificação e ficha", async ({ browser, page }) => {
    const nomeModelo = `Contrato axe ${SUFIXO}`;
    await criarModeloDeContrato(browser, nomeModelo);

    const recepcao = await comoPerfil(browser, "recepcao");
    await recepcao.goto("/pacientes/c0000000-0000-4000-8000-000000000002/editar");
    const nascimento = await recepcao.getByLabel("Data de nascimento").inputValue();
    await recepcao.goto("/formularios/novo?paciente=c0000000-0000-4000-8000-000000000002");
    await recepcao.getByLabel("Modelo").selectOption({ label: `Contrato · ${nomeModelo} (v1)` });
    await recepcao.getByRole("button", { name: "Emitir e congelar o texto" }).click();
    await expect(recepcao).toHaveURL(/\/formularios\/[0-9a-f-]{36}$/);
    const documento = recepcao.url();
    await recepcao.getByRole("button", { name: "Gerar link" }).click();
    const campoLink = recepcao.getByLabel("Endereço do link de assinatura");
    await expect(campoLink).toHaveValue(/\/assinar\//);
    const endereco = await campoLink.inputValue();
    await fechar(recepcao);

    await page.goto(endereco);
    await semViolacoes(page, "porta");

    await page.getByLabel("Sua data de nascimento").fill(nascimento);
    await page.getByRole("button", { name: "Abrir documento" }).click();
    await expect(page.getByRole("button", { name: /Continuar para assinar/ })).toBeVisible();
    await semViolacoes(page, "leitura");

    await page.getByRole("button", { name: /Continuar para assinar/ }).click();
    await page.getByLabel("Nome completo").fill("Beatriz Nogueira");
    await semViolacoes(page, "assinatura");

    await rubricar(page);
    await page.getByLabel(/Li o documento por inteiro/).check();
    await page.getByRole("button", { name: "Assinar documento" }).click();
    await expect(page.getByText("Assinatura registrada")).toBeVisible();
    await semViolacoes(page, "via");

    const codigo = (await page.locator(".folha").getByText(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/).textContent())?.trim();
    await page.goto(`/verificar/${codigo}`);
    await expect(page.getByRole("heading", { name: "Assinatura autêntica" })).toBeVisible();
    await semViolacoes(page, "verificação");

    const ficha = await comoPerfil(browser, "administradora");
    await ficha.setViewportSize({ width: 360, height: 800 });
    await ficha.goto(documento);
    await expect(ficha.getByRole("img", { name: "Rubrica de quem assinou" })).toBeVisible();
    await semViolacoes(ficha, "ficha com as evidências");
    await fechar(ficha);
  });
});
