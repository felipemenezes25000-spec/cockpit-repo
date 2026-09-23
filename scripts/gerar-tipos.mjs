#!/usr/bin/env node
/**
 * Regenera `src/lib/supabase/tipos-banco.ts` sem o risco de apagá-lo.
 *
 *   node scripts/gerar-tipos.mjs --local    # a partir do Supabase local
 *   node scripts/gerar-tipos.mjs --linked   # a partir do projeto linkado (produção)
 *
 * O script antigo era `supabase gen types ... > arquivo`: o `>` esvazia o
 * arquivo ANTES de o comando rodar, e o CLI escreve o erro no stdout. Sem
 * link, sem rede ou com a sessão vencida, 1.900 linhas de tipos viravam uma
 * linha `{"_tag":"Error",...}` e o typecheck explodia no repositório inteiro
 * (AGENTS.md §2). Aqui a saída vai para a memória, é conferida, e só então
 * substitui o arquivo.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { garantirVersaoPostgrest } from "./versao-postgrest.mjs";

const alvo = process.argv.includes("--local") ? "--local" : process.argv.includes("--linked") ? "--linked" : null;
if (!alvo) {
  console.error("Diga de onde: --local (Docker) ou --linked (projeto de produção).");
  process.exit(1);
}

const destino = new URL("../src/lib/supabase/tipos-banco.ts", import.meta.url);

let saida;
try {
  saida = execFileSync("npx", ["supabase", "gen", "types", "typescript", alvo, "--schema", "public"], {
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "inherit"],
  });
} catch {
  console.error("O Supabase CLI falhou. tipos-banco.ts não foi tocado.");
  process.exit(1);
}

if (!saida.includes("export type Database") || saida.trimStart().startsWith("{")) {
  console.error("A saída não parece o arquivo de tipos. tipos-banco.ts não foi tocado:\n");
  console.error(saida.slice(0, 500));
  process.exit(1);
}

// O `--local` não traz o `__InternalSupabase`; sem ele o cliente vira PostgREST 12.
saida = garantirVersaoPostgrest(saida);

const atual = readFileSync(destino, "utf8");
if (atual === saida) {
  console.log("tipos-banco.ts já está em dia.");
} else {
  writeFileSync(destino, saida);
  console.log("tipos-banco.ts regenerado. Confira o `git diff` antes de comitar.");
}
