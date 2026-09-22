#!/usr/bin/env node
/**
 * Roda `supabase/testes/permissoes.sql` no Supabase LOCAL.
 *
 * O `supabase db query` não aceita vários comandos num arquivo, então o
 * arquivo vai pelo `psql` do próprio contêiner do banco local — o nome do
 * contêiner sai do `project_id` do `supabase/config.toml`. Nunca toca
 * produção: não existe caminho daqui até um banco remoto.
 *
 * Imprime só a tabela de resultados e sai com código diferente de zero se
 * algum teste falhar.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
const projeto = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1];
if (!projeto) {
  console.error("project_id não encontrado em supabase/config.toml.");
  process.exit(1);
}

const sql = readFileSync(new URL("../supabase/testes/permissoes.sql", import.meta.url), "utf8");

const execucao = spawnSync(
  "docker",
  ["exec", "-i", `supabase_db_${projeto}`, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-P", "pager=off"],
  { input: sql, encoding: "utf8" },
);

if (execucao.error) {
  console.error("Não foi possível chamar o Docker. O Supabase local está no ar (`npx supabase start`)?");
  process.exit(1);
}

// A saída tem uma linha por `select testes.x(...)`; interessa a tabela final.
const saida = execucao.stdout ?? "";
const inicio = saida.search(/^\s*#\s*\|\s*resultado/m);
if (inicio >= 0) process.stdout.write(saida.slice(inicio));

const erros = (execucao.stderr ?? "").trim();
if (erros) console.log(erros.replace(/^psql:[^:]*:\d+:\s*/gm, ""));

process.exit(execucao.status ?? 1);
