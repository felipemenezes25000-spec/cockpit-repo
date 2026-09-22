#!/usr/bin/env node
/**
 * Cria as três contas de teste do Supabase LOCAL — uma por perfil — e as
 * libera com o papel certo.
 *
 * Só conversa com o banco local: lê URL e chave de `supabase status`, e se a
 * URL não for 127.0.0.1/localhost, para antes de qualquer requisição. A
 * chave `service_role` do Supabase local é a de demonstração, igual em toda
 * instalação — ela nunca sai desta máquina e não é a de produção.
 *
 * O usuário é criado pela API de administração do Auth, como o
 * supabase/README.md exige: inserir direto em `auth.users` deixa colunas
 * nulas e quebra o login de todo mundo. Papel e liberação vão por SQL, que
 * é o que a administradora faria no painel.
 *
 * Idempotente: rodar de novo só confere e reaplica o papel.
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const contas = JSON.parse(
  readFileSync(new URL("../supabase/usuarios-locais.json", import.meta.url), "utf8"),
);

function statusLocal() {
  const saida = execSync("npx supabase status -o json", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const inicio = saida.indexOf("{");
  if (inicio < 0) throw new Error("O Supabase local não está no ar. Rode `npx supabase start`.");
  return JSON.parse(saida.slice(inicio));
}

function sqlLocal(sql) {
  execSync(`npx supabase db query --local ${JSON.stringify(sql)}`, {
    stdio: ["ignore", "ignore", "inherit"],
  });
}

const status = statusLocal();
const url = new URL(status.API_URL);
if (!["127.0.0.1", "localhost"].includes(url.hostname)) {
  console.error(`Recusado: ${url.origin} não é o Supabase local.`);
  process.exit(1);
}

const chave = status.SERVICE_ROLE_KEY;

for (const conta of contas.usuarios) {
  const resposta = await fetch(`${url.origin}/auth/v1/admin/users`, {
    method: "POST",
    headers: {
      apikey: chave,
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: conta.email,
      password: contas.senha,
      email_confirm: true,
      user_metadata: { nome: conta.nome },
    }),
  });

  if (!resposta.ok && resposta.status !== 422) {
    console.error(`Falha ao criar ${conta.email}: HTTP ${resposta.status}`);
    process.exit(1);
  }

  const email = conta.email.replace(/'/g, "''");
  const nome = conta.nome.replace(/'/g, "''");
  sqlLocal(
    `update public.perfis set ativo = true, papel = '${conta.papel}', nome = '${nome}' ` +
      `where id = (select id from auth.users where email = '${email}');`,
  );

  console.log(`${resposta.status === 422 ? "conferida" : "criada"}: ${conta.email} (${conta.papel})`);
}

console.log(`\nSenha das três contas: ${contas.senha}`);
