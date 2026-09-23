import { expect, test, type Page } from "@playwright/test";
import { join } from "node:path";
import { SUFIXO, comoPerfil, digitarNoSeletorDePaciente, fechar } from "./apoio";

/**
 * A política de segurança de conteúdo (CSP com nonce por requisição, montada
 * em `src/lib/politica-de-conteudo.ts` e enviada pelo middleware) não pode
 * quebrar o que o sistema faz de verdade: foto assinada do Storage, documento,
 * agenda e a troca de senha, que fala com o Supabase direto do navegador.
 *
 * Uma violação de CSP não derruba a página — a imagem só não aparece, a
 * chamada só não sai. Por isso cada página é vigiada pelo evento
 * `securitypolicyviolation` e pelo console ("Refused to …"), e qualquer
 * ocorrência reprova o teste.
 */

const FIXTURES = join(__dirname, "fixtures");

/** Beatriz Nogueira, do seed local (a mesma de assinatura.spec.ts). */
const BEATRIZ = "c0000000-0000-4000-8000-000000000002";

async function vigiarCsp(pagina: Page): Promise<string[]> {
  const violacoes: string[] = [];
  pagina.on("console", (mensagem) => {
    const texto = mensagem.text();
    if (/Content Security Policy|Refused to/i.test(texto)) violacoes.push(texto);
  });
  // O evento do DOM vale nos dois motores e traz a diretiva violada.
  await pagina.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (evento) => {
      console.error(`Refused to (CSP) ${evento.violatedDirective} ${evento.blockedURI}`);
    });
  });
  return violacoes;
}

/** O nonce que a CSP libera em `script-src`. */
function nonceDa(csp: string | undefined): string | undefined {
  return csp?.match(/script-src[^;]*'nonce-([^']+)'/)?.[1];
}

test.describe("política de segurança de conteúdo", () => {
  test("página pública: nonce por requisição em todo script, sem 'unsafe-inline', e hidrata", async ({
    page,
  }) => {
    const violacoes = await vigiarCsp(page);

    const primeira = await page.goto("/entrar");
    const csp = primeira?.headers()["content-security-policy"];
    const nonce = nonceDa(csp);
    expect(nonce, "a CSP da página precisa trazer um nonce").toBeTruthy();
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/);

    // Todo <script> do HTML servido carrega o nonce desta resposta — os do
    // Next inclusive (`self.__next_f.push`). Os pedaços que o runtime pede
    // depois não têm nonce: entram pelo 'strict-dynamic'.
    const html = (await primeira?.text()) ?? "";
    const scripts = html.match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    expect(scripts.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);

    // Hidratou: o React assumiu o formulário (o botão tem o nó do React) —
    // se o script fosse barrado, a tela apareceria, mas nada responderia.
    const botao = page.getByRole("button", { name: "Entrar", exact: true });
    await expect(botao).toBeVisible();
    await expect
      .poll(() => botao.evaluate((el) => Object.keys(el).some((chave) => chave.startsWith("__react"))))
      .toBe(true);

    // Outra visita, outro nonce: um nonce vazado não serve para a próxima.
    const segunda = await page.reload();
    expect(nonceDa(segunda?.headers()["content-security-policy"])).not.toBe(nonce);

    expect(violacoes).toEqual([]);
  });

  test("foto do Storage, documento e agenda abrem sem violação de CSP", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    const violacoes = await vigiarCsp(pagina);
    const legenda = `Foto CSP E2E ${SUFIXO}`;

    // Um prontuário com foto: a imagem vem de URL assinada do Storage.
    await pagina.goto("/prontuarios/novo");
    await digitarNoSeletorDePaciente(pagina, "Daniela");
    await pagina.getByRole("listbox").getByRole("option").first().click();
    await pagina.getByLabel("Título").fill(`Evolução CSP E2E ${SUFIXO}`);
    await pagina.getByLabel("Queixa e anamnese").fill("Registro criado para conferir a CSP no E2E.");
    await pagina.getByRole("button", { name: "Salvar prontuário" }).click();
    await expect(pagina).toHaveURL(/\/prontuarios\/[0-9a-f-]{36}$/);
    await pagina.getByLabel("Legenda").fill(legenda);
    await pagina.getByLabel("Fotos").setInputFiles(join(FIXTURES, "foto-evolucao.png"));
    await pagina.getByRole("button", { name: "Enviar foto" }).click();
    await expect(pagina.getByRole("img", { name: legenda }).first()).toBeVisible();

    // Recarregada, a página pede a foto de novo ao Storage, agora pela URL
    // assinada que o servidor devolveu — e ela precisa carregar de fato.
    await pagina.reload();
    const foto = pagina.getByRole("img", { name: legenda }).first();
    await expect(foto).toBeVisible();
    await expect
      .poll(() => foto.evaluate((img) => (img as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);

    // Um documento emitido aqui mesmo: o seed não traz documento, e pegar
    // "um qualquer da lista" fazia o teste depender de outro arquivo ter
    // rodado antes (num banco recém-resetado, a lista vinha vazia).
    const nomeModelo = `Contrato CSP E2E ${SUFIXO}`;
    await pagina.goto("/formularios/modelos/novo");
    await pagina.getByLabel("Tipo").selectOption("contrato");
    await pagina.getByLabel("Nome").fill(nomeModelo);
    await pagina.getByLabel("Texto do documento").fill("Texto emitido para conferir a CSP no E2E.");
    await pagina.getByRole("button", { name: "Criar modelo" }).click();
    await expect(pagina).toHaveURL(/\/formularios\/modelos\/[0-9a-f-]{36}\/editar$/);
    await pagina.goto(`/formularios/novo?paciente=${BEATRIZ}`);
    await pagina.getByLabel("Modelo").selectOption({ label: `Contrato · ${nomeModelo} (v1)` });
    await pagina.getByRole("button", { name: "Emitir e congelar o texto" }).click();
    await expect(pagina).toHaveURL(/\/formularios\/[0-9a-f-]{36}$/);
    await pagina.reload();
    await expect(pagina.getByRole("heading", { level: 1 })).toBeVisible();

    await pagina.goto("/agenda");
    await expect(pagina.getByRole("heading", { level: 1 })).toBeVisible();

    expect(violacoes).toEqual([]);
    await fechar(pagina);
  });

  test("a troca de senha fala com o Supabase sem ser barrada pelo connect-src", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "financeiro");
    const violacoes = await vigiarCsp(pagina);

    // Com sessão, a tela confere o usuário pelo Auth do Supabase — do
    // navegador, que é exatamente o que o `connect-src` precisa permitir.
    // Nada é enviado: a senha não muda.
    const chamada = pagina.waitForResponse((resposta) => resposta.url().includes("/auth/v1/"));
    await pagina.goto("/redefinir-senha");
    const resposta = await chamada;
    expect(resposta.status()).toBeLessThan(500);

    expect(violacoes).toEqual([]);
    await fechar(pagina);
  });
});
