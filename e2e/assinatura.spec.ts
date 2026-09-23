import { expect, test } from "@playwright/test";
import { SUFIXO, comoPerfil, fechar } from "./apoio";

/**
 * Assinatura por link — o único fluxo que a paciente faz sozinha, de fora do
 * sistema, quase sempre no celular. Por isso roda obrigatoriamente no WebKit
 * (o motor do Safari e de todo navegador no iPhone), em desktop e em celular,
 * além do Chromium. Ver os projetos em playwright.config.ts.
 *
 * A paciente usa a `page` do próprio teste: contexto limpo, sem sessão, com o
 * aparelho do projeto (viewport, toque e user agent do iPhone no projeto de
 * celular). A equipe entra por `comoPerfil`.
 */

/** Beatriz Nogueira, do seed local: tem data de nascimento cadastrada. */
const BEATRIZ = "c0000000-0000-4000-8000-000000000002";

test.describe("documentos e assinatura por link", () => {
  test("modelo → emissão → link → paciente assina de fora do sistema", async ({ browser, page }) => {
    const admin = await comoPerfil(browser, "administradora");
    const nomeModelo = `Contrato E2E ${SUFIXO}`;

    await admin.goto("/formularios/modelos/novo");
    await admin.getByLabel("Tipo").selectOption("contrato");
    await admin.getByLabel("Nome").fill(nomeModelo);
    await admin.getByLabel("Texto do documento").fill("Eu, paciente, concordo com o procedimento descrito.");
    await admin.getByRole("button", { name: "Criar modelo" }).click();
    await expect(admin).toHaveURL(/\/formularios\/modelos\/[0-9a-f-]{36}\/editar$/);
    await fechar(admin);

    const recepcao = await comoPerfil(browser, "recepcao");

    // A data de nascimento vem da ficha, não de uma constante: o seed põe o
    // aniversário no dia 11 do mês em que o banco foi resetado, e uma data
    // fixa aqui só passaria no mês em que foi escrita.
    await recepcao.goto(`/pacientes/${BEATRIZ}/editar`);
    const campoNascimento = recepcao.getByLabel("Data de nascimento");
    await expect(campoNascimento).toHaveValue(/^\d{4}-\d{2}-\d{2}$/);
    const nascimento = await campoNascimento.inputValue();

    await recepcao.goto(`/formularios/novo?paciente=${BEATRIZ}`);
    await recepcao.getByLabel("Modelo").selectOption({ label: `Contrato · ${nomeModelo} (v1)` });
    await recepcao.getByRole("button", { name: "Emitir e congelar o texto" }).click();
    await expect(recepcao).toHaveURL(/\/formularios\/[0-9a-f-]{36}$/);

    await recepcao.getByRole("button", { name: "Gerar link" }).click();
    const campoLink = recepcao.getByLabel("Endereço do link de assinatura");
    await expect(campoLink).toHaveValue(/\/assinar\//);
    const endereco = await campoLink.inputValue();
    const documento = recepcao.url();
    await fechar(recepcao);

    // A paciente, sem sessão nenhuma. Uma data que não é a dela é recusada.
    const resposta = await page.goto(endereco);
    // O token está no caminho: a página não vaza o endereço por Referer nem
    // fica em cache compartilhado.
    expect(resposta?.headers()["referrer-policy"]).toBe("no-referrer");
    expect(resposta?.headers()["cache-control"]).toContain("no-store");
    // `bday`: o navegador do celular sugere a data da própria pessoa.
    await expect(page.getByLabel("Sua data de nascimento")).toHaveAttribute("autocomplete", "bday");
    const errada = nascimento.startsWith("2000-") ? "2001-01-01" : "2000-01-01";
    await page.getByLabel("Sua data de nascimento").fill(errada);
    await page.getByRole("button", { name: "Abrir documento" }).click();
    await expect(page.getByText(/A data não confere/)).toBeVisible();

    await page.getByLabel("Sua data de nascimento").fill(nascimento);
    await page.getByRole("button", { name: "Abrir documento" }).click();
    await expect(page.getByText("Eu, paciente, concordo com o procedimento descrito.")).toBeVisible();

    await page.getByLabel("Nome completo").fill("Beatriz Nogueira");
    await page.getByLabel(/Li o documento acima/).check();
    await page.getByRole("button", { name: "Assinar documento" }).click();
    await expect(page.getByText("Beatriz Nogueira").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Salvar/ })).toBeVisible();
    // A forma impressa vem do canal gravado pelo banco (0027): pelo link, à distância.
    await expect(page.getByText(/Assinatura eletrônica simples, à distância/)).toBeVisible();

    // Na clínica, o documento aparece assinado, pelo canal do link.
    const conferencia = await comoPerfil(browser, "recepcao");
    await conferencia.goto(documento);
    await expect(conferencia.getByText(/Assinado/).first()).toBeVisible();

    // Assinar não fecha o link: ele continua abrindo a via em modo leitura.
    // A clínica pode revogá-lo, e daí o mesmo endereço passa a dizer que o
    // link foi cancelado.
    conferencia.once("dialog", (dialogo) => void dialogo.accept());
    const revogar = conferencia.getByRole("button", { name: "Revogar link da via" });
    await revogar.click();
    // Sem link vivo, o cartão da via sai da página (e a frase de sucesso,
    // que mora nele, junto).
    await expect(revogar).toHaveCount(0);
    await fechar(conferencia);

    await page.goto(endereco);
    await expect(page.getByText("Link cancelado").first()).toBeVisible();
    await expect(page.getByLabel("Sua data de nascimento")).toHaveCount(0);
  });

  test("link que não existe diz que é inválido e não mostra formulário", async ({ page }) => {
    await page.goto(`/assinar/nao-existe-${SUFIXO}-xxxxxxxxxxxxxxxxxxxxxxxx`);
    await expect(page.getByText("Link inválido").first()).toBeVisible();
    await expect(page.getByLabel("Sua data de nascimento")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Abrir documento" })).toHaveCount(0);
  });

  // Endereço malformado não pode derrubar a página (URIError no
  // `decodeURIComponent` era um 500) nem chegar ao banco.
  for (const [caso, caminho] of [
    ["percent-encoding quebrado", "/assinar/%E0%A4%A"],
    ["token curto demais", "/assinar/abc"],
  ] as const) {
    test(`${caso}: sem erro 500 e sem formulário`, async ({ page }) => {
      const resposta = await page.goto(caminho);
      const situacao = resposta?.status() ?? 0;
      expect(situacao).toBeLessThan(500);
      // O servidor do Next recusa sozinho, com 400, o caminho que nem se
      // decodifica — antes de a rota rodar. O que passa por ele chega à
      // página e vira "Link inválido".
      if (situacao !== 400) {
        await expect(page.getByText("Link inválido").first()).toBeVisible();
      }
      await expect(page.getByLabel("Sua data de nascimento")).toHaveCount(0);
    });
  }
});
