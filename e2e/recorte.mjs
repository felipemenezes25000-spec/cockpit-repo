// Recorte de uma seção da tela, para revisão visual. Uso:
//   node e2e/recorte.mjs <rota> <texto-do-título> <largura> <saída.png> [papel]
// Só roda contra o servidor local, com as sessões de e2e/.auth.
import { chromium } from "@playwright/test";

const [rota, titulo, largura = "360", saida = "e2e/capturas/recorte.png", papel = "administradora"] =
  process.argv.slice(2);

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  baseURL: "http://localhost:3000",
  viewport: { width: Number(largura), height: 900 },
  storageState: `e2e/.auth/${papel}.json`,
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
});
const pagina = await contexto.newPage();
await pagina.goto(rota);
await pagina.waitForLoadState("networkidle");
await pagina.locator("h1").first().waitFor();
if (titulo && titulo !== "-") {
  const alvo = pagina
    .locator("section", { has: pagina.getByRole("heading", { name: titulo, exact: true }) })
    .last();
  await alvo.screenshot({ path: saida });
} else {
  await pagina.screenshot({ path: saida, fullPage: false });
}
await navegador.close();
console.log("ok:", saida);
