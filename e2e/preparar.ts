import { chromium, type FullConfig } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SENHA_LOCAL, USUARIOS_LOCAIS, arquivoDaSessao } from "./contas";

/**
 * Antes de qualquer teste:
 *
 * 1. Confere que o app aponta para o Supabase LOCAL. Se o `.env.local`
 *    apontar para outro lugar, para aqui — os testes gravam de verdade.
 * 2. Entra com cada uma das três contas locais pela tela de login e guarda a
 *    sessão, para cada teste já começar logado no perfil que precisa.
 *    As contas existem só no Docker (`npm run local:usuarios`).
 * 3. Só no `next dev` (fora da CI): aquece as telas com o seletor de
 *    paciente. A primeira visita compila a página e a busca; sem isso, o
 *    primeiro teste que digita no seletor gastava o prazo do `expect` na
 *    compilação. No build (CI) não há o que compilar e o passo é pulado.
 */

/** Telas com o seletor de paciente (as que `digitarNoSeletorDePaciente` usa). */
const TELAS_COM_SELETOR = ["/agenda/novo", "/financeiro/vendas/nova", "/prontuarios/novo"];
export default async function preparar(config: FullConfig) {
  const env = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
  const url = /^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m.exec(env)?.[1]?.trim() ?? "";
  const host = url ? new URL(url).hostname : "";
  if (!["127.0.0.1", "localhost"].includes(host)) {
    throw new Error(
      `Os testes E2E só rodam contra o Supabase local. O .env.local aponta para "${host || "nada"}".`,
    );
  }

  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:3000";
  mkdirSync(join(__dirname, ".auth"), { recursive: true });

  const navegador = await chromium.launch();
  try {
    for (const conta of USUARIOS_LOCAIS) {
      const contexto = await navegador.newContext({ baseURL, locale: "pt-BR" });
      const pagina = await contexto.newPage();
      await pagina.goto("/entrar");
      await pagina.getByLabel("E-mail").fill(conta.email);
      await pagina.getByLabel("Senha").fill(SENHA_LOCAL);
      await pagina.getByRole("button", { name: "Entrar" }).click();
      await pagina.waitForURL((u) => !u.pathname.startsWith("/entrar"), { timeout: 60_000 });
      await contexto.storageState({ path: arquivoDaSessao(conta.papel) });
      if (!process.env.CI && conta.papel === "administradora") {
        for (const tela of TELAS_COM_SELETOR) {
          await pagina.goto(tela, { timeout: 120_000 });
          await pagina.getByRole("combobox", { name: /Paciente/ }).fill("Aline");
          await pagina.getByRole("listbox").waitFor({ timeout: 120_000 });
        }
      }
      await contexto.close();
    }
  } finally {
    await navegador.close();
  }
}
