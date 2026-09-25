import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { TELAS_DO_SISTEMA, TELAS_PUBLICAS } from "./apoio";
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
