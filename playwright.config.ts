import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta — SÓ contra o Supabase local.
 *
 * `e2e/preparar.ts` confere o `.env.local` antes de tudo e recusa rodar se a
 * URL do Supabase não for 127.0.0.1/localhost: estes testes cadastram,
 * alteram e assinam de verdade, e nada disso pode acontecer num banco com
 * paciente real.
 *
 * Um teste por vez: os fluxos compartilham o mesmo banco local, e a ordem
 * importa menos do que não pisar um no outro. Os projetos rodam em sequência.
 *
 * Três projetos, com critério:
 * - `chromium`: tudo, inclusive `telas.spec.ts` (41 endereços em 3 larguras,
 *   com captura para revisão visual — a captura é por tela, não por motor) e
 *   `acessibilidade.spec.ts` (axe nos mesmos endereços, em 360 e 1440 px).
 * - `webkit` (Safari desktop): todos os fluxos funcionais. É onde diferença de
 *   motor quebra de verdade — formulário, data, upload, cookie de sessão.
 *   Ficam fora só `telas.spec.ts`, que dobraria o tempo para repetir a mesma
 *   conferência de layout e sobrescreveria as capturas do Chromium, e
 *   `acessibilidade.spec.ts`, que audita o DOM e o CSS da página (a árvore é
 *   a mesma nos dois motores).
 * - `webkit-celular` (iPhone): a assinatura por link, que a paciente faz
 *   sozinha e quase sempre pelo celular. Obrigatória no WebKit.
 *
 * Um projeto só: `npx playwright test --project=webkit`.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // Na CI, sem repetição automática: teste que só passa na segunda é defeito
  // a investigar, não ruído a esconder. O relatório HTML vira artefato.
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [["github"], ["list"], ["html", { open: "never", outputFolder: "e2e/relatorio" }]]
    : [["list"], ["html", { open: "never", outputFolder: "e2e/relatorio" }]],
  globalSetup: "./e2e/preparar.ts",
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    // Trace e captura só ficam quando o teste falha.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
      testIgnore: /(telas|acessibilidade)\.spec\.ts$/,
    },
    {
      name: "webkit-celular",
      use: { ...devices["iPhone 13"] },
      testMatch: /assinatura\.spec\.ts$/,
    },
  ],
  // Local: o dev de sempre (reaproveitado se já estiver no ar). Na CI, o
  // servidor de produção sobre o build feito num passo anterior do job: o dev
  // compila cada rota na primeira visita, e esse tempo caía dentro do prazo
  // das asserções (envio → redirect para uma rota ainda não compilada).
  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/entrar",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
