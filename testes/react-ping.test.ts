import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nextJaCorrigido, TROCAS } from "../scripts/corrigir-ping-react.mjs";

/**
 * O React empacotado no Next 15.5.x perde o "ping" de uma transição suspensa
 * quando ele chega durante o render, e a tela deixa de aplicar o
 * `router.refresh()` e a revalidação de uma ação (build de produção,
 * Chromium, rota com `loading.tsx`). `scripts/corrigir-ping-react.mjs`, no
 * `postinstall`, troca a linha. Este teste reprova se, por qualquer motivo
 * (install sem scripts, Next atualizado para uma versão com outro formato),
 * o React que vai para o navegador estiver sem a correção.
 *
 * Não basta o defeito ter sumido: se o Next reformatar a linha, o texto velho
 * some sem que a correção entre. Por isso, enquanto o Next for < 16.3, o
 * teste exige a forma corrigida exata (`TROCAS[n].novo`, a mesma que o
 * script grava). No 16.3 em diante a correção vem do próprio React.
 */
const COMPILADO = join(process.cwd(), "node_modules", "next", "dist", "compiled");

const DEFEITO_PRODUCAO = "0 === (executionContext & 2) && prepareFreshStack(root, 0)";
const DEFEITO_DESENVOLVIMENTO = "(executionContext & RenderContext) === NoContext &&\n            prepareFreshStack(root, 0)";

const VERSAO_NEXT: string = JSON.parse(
  readFileSync(join(process.cwd(), "node_modules", "next", "package.json"), "utf8"),
).version;

/** Arquivo e a forma corrigida que ele deve ter (0 = produção, 1 = desenvolvimento). */
const ARQUIVOS = [
  ["react-dom", "react-dom-client.production.js", 0],
  ["react-dom", "react-dom-client.development.js", 1],
  ["react-dom-experimental", "react-dom-client.production.js", 0],
] as const;

describe("React empacotado pelo Next — ping durante o render", () => {
  it("reconhece a versão do Next que já traz a correção", () => {
    expect(nextJaCorrigido("15.5.26")).toBe(false);
    expect(nextJaCorrigido("16.2.9")).toBe(false);
    expect(nextJaCorrigido("16.3.0")).toBe(true);
    expect(nextJaCorrigido("17.0.0")).toBe(true);
  });

  for (const [pacote, nome, forma] of ARQUIVOS) {
    it(`${pacote}/${nome} anota o ping que chega no meio do render`, () => {
      const caminho = join(COMPILADO, pacote, "cjs", nome);
      expect(existsSync(caminho)).toBe(true);
      const texto = readFileSync(caminho, "utf8");

      expect(texto).toContain("function pingSuspendedRoot");
      expect(texto).not.toContain(DEFEITO_PRODUCAO);
      expect(texto).not.toContain(DEFEITO_DESENVOLVIMENTO);
      if (!nextJaCorrigido(VERSAO_NEXT)) {
        expect(texto).toContain(TROCAS[forma].novo);
      }
    });
  }
});
