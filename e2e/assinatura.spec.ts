import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SUFIXO, comoPerfil, criarModeloDeContrato, fechar, indiceDoProjeto, rubricar } from "./apoio";

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

/**
 * Pacientes do seed para o código por e-mail, uma por navegador: o e-mail de
 * cada uma é só daquele projeto, e o código lido da pasta é o dela.
 */
const PACIENTES_DO_CODIGO = [
  "c0000000-0000-4000-8000-000000000001",
  "c0000000-0000-4000-8000-000000000003",
  "c0000000-0000-4000-8000-000000000004",
];

/** Onde o servidor local grava os e-mails (`EMAIL_PASTA` do .env.local). */
const PASTA_DE_EMAILS = join(__dirname, ".emails");

/** O código mais recente enviado para o endereço, lido da pasta de e-mails. */
function ultimoCodigo(para: string, depoisDe: number): string | null {
  if (!existsSync(PASTA_DE_EMAILS)) return null;
  const mensagens = readdirSync(PASTA_DE_EMAILS)
    .filter((nome) => nome.endsWith(".json"))
    .map((nome) => JSON.parse(readFileSync(join(PASTA_DE_EMAILS, nome), "utf8")) as { para: string; texto: string; em: string })
    .filter((mensagem) => mensagem.para === para && Date.parse(mensagem.em) >= depoisDe)
    .sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
  return /\b(\d{6})\b/.exec(mensagens[0]?.texto ?? "")?.[1] ?? null;
}

test.describe("documentos e assinatura por link", () => {
  test("modelo → emissão → link → paciente assina de fora do sistema", async ({ browser, page }) => {
    const nomeModelo = `Contrato E2E ${SUFIXO}`;
    await criarModeloDeContrato(browser, nomeModelo);

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
    await expect(page.getByText("Lido até o fim")).toBeVisible();

    // Leitura primeiro; a assinatura é a etapa seguinte.
    await page.getByRole("button", { name: /Continuar para assinar/ }).click();
    await page.getByLabel("Nome completo").fill("Beatriz Nogueira");
    await rubricar(page);
    await page.getByLabel(/Li o documento por inteiro/).check();
    await page.getByRole("button", { name: "Assinar documento" }).click();

    await expect(page.getByText("Assinatura registrada")).toBeVisible();
    await expect(page.getByText("Beatriz Nogueira").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Salvar/ })).toBeVisible();
    // A forma impressa vem do canal gravado pelo banco (0027): pelo link, à distância.
    await expect(page.getByText(/Assinatura eletrônica simples, à distância/)).toBeVisible();
    // A via traz a rubrica, o código de verificação e o QR dele.
    await expect(page.getByRole("img", { name: "Rubrica de quem assinou" })).toBeVisible();
    const codigo = (await page.locator(".folha").getByText(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/).textContent())?.trim() ?? "";
    expect(codigo).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    await expect(page.getByRole("link", { name: /Conferir autenticidade/ })).toHaveAttribute("href", new RegExp(`/verificar/${codigo}$`));
    await expect(page.locator(".folha svg path").nth(1)).toBeAttached();

    // Qualquer pessoa confere a via pelo código, sem ver o documento.
    const verificacao = await browser.newPage();
    await verificacao.goto(`/verificar/${codigo.toLowerCase()}`);
    await expect(verificacao.getByRole("heading", { name: "Assinatura autêntica" })).toBeVisible();
    await expect(verificacao.getByText("B. N.")).toBeVisible();
    await expect(verificacao.getByText("Eu, paciente, concordo")).toHaveCount(0);
    await verificacao.close();

    // Na clínica, o documento aparece assinado, com as evidências.
    const conferencia = await comoPerfil(browser, "recepcao");
    await conferencia.goto(documento);
    await expect(conferencia.getByText(/Assinado/).first()).toBeVisible();
    await expect(conferencia.getByRole("img", { name: "Rubrica de quem assinou" })).toBeVisible();
    await expect(conferencia.getByRole("link", { name: new RegExp(codigo) })).toBeVisible();

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

  test("código por e-mail: data, código, leitura e assinatura pelo nome", async ({ browser, page }) => {
    const indice = indiceDoProjeto();
    const paciente = PACIENTES_DO_CODIGO[indice % PACIENTES_DO_CODIGO.length];
    const email = `e2e-assinatura-${indice}@cockpit.local`;
    const nomeModelo = `Contrato código ${SUFIXO}`;
    await criarModeloDeContrato(browser, nomeModelo);

    const recepcao = await comoPerfil(browser, "recepcao");
    await recepcao.goto(`/pacientes/${paciente}/editar`);
    const nascimento = await recepcao.getByLabel("Data de nascimento").inputValue();
    await recepcao.getByLabel("E-mail").fill(email);
    await recepcao.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(recepcao).toHaveURL(new RegExp(`/pacientes/${paciente}$`));

    await recepcao.goto(`/formularios/novo?paciente=${paciente}`);
    await recepcao.getByLabel("Modelo").selectOption({ label: `Contrato · ${nomeModelo} (v1)` });
    await recepcao.getByRole("button", { name: "Emitir e congelar o texto" }).click();
    await expect(recepcao).toHaveURL(/\/formularios\/[0-9a-f-]{36}$/);

    // Com e-mail na ficha e envio configurado, a opção mais segura vem marcada.
    await expect(recepcao.getByRole("radio", { name: /Data \+ código por e-mail/ })).toBeChecked();
    await recepcao.getByRole("button", { name: "Gerar link" }).click();
    const campoLink = recepcao.getByLabel("Endereço do link de assinatura");
    await expect(campoLink).toHaveValue(/\/assinar\//);
    const endereco = await campoLink.inputValue();
    await fechar(recepcao);

    const antes = Date.now() - 1000;
    await page.goto(endereco);
    await page.getByLabel("Sua data de nascimento").fill(nascimento);
    await page.getByRole("button", { name: /Continuar/ }).click();
    await expect(page.getByRole("heading", { name: "Digite o código do e-mail" })).toBeVisible();

    let codigo: string | null = null;
    await expect.poll(() => (codigo = ultimoCodigo(email, antes)), { timeout: 10_000 }).not.toBeNull();

    // Código errado não abre.
    const errado = String((Number(codigo) + 1) % 1_000_000).padStart(6, "0");
    await page.getByLabel("Código de verificação").fill(errado);
    await page.getByRole("button", { name: /Confirmar código/ }).click();
    await expect(page.getByText(/Código incorreto/)).toBeVisible();

    await page.getByLabel("Código de verificação").fill(codigo ?? "");
    await page.getByRole("button", { name: /Confirmar código/ }).click();
    await expect(page.getByText("Eu, paciente, concordo com o procedimento descrito.")).toBeVisible();

    await page.getByRole("button", { name: /Continuar para assinar/ }).click();
    await page.getByLabel("Nome completo").fill("Paciente do Teste");
    // A alternativa acessível: assinar só pelo nome, sem desenhar.
    await page.getByLabel(/assinar só com o nome digitado/).check();
    await page.getByLabel(/Li o documento por inteiro/).check();
    await page.getByRole("button", { name: "Assinar documento" }).click();

    await expect(page.getByText("Assinatura registrada")).toBeVisible();
    await expect(page.locator(".folha").getByText("Código por e-mail confirmado")).toBeVisible();
    await expect(page.locator(".folha").getByText("Assinou pelo nome digitado")).toBeVisible();
  });
});
