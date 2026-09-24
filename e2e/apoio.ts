import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import { arquivoDaSessao, type Papel } from "./contas";

/**
 * O que os specs de ponta a ponta compartilham.
 *
 * Os fluxos rodam em mais de um navegador (ver playwright.config.ts) contra o
 * MESMO banco local. Tudo o que um fluxo cria leva um sufixo único, e o que
 * disputa recurso fixo (um horário da agenda, por exemplo) é deslocado por
 * projeto — assim o Chromium e o WebKit não pisam um no outro.
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
 * Serve para separar recursos fixos entre navegadores que rodam em sequência
 * no mesmo banco — sem isso, o segundo navegador acharia o horário ocupado
 * pelo primeiro e o teste falharia por choque, não por defeito.
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
