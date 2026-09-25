import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { arquivoDaSessao, type Papel } from "./contas";

/**
 * O que os specs de ponta a ponta compartilham.
 *
 * Os fluxos rodam em mais de um navegador (ver playwright.config.ts) contra o
 * MESMO banco local, que guarda o que toda execução criou até o próximo
 * `db reset`. Tudo o que um fluxo cria leva um sufixo único, e o horário da
 * agenda sai de um dia que o banco diz estar vazio (`diaSemAtendimento`) —
 * assim o Chromium, o WebKit e as execuções anteriores não pisam um no outro.
 */

/** Sufixo único por processo: dá para rodar de novo sem limpar o banco. */
export const SUFIXO = Date.now().toString(36);

/**
 * Abre uma página já logada no perfil pedido.
 *
 * `browser.newContext()` não herda o `use` do projeto; o que o fluxo precisa
 * (idioma e fuso da clínica) vai aqui, explícito.
 */
export async function comoPerfil(browser: Browser, papel: Papel): Promise<Page> {
  const contexto = await browser.newContext({
    storageState: arquivoDaSessao(papel),
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  return contexto.newPage();
}

/** Fecha a página e o contexto que `comoPerfil` abriu. */
export async function fechar(pagina: Page): Promise<void> {
  await pagina.context().close();
}

/** O dia de hoje no relógio da clínica, "AAAA-MM-DD". */
export function hojeNaClinica(deslocamentoDias = 0): string {
  const agora = new Date(Date.now() + deslocamentoDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

/**
 * Posição do projeto atual na configuração (0 para o primeiro).
 *
 * Separa, entre os navegadores que rodam em sequência no mesmo banco, o que
 * precisa ser só de um deles — hoje, o nome dos leads da Captação, que a
 * busca da carteira acharia em dobro.
 */
export function indiceDoProjeto(): number {
  const info = test.info();
  return Math.max(
    0,
    info.config.projects.findIndex((projeto) => projeto.name === info.project.name),
  );
}

/**
 * Digita no seletor de paciente (combobox) uma vez e espera a lista abrir.
 *
 * Sem repetição de propósito: o campo é não controlado e adota, ao hidratar, o
 * que foi digitado antes (seletor-paciente.tsx). Se esse texto voltar a sumir
 * na hidratação, a lista nunca abre e o teste falha — que é o que se quer.
 *
 * Fica no prazo global do `expect` (playwright.config.ts): um prazo maior aqui
 * esconderia lentidão real da busca no build de produção, que é onde a CI
 * roda. A compilação lenta do `next dev` é paga antes, no aquecimento das
 * telas com o seletor (`e2e/preparar.ts`).
 */
export async function digitarNoSeletorDePaciente(pagina: Page, termo: string): Promise<Locator> {
  const campo = pagina.getByRole("combobox", { name: /Paciente/ });
  await campo.fill(termo);
  await expect(pagina.getByRole("listbox")).toBeVisible();
  return campo;
}

/** Paciente fixa da semente local, usada nas telas de detalhe e edição. */
export const PACIENTE_DA_SEMENTE = "c0000000-0000-4000-8000-000000000001";

/**
 * Toda tela do sistema, aberta com a sessão da administradora (que vê tudo).
 *
 * `telas.spec.ts` (refluxo, console, captura) e `acessibilidade.spec.ts`
 * (axe) percorrem esta mesma lista: tela nova entra aqui uma vez só.
 */
export const TELAS_DO_SISTEMA = [
  "/",
  "/pacientes",
  `/pacientes/${PACIENTE_DA_SEMENTE}`,
  `/pacientes/${PACIENTE_DA_SEMENTE}/editar`,
  "/pacientes/novo",
  "/pacientes/importar",
  "/agenda",
  "/agenda/novo",
  "/financeiro",
  "/financeiro/vendas",
  "/financeiro/vendas/nova",
  "/financeiro/despesas",
  "/financeiro/despesas/nova",
  "/financeiro/taxas",
  "/financeiro/taxas/nova",
  "/financeiro/movimentacoes",
  "/financeiro/fluxo",
  "/prontuarios",
  "/prontuarios/novo",
  "/formularios",
  "/formularios/novo",
  "/formularios/modelos",
  "/formularios/modelos/novo",
  "/relacionamento",
  "/relacionamento?aba=retornos",
  "/relacionamento?aba=tarefas",
  "/relacionamento?aba=avaliacoes",
  "/relacionamento/retornos/novo",
  "/relacionamento/tarefas/nova",
  "/captacao",
  "/busca?q=ana",
  "/configuracoes",
  "/configuracoes/procedimentos",
  "/configuracoes/procedimentos/novo",
  "/configuracoes/fotos",
  "/relatorios",
  // A 404 com sessão: sem sessão, `/nao-existe` cai no login (o middleware
  // manda para /entrar antes de o Next procurar a rota).
  "/nao-existe",
];

/** Telas abertas sem sessão. */
export const TELAS_PUBLICAS = [
  "/entrar",
  "/recuperar-senha",
  "/redefinir-senha",
  "/assinar/link-que-nao-existe-xxxxxxxxxxxxxxxxxxxxxxxxx",
  "/nao-existe",
];

/**
 * Roda um comando SQL no banco LOCAL, como o SQL do projeto (sem sessão).
 *
 * Só para o que a interface não faz de propósito. Hoje, duas coisas: o tempo
 * passar (o retorno combinado que venceu — pela API o banco recusa próximo
 * contato no passado, 0031; sem sessão ele entra, como numa importação de
 * histórico) e olhar a agenda inteira de uma vez, para achar um dia sem
 * ninguém (`diaSemAtendimento`). O caminho é o do `npm run test:banco`
 * (`psql` dentro do contêiner local, nome tirado do `project_id`): não existe
 * rota daqui até um banco remoto.
 */
export function sqlNoBancoLocal(comando: string): string {
  const config = readFileSync(join(__dirname, "..", "supabase", "config.toml"), "utf8");
  const projeto = /^project_id\s*=\s*"([^"]+)"/m.exec(config)?.[1];
  if (!projeto) throw new Error("project_id não encontrado em supabase/config.toml.");
  const execucao = spawnSync(
    "docker",
    ["exec", "-i", `supabase_db_${projeto}`, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-qAt"],
    { input: comando, encoding: "utf8" },
  );
  if (execucao.status !== 0) throw new Error(`SQL local falhou: ${execucao.stderr || execucao.error}`);
  return execucao.stdout.trim();
}

/** Texto como literal SQL (aspas simples dobradas). */
export function literalSql(texto: string): string {
  return `'${texto.replaceAll("'", "''")}'`;
}

/**
 * Um dia sem nenhum atendimento, de um a dez anos adiante — longe da semente
 * e das telas de hoje e do mês —, "AAAA-MM-DD" no relógio da clínica.
 *
 * Sortear às cegas numa faixa curta (40 ou 50 dias por projeto, sempre na
 * mesma hora) caía, cedo ou tarde, num dia que uma execução anterior já tinha
 * ocupado: o choque de horário barrava a marcação e o teste falhava pela
 * sobra, não por defeito. Aqui o banco diz quais dias estão vazios e o sorteio
 * é só entre eles; como os projetos rodam em sequência, o WebKit já vê o dia
 * que o Chromium usou. Vazio mesmo, não só sem a profissional do teste: a
 * agenda do dia mostra só o que o teste marcou.
 */
export function diaSemAtendimento(): string {
  const dia = sqlNoBancoLocal(`
    select to_char(dia, 'YYYY-MM-DD') from (
      select (now() at time zone 'America/Sao_Paulo')::date + deslocamento as dia
        from generate_series(365, 3650) as deslocamento
      except
      select (inicio at time zone 'America/Sao_Paulo')::date from public.atendimentos
    ) as livres
    order by random()
    limit 1;
  `);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) throw new Error(`Nenhum dia livre na agenda local: "${dia}".`);
  return dia;
}
