import { defineConfig, devices } from "@playwright/test";

/**
 * Testes de ponta a ponta — SÓ contra o Supabase local.
 *
 * `e2e/preparar.ts` confere o `.env.local` antes de tudo e recusa rodar se a
 * URL do Supabase não for 127.0.0.1/localhost: estes testes cadastram,
 * alteram e assinam de verdade, e nada disso pode acontecer num banco com
 * paciente real.
 *
 * Um navegador só e um teste por vez: os fluxos compartilham o mesmo banco
 * local, e a ordem importa menos do que não pisar um no outro.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "e2e/relatorio" }]],
  globalSetup: "./e2e/preparar.ts",
  use: {
    baseURL: "http://localhost:3000",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/entrar",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
