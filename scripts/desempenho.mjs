#!/usr/bin/env node
/**
 * Medição de desempenho do Cockpit — orçamento de JavaScript e carga leve.
 *
 * Dois modos, que não se misturam:
 *
 *   node scripts/desempenho.mjs orcamento <build.log>
 *     Lê a tabela que o `next build` imprime ("Route (app) ... First Load JS")
 *     e compara o First Load JS de cada rota com o ORÇAMENTO abaixo. Sai com
 *     código 1 se alguma rota estourar. O log vem de `npm run build > build.log`
 *     — rodado numa cópia do repositório, nunca no `.next` do dev server.
 *
 *   node scripts/desempenho.mjs carga [--base http://localhost:3100]
 *        [--sessao e2e/.auth/administradora.json] [--n 200] [--c 10]
 *        [--rota /x ...]
 *     Dispara `n` requisições por rota, `c` de cada vez, contra um
 *     `next start` JÁ de pé (produção; medir `next dev` mede o compilador, não
 *     a aplicação) e imprime TTFB e tempo total (p50/p95/máx). As rotas
 *     públicas vão sem cookie; as internas vão com o cookie de sessão do
 *     arquivo de `--sessao` (o storageState que o Playwright grava). Rota
 *     interna que responde redirecionando para /entrar é erro: mediria a tela
 *     de login, não a rota.
 *
 *     No Git Bash, `--rota /` vira caminho do Windows: rode com
 *     `MSYS_NO_PATHCONV=1` (ou pelo PowerShell).
 *
 * Só leitura: GET em telas, sem enviar formulário nem tocar no banco além do
 * que a própria tela lê. Use contra o Supabase LOCAL.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

/**
 * Orçamento medido em 2026-09-23 (Next 15.5.26, build de produção, Supabase
 * local no Docker do Windows). Serve de trava contra regressão: o número de
 * hoje passa com folga; crescer além do teto pede explicação.
 *
 * JS (First Load, em kB, como o `next build` imprime): a base compartilhada
 * mede 102 kB e quase toda rota fica entre 103 e 121 kB. A exceção leva o
 * cliente do Supabase de navegador (~70 kB) porque precisa dele na abertura:
 * /redefinir-senha troca o código do link de recuperação por sessão no
 * navegador. /prontuarios/[id], que envia fotos direto ao Storage, carrega
 * esse cliente só no envio (import dinâmico em `enviar-fotos.tsx`) e caiu de
 * 185 para 116 kB — voltou para o teto comum.
 *
 * TTFB (p95, em ms, carga padrão: 200 requisições, 10 simultâneas): telas
 * públicas medem ~50 ms; as internas, ~900–1170 ms, dominadas por duas idas
 * ao Auth por requisição (`getUser` no middleware e em `usuarioAtual`). O
 * GoTrue local responde ~27 req/s com 10 simultâneas, e o PostgREST ~1300.
 */
export const ORCAMENTO = {
  /** Teto para o JS compartilhado por todas as rotas. */
  compartilhadoKb: 110,
  /** Teto para qualquer rota fora das exceções. */
  rotaKb: 130,
  /**
   * Rotas acima do teto comum, cada uma com o motivo: /redefinir-senha
   * carrega o cliente do Supabase na abertura (ver acima); /captacao leva a
   * camada de botões do funil 3D (exceção visual do dono, AGENTS §7.3), que
   * precisa vir renderizada do servidor — o desenho em si já vem num pedaço
   * à parte (next/dynamic). Mediu 131 kB em 25/09/2026.
   */
  excecoesKb: {
    "/redefinir-senha": 190,
    "/captacao": 135,
  },
  /** Teto de TTFB p95 para as telas públicas (sem sessão), em ms. */
  ttfbPublicaP95Ms: 150,
  /** Teto de TTFB p95 para as telas internas (com sessão), em ms. */
  ttfbInternaP95Ms: 1500,
};

/** Teto de First Load JS de uma rota. */
export function tetoDaRota(rota) {
  return ORCAMENTO.excecoesKb[rota] ?? ORCAMENTO.rotaKb;
}

const ROTAS_PUBLICAS = ["/entrar", "/assinar/00000000-0000-0000-0000-000000000000"];
const ROTAS_INTERNAS = ["/", "/agenda", "/pacientes", "/financeiro"];

// ---------------------------------------------------------------- orçamento

/** Converte "123 kB", "1.2 MB" ou "900 B" para kB. */
export function paraKb(valor, unidade) {
  const n = Number(valor);
  if (unidade === "MB") return n * 1024;
  if (unidade === "B") return n / 1024;
  return n;
}

/**
 * Extrai da saída do `next build` o First Load JS de cada rota e o total
 * compartilhado. Linhas de rota: "├ ƒ /agenda   4.1 kB   128 kB".
 */
export function lerTabelaDoBuild(texto) {
  const limpo = texto.replace(/\x1b\[[0-9;]*m/g, "");
  const rotas = [];
  let compartilhadoKb = null;
  for (const linha of limpo.split(/\r?\n/)) {
    const rota = linha.match(
      /^[\s│├└┌]*[ƒ○●◐λ]\s+(\S+)\s+([\d.]+)\s+(k?B|MB)\s+([\d.]+)\s+(k?B|MB)\s*$/,
    );
    if (rota) {
      rotas.push({ rota: rota[1], kb: paraKb(rota[4], rota[5]) });
      continue;
    }
    const comp = linha.match(/First Load JS shared by all\s+([\d.]+)\s+(k?B|MB)/);
    if (comp) compartilhadoKb = paraKb(comp[1], comp[2]);
  }
  return { rotas, compartilhadoKb };
}

function modoOrcamento(caminho) {
  if (!caminho) throw new Error("Informe o log do build: desempenho.mjs orcamento <build.log>");
  const { rotas, compartilhadoKb } = lerTabelaDoBuild(readFileSync(caminho, "utf8"));
  if (rotas.length === 0) throw new Error("Nenhuma rota na tabela do build — o log está completo?");

  let estouros = 0;
  console.log(`JS compartilhado: ${compartilhadoKb ?? "?"} kB (teto ${ORCAMENTO.compartilhadoKb} kB)`);
  if (compartilhadoKb !== null && compartilhadoKb > ORCAMENTO.compartilhadoKb) estouros += 1;

  for (const { rota, kb } of [...rotas].sort((a, b) => b.kb - a.kb)) {
    const teto = tetoDaRota(rota);
    const passou = kb <= teto;
    if (!passou) estouros += 1;
    console.log(`${passou ? "ok     " : "ESTOURO"} ${String(kb.toFixed(1)).padStart(7)} kB  (teto ${teto})  ${rota}`);
  }
  console.log(
    `\n${rotas.length} rotas; teto ${ORCAMENTO.rotaKb} kB por rota (exceções: ` +
      `${Object.keys(ORCAMENTO.excecoesKb).join(", ")}); ${estouros} estouro(s).`,
  );
  return estouros === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- carga

/** Percentil por posição (nearest-rank) de uma lista já ordenada. */
export function percentil(ordenada, p) {
  if (ordenada.length === 0) return 0;
  const i = Math.min(ordenada.length - 1, Math.max(0, Math.ceil((p / 100) * ordenada.length) - 1));
  return ordenada[i];
}

/** Monta o cabeçalho Cookie a partir do storageState do Playwright. */
export function cookieDaSessao(caminho, host) {
  const estado = JSON.parse(readFileSync(caminho, "utf8"));
  return (estado.cookies ?? [])
    .filter((c) => c.name.startsWith("sb-") && (c.domain === host || c.domain === `.${host}`))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/**
 * Faz uma requisição de aquecimento e devolve o cookie atualizado: se o
 * token de acesso venceu, o middleware renova a sessão e manda o cookie novo
 * — sem isso, cada requisição da carga tentaria renovar com o mesmo refresh
 * token e mediria o Auth, não a tela.
 */
async function aquecer(base, rota, cookie) {
  const r = await fetch(base + rota, { redirect: "manual", headers: cookie ? { cookie } : {} });
  await r.arrayBuffer();
  const novos = r.headers.getSetCookie?.() ?? [];
  if (!cookie || novos.length === 0) return { cookie, status: r.status, local: r.headers.get("location") };
  const pote = new Map(cookie.split("; ").map((par) => [par.slice(0, par.indexOf("=")), par.slice(par.indexOf("=") + 1)]));
  for (const linha of novos) {
    const [par] = linha.split(";");
    const nome = par.slice(0, par.indexOf("="));
    const valor = par.slice(par.indexOf("=") + 1);
    if (/max-age=0/i.test(linha) || valor === "") pote.delete(nome);
    else pote.set(nome, valor);
  }
  return {
    cookie: [...pote].map(([n, v]) => `${n}=${v}`).join("; "),
    status: r.status,
    local: r.headers.get("location"),
  };
}

async function medirRota(base, rota, { n, c, cookie }) {
  const ttfb = [];
  const total = [];
  const status = new Map();
  let proxima = 0;
  const inicio = performance.now();

  async function trabalhador() {
    while (proxima < n) {
      proxima += 1;
      const t0 = performance.now();
      const r = await fetch(base + rota, { redirect: "manual", headers: cookie ? { cookie } : {} });
      const t1 = performance.now();
      await r.arrayBuffer();
      const t2 = performance.now();
      ttfb.push(t1 - t0);
      total.push(t2 - t0);
      status.set(r.status, (status.get(r.status) ?? 0) + 1);
    }
  }
  await Promise.all(Array.from({ length: c }, trabalhador));
  const segundos = (performance.now() - inicio) / 1000;

  ttfb.sort((a, b) => a - b);
  total.sort((a, b) => a - b);
  return {
    rota,
    n: ttfb.length,
    rps: Math.round((ttfb.length / segundos) * 10) / 10,
    ttfbP50: Math.round(percentil(ttfb, 50)),
    ttfbP95: Math.round(percentil(ttfb, 95)),
    totalP95: Math.round(percentil(total, 95)),
    max: Math.round(total[total.length - 1] ?? 0),
    status: Object.fromEntries(status),
  };
}

function argumento(args, nome, padrao) {
  const i = args.indexOf(nome);
  return i >= 0 && args[i + 1] ? args[i + 1] : padrao;
}

async function modoCarga(args) {
  const base = argumento(args, "--base", "http://localhost:3100").replace(/\/$/, "");
  const sessao = argumento(args, "--sessao", "e2e/.auth/administradora.json");
  const n = Number(argumento(args, "--n", "200"));
  const c = Number(argumento(args, "--c", "10"));
  const escolhidas = args.flatMap((a, i) => (args[i - 1] === "--rota" ? [a] : []));

  const host = new URL(base).hostname;
  let cookie = cookieDaSessao(sessao, host);
  if (!cookie) throw new Error(`Nenhum cookie sb-* para ${host} em ${sessao}.`);

  const publicas = escolhidas.length ? escolhidas.filter((r) => ROTAS_PUBLICAS.includes(r)) : ROTAS_PUBLICAS;
  const internas = escolhidas.length ? escolhidas.filter((r) => !ROTAS_PUBLICAS.includes(r)) : ROTAS_INTERNAS;

  // Aquecimento: compila nada (é produção), mas enche caches do Node e
  // renova a sessão se preciso. Uma rota interna que manda para /entrar
  // significa sessão vencida — medir assim seria medir a tela de login.
  for (const rota of publicas) await aquecer(base, rota, "");
  for (const rota of internas) {
    const r = await aquecer(base, rota, cookie);
    cookie = r.cookie;
    if (r.status >= 300 && r.status < 400 && String(r.local).includes("/entrar")) {
      throw new Error(`${rota} redirecionou para /entrar: a sessão de ${sessao} venceu. Rode o setup do Playwright de novo.`);
    }
  }

  console.log(`Carga: ${n} requisições por rota, ${c} simultâneas, contra ${base}\n`);
  const resultados = [];
  for (const rota of publicas) {
    resultados.push({ ...(await medirRota(base, rota, { n, c, cookie: "" })), teto: ORCAMENTO.ttfbPublicaP95Ms });
  }
  for (const rota of internas) {
    resultados.push({ ...(await medirRota(base, rota, { n, c, cookie })), teto: ORCAMENTO.ttfbInternaP95Ms });
  }

  let estouros = 0;
  for (const r of resultados) {
    const passou = r.ttfbP95 <= r.teto;
    if (!passou) estouros += 1;
    console.log(
      `${passou ? "ok     " : "ESTOURO"} ${r.rota.padEnd(48)} TTFB p50 ${String(r.ttfbP50).padStart(5)} ms` +
        `  p95 ${String(r.ttfbP95).padStart(5)} ms  total p95 ${String(r.totalP95).padStart(5)} ms` +
        `  máx ${String(r.max).padStart(5)} ms  ${String(r.rps).padStart(6)} req/s  ${JSON.stringify(r.status)}`,
    );
  }
  console.log(
    `\nTeto de TTFB p95: ${ORCAMENTO.ttfbPublicaP95Ms} ms (públicas), ${ORCAMENTO.ttfbInternaP95Ms} ms (internas); ` +
      `${estouros} estouro(s). O teto vale para a carga padrão (--n 200 --c 10).`,
  );
  return estouros === 0 ? 0 : 1;
}

// ---------------------------------------------------------------- entrada

// Importado por teste, não roda nada: só as funções exportadas interessam.
const chamadoDireto = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (chamadoDireto) {
  const [modo, ...resto] = process.argv.slice(2);
  if (modo === "orcamento") {
    process.exitCode = modoOrcamento(resto[0]);
  } else if (modo === "carga") {
    process.exitCode = await modoCarga(resto);
  } else {
    console.error(
      "Uso: node scripts/desempenho.mjs orcamento <build.log> | carga [--base URL] [--sessao arquivo] [--n 200] [--c 10] [--rota /x]",
    );
    process.exitCode = 2;
  }
}
