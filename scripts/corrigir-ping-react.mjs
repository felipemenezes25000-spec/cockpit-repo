/**
 * Corrige, no React que o Next 15.5.x traz empacotado, o "ping" perdido
 * durante o render (`pingSuspendedRoot`).
 *
 * O defeito: um thenable que se resolve DENTRO do render de uma transição
 * suspensa (raiz em RootSuspendedWithDelay — o caso de um `router.refresh()`
 * ou da revalidação de uma server action numa rota com `loading.tsx`) não era
 * anotado em `workInProgressRootPingedLanes`. A faixa ficava suspensa sem
 * ninguém para acordá-la, e a tela seguia na versão anterior embora o RSC
 * novo já tivesse chegado. Só aparece no build de produção, no Chromium, com
 * página lenta e lista grande — por isso passava no `next dev` e no WebKit.
 *
 * Provado por bisseção num app Next puro: ok até o 15.4.11, quebrado do
 * 15.5.0 ao 16.2.x, corrigido no 16.3.0, cujo React tem exatamente esta
 * linha. Roda no `postinstall` (CI e Vercel). É idempotente e avisa quando o
 * formato não bate — o que é esperado ao subir para o Next >= 16.3, quando
 * este script pode ser apagado. `testes/react-ping.test.ts` reprova o build
 * se a correção não estiver aplicada.
 *
 * Enquanto o Next for < 16.3, formato inesperado é falha (código de saída 1):
 * sem a troca o defeito segue no React, e um aviso no meio do install passa
 * despercebido.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = join(process.cwd(), "node_modules", "next", "dist", "compiled");

export const TROCAS = [
  {
    // Produção e profiling (a forma que o build do React gera).
    velho:
      "      ? 0 === (executionContext & 2) && prepareFreshStack(root, 0)\n      : (workInProgressRootPingedLanes |= pingedLanes),",
    novo:
      "      ? 0 === (executionContext & 2)\n        ? prepareFreshStack(root, 0)\n        : (workInProgressRootPingedLanes |= pingedLanes)\n      : (workInProgressRootPingedLanes |= pingedLanes),",
  },
  {
    // Desenvolvimento.
    velho:
      "          ? (executionContext & RenderContext) === NoContext &&\n            prepareFreshStack(root, 0)\n          : (workInProgressRootPingedLanes |= pingedLanes),",
    novo:
      "          ? (executionContext & RenderContext) === NoContext\n            ? prepareFreshStack(root, 0)\n            : (workInProgressRootPingedLanes |= pingedLanes)\n          : (workInProgressRootPingedLanes |= pingedLanes),",
  },
];

const ARQUIVOS = [
  "react-dom-client.production.js",
  "react-dom-profiling.profiling.js",
  "react-dom-client.development.js",
  "react-dom-profiling.development.js",
];

/** Next >= 16.3 já traz a correção no React empacotado. */
export function nextJaCorrigido(versao) {
  const [maior, menor] = versao.split(".").map(Number);
  return maior > 16 || (maior === 16 && menor >= 3);
}

function corrigir() {
  let aplicados = 0;
  let jaCorrigidos = 0;
  const fora = [];

  for (const pacote of ["react-dom", "react-dom-experimental"]) {
    for (const nome of ARQUIVOS) {
      const caminho = join(BASE, pacote, "cjs", nome);
      if (!existsSync(caminho)) continue;
      const texto = readFileSync(caminho, "utf8");
      if (!texto.includes("function pingSuspendedRoot")) continue;

      const troca = TROCAS.find((t) => texto.includes(t.velho));
      if (troca) {
        writeFileSync(caminho, texto.replace(troca.velho, troca.novo));
        aplicados++;
      } else if (TROCAS.some((t) => texto.includes(t.novo))) {
        jaCorrigidos++;
      } else {
        fora.push(`${pacote}/${nome}`);
      }
    }
  }

  console.log(`corrigir-ping-react: ${aplicados} aplicado(s), ${jaCorrigidos} já corrigido(s)`);
  if (fora.length) {
    const versao = JSON.parse(readFileSync(join(process.cwd(), "node_modules", "next", "package.json"), "utf8")).version;
    if (nextJaCorrigido(versao)) {
      console.warn(
        `corrigir-ping-react: Next ${versao} já traz a correção (formato novo em ${fora.join(", ")}); este script pode sair.`,
      );
    } else {
      console.error(
        `corrigir-ping-react: formato inesperado em ${fora.join(", ")} no Next ${versao} — a correção NÃO foi aplicada. Atualize TROCAS para o formato novo.`,
      );
      process.exitCode = 1;
    }
  }
}

// Só corrige quando chamado pelo `node` (postinstall); importado pelo teste,
// entrega TROCAS e nextJaCorrigido sem mexer em arquivo nenhum.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  corrigir();
}
