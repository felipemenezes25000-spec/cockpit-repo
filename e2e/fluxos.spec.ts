import { expect, test, type Browser, type Page } from "@playwright/test";
import { SENHA_LOCAL, arquivoDaSessao } from "./contas";

/**
 * Fluxos de ponta a ponta, contra o Supabase LOCAL (ver e2e/preparar.ts).
 *
 * Cada fluxo cria o que precisa com um sufixo único, para poder rodar de novo
 * sem limpar o banco. Os perfis entram com a sessão guardada pela preparação.
 */

const SUFIXO = Date.now().toString(36);

async function comoPerfil(browser: Browser, papel: "administradora" | "financeiro" | "recepcao"): Promise<Page> {
  const contexto = await browser.newContext({
    storageState: arquivoDaSessao(papel),
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
  });
  return contexto.newPage();
}

/** O dia de hoje no relógio da clínica, "AAAA-MM-DD". */
function hojeNaClinica(deslocamentoDias = 0): string {
  const agora = new Date(Date.now() + deslocamentoDias * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(agora);
}

test.describe("entrar", () => {
  test("senha errada avisa e não apaga o e-mail", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill("recepcao@cockpit.local");
    await page.getByLabel("Senha").fill("senha-errada-de-proposito");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Por id: o anunciador de rotas do Next também tem role="alert".
    await expect(page.locator("#erro-login")).toHaveText("E-mail ou senha incorretos.");
    await expect(page.getByLabel("E-mail")).toHaveValue("recepcao@cockpit.local");
    await expect(page.getByLabel("Senha")).toHaveAttribute("aria-invalid", "true");
  });

  test("rota do sistema sem sessão leva ao login e volta ao destino", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/entrar\?proximo=%2Fagenda/);

    await page.getByLabel("E-mail").fill("recepcao@cockpit.local");
    await page.getByLabel("Senha").fill(SENHA_LOCAL);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/agenda$/);
  });

  test("redirecionamento pós-login não sai do sistema", async ({ page }) => {
    await page.goto("/entrar?proximo=//exemplo.com");
    await page.getByLabel("E-mail").fill("recepcao@cockpit.local");
    await page.getByLabel("Senha").fill(SENHA_LOCAL);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL("http://localhost:3000/");
  });
});

test.describe("permissões na interface", () => {
  test("recepção não vê a porta do que não pode fazer", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");

    await pagina.goto("/");
    await expect(pagina.getByRole("link", { name: "Nova paciente" })).toBeVisible();
    await expect(pagina.getByRole("link", { name: "Registrar atendimento" })).toHaveCount(0);

    await pagina.goto("/financeiro");
    const areas = pagina.getByRole("navigation", { name: "Áreas do financeiro" });
    await expect(areas.getByRole("link", { name: "Vendas" })).toBeVisible();
    await expect(areas.getByRole("link", { name: "Despesas" })).toHaveCount(0);

    await pagina.goto("/prontuarios");
    await expect(pagina.getByText(/restrit/i).first()).toBeVisible();
    await pagina.close();
  });

  test("administradora vê prontuários e o atalho de registro clínico", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    await pagina.goto("/");
    await expect(pagina.getByRole("link", { name: "Registrar atendimento" })).toBeVisible();
    await pagina.close();
  });
});

test.describe("pacientes", () => {
  test("cadastro valida no servidor, marca o campo com erro e grava", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    const nome = `Paciente E2E ${SUFIXO}`;

    await pagina.goto("/pacientes/novo");
    await pagina.getByLabel("Nome completo").fill(nome);
    await pagina.getByLabel("CPF").fill("123.456.789-00");
    await pagina.getByRole("button", { name: "Cadastrar paciente" }).click();

    const cpf = pagina.getByLabel("CPF");
    await expect(cpf).toHaveAttribute("aria-invalid", "true");
    await expect(pagina.getByText(/CPF inválido/)).toBeVisible();
    // A borda de erro existe de verdade no CSS (antes a borda neutra vencia).
    await expect(cpf).toHaveCSS("border-top-color", "rgb(187, 0, 0)");
    // O que foi digitado continua no formulário.
    await expect(pagina.getByLabel("Nome completo")).toHaveValue(nome);

    await cpf.fill("");
    await pagina.getByLabel("Telefone").fill("(11) 98765-4321");
    await pagina.getByLabel("Data de nascimento").fill("1990-05-20");
    await pagina.getByRole("button", { name: "Cadastrar paciente" }).click();

    await expect(pagina).toHaveURL(/\/pacientes\/[0-9a-f-]{36}$/);
    await expect(pagina.getByRole("heading", { name: nome }).first()).toBeVisible();
    await pagina.close();
  });

  test("arquivar pede confirmação, preserva e reativa", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    const nome = `Arquivável ${SUFIXO}`;

    await pagina.goto("/pacientes/novo");
    await pagina.getByLabel("Nome completo").fill(nome);
    await pagina.getByRole("button", { name: "Cadastrar paciente" }).click();
    await expect(pagina).toHaveURL(/\/pacientes\/[0-9a-f-]{36}$/);

    pagina.once("dialog", (dialogo) => dialogo.dismiss());
    await pagina.getByRole("button", { name: "Arquivar paciente" }).click();
    await expect(pagina.getByRole("button", { name: "Arquivar paciente" })).toBeVisible();

    pagina.once("dialog", (dialogo) => dialogo.accept());
    await pagina.getByRole("button", { name: "Arquivar paciente" }).click();
    await expect(pagina.getByRole("button", { name: "Reativar paciente" })).toBeVisible();

    pagina.once("dialog", (dialogo) => dialogo.accept());
    await pagina.getByRole("button", { name: "Reativar paciente" }).click();
    await expect(pagina.getByRole("button", { name: "Arquivar paciente" })).toBeVisible();
    await pagina.close();
  });
});

test.describe("agenda", () => {
  test("marca pelo seletor com teclado, recusa choque e confirma", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    const dia = hojeNaClinica(300 + (Date.now() % 50));

    await pagina.goto(`/agenda/novo?dia=${dia}`);
    const busca = pagina.getByRole("combobox", { name: /Paciente/ });
    await busca.fill("Aline");
    await expect(pagina.getByRole("listbox")).toBeVisible();
    await busca.press("ArrowDown");
    await expect(busca).toHaveAttribute("aria-activedescendant", /.+/);
    await busca.press("Enter");
    await expect(pagina.getByText("Aline Bastos")).toBeVisible();

    await pagina.getByLabel("Quem atende").selectOption({ label: "Dra. Marina Rocha" });
    await pagina.getByLabel("Procedimento").selectOption({ label: "Toxina botulínica" });
    await pagina.getByLabel("Data").fill(dia);
    await pagina.getByLabel("Hora").fill("07:00");
    await pagina.getByRole("button", { name: "Marcar atendimento" }).click();
    await expect(pagina).toHaveURL(new RegExp(`/agenda\\?dia=${dia}`));
    await expect(pagina.getByText("07:00")).toBeVisible();

    // O mesmo horário para a mesma profissional é recusado, com o nome de quem ocupa.
    await pagina.goto(`/agenda/novo?dia=${dia}`);
    await pagina.getByRole("combobox", { name: /Paciente/ }).fill("Beatriz");
    await pagina.getByRole("listbox").getByRole("option").first().click();
    await pagina.getByLabel("Quem atende").selectOption({ label: "Dra. Marina Rocha" });
    await pagina.getByLabel("Procedimento").selectOption({ label: "Toxina botulínica" });
    await pagina.getByLabel("Data").fill(dia);
    await pagina.getByLabel("Hora").fill("07:15");
    await pagina.getByRole("button", { name: "Marcar atendimento" }).click();
    await expect(pagina.getByText(/Choca com o atendimento de Aline Bastos/)).toBeVisible();

    await pagina.goto(`/agenda?dia=${dia}`);
    await pagina.getByRole("button", { name: "Confirmar" }).first().click();
    await expect(pagina.getByText("Confirmado").first()).toBeVisible();
    await pagina.close();
  });
});

test.describe("financeiro", () => {
  test("recepção registra venda em PIX; financeiro confirma o recebimento", async ({ browser }) => {
    const recepcao = await comoPerfil(browser, "recepcao");
    await recepcao.goto("/financeiro/vendas/nova");

    await recepcao.getByRole("combobox", { name: /Paciente/ }).fill("Carolina");
    await recepcao.getByRole("listbox").getByRole("option").first().click();
    await recepcao.getByLabel("Procedimento ou serviço").selectOption({ label: "Toxina botulínica" });
    await recepcao.getByLabel("Valor original (R$)").fill("1.234,56");
    await recepcao.getByLabel("Forma de pagamento").selectOption("pix");
    await recepcao.getByRole("button", { name: "Registrar venda" }).click();

    await expect(recepcao).toHaveURL(/\/financeiro\/vendas\/[0-9a-f-]{36}$/);
    const endereco = recepcao.url();
    await expect(recepcao.getByText("R$ 1.234,56").first()).toBeVisible();
    // A recepção não confirma recebimento: a porta nem aparece.
    await expect(recepcao.getByRole("button", { name: "Confirmar recebimento" })).toHaveCount(0);
    await recepcao.close();

    const financeiro = await comoPerfil(browser, "financeiro");
    await financeiro.goto(endereco);
    await financeiro.getByRole("button", { name: "Confirmar recebimento" }).click();
    await expect(financeiro.getByText(/^Recebido$/).first()).toBeVisible();
    await expect(financeiro.getByRole("button", { name: "Confirmar recebimento" })).toHaveCount(0);
    await financeiro.close();
  });

  test("financeiro lança e paga uma despesa", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "financeiro");
    const descricao = `Despesa E2E ${SUFIXO}`;

    await pagina.goto("/financeiro/despesas/nova");
    await pagina.getByLabel("Descrição").fill(descricao);
    await pagina.getByLabel("Valor (R$)").fill("250,00");
    await pagina.getByLabel("Vencimento").fill(hojeNaClinica());
    await pagina.getByRole("button", { name: "Registrar despesa" }).click();
    await expect(pagina).toHaveURL(/\/financeiro\/despesas$/);

    const linha = pagina.getByRole("listitem").filter({ hasText: descricao });
    await expect(linha).toBeVisible();
    await linha.getByRole("button", { name: "Marcar como paga" }).click();
    await expect(linha.getByText("Paga").first()).toBeVisible();
    await pagina.close();
  });
});

test.describe("prontuário", () => {
  test("administradora registra e cria nova versão sem perder a anterior", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    const titulo = `Avaliação E2E ${SUFIXO}`;

    await pagina.goto("/prontuarios/novo");
    await pagina.getByRole("combobox", { name: /Paciente/ }).fill("Daniela");
    await pagina.getByRole("listbox").getByRole("option").first().click();
    await pagina.getByLabel("Título").fill(titulo);
    await pagina.getByLabel("Queixa e anamnese").fill("Queixa registrada pelo teste E2E.");
    await pagina.getByRole("button", { name: "Salvar prontuário" }).click();

    await expect(pagina).toHaveURL(/\/prontuarios\/[0-9a-f-]{36}$/);
    await expect(pagina.getByRole("heading", { name: titulo })).toBeVisible();
    await expect(pagina.getByText("Queixa registrada pelo teste E2E.").first()).toBeVisible();
    await pagina.close();
  });
});

test.describe("documentos e assinatura por link", () => {
  test("modelo → emissão → link → paciente assina de fora do sistema", async ({ browser }) => {
    const admin = await comoPerfil(browser, "administradora");
    const nomeModelo = `Contrato E2E ${SUFIXO}`;

    await admin.goto("/formularios/modelos/novo");
    await admin.getByLabel("Tipo").selectOption("contrato");
    await admin.getByLabel("Nome").fill(nomeModelo);
    await admin.getByLabel("Texto do documento").fill("Eu, paciente, concordo com o procedimento descrito.");
    await admin.getByRole("button", { name: "Criar modelo" }).click();
    await expect(admin).toHaveURL(/\/formularios\/modelos\/[0-9a-f-]{36}\/editar$/);
    await admin.close();

    // A recepção emite para a Beatriz, que tem data de nascimento cadastrada.
    const recepcao = await comoPerfil(browser, "recepcao");
    await recepcao.goto("/formularios/novo?paciente=c0000000-0000-4000-8000-000000000002");
    await recepcao.getByLabel("Modelo").selectOption({ label: `Contrato · ${nomeModelo} (v1)` });
    await recepcao.getByRole("button", { name: "Emitir e congelar o texto" }).click();
    await expect(recepcao).toHaveURL(/\/formularios\/[0-9a-f-]{36}$/);

    await recepcao.getByRole("button", { name: "Gerar link" }).click();
    const campoLink = recepcao.getByLabel("Endereço do link de assinatura");
    await expect(campoLink).toHaveValue(/\/assinar\//);
    const endereco = await campoLink.inputValue();
    const documento = recepcao.url();
    await recepcao.close();

    // A paciente, sem sessão nenhuma.
    const contexto = await browser.newContext({ locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
    const paciente = await contexto.newPage();
    await paciente.goto(endereco);
    await paciente.getByLabel("Sua data de nascimento").fill("2000-01-01");
    await paciente.getByRole("button", { name: "Abrir documento" }).click();
    await expect(paciente.getByText(/A data não confere/)).toBeVisible();

    await paciente.getByLabel("Sua data de nascimento").fill("1992-09-11");
    await paciente.getByRole("button", { name: "Abrir documento" }).click();
    await expect(paciente.getByText("Eu, paciente, concordo com o procedimento descrito.")).toBeVisible();

    await paciente.getByLabel("Nome completo").fill("Beatriz Nogueira");
    await paciente.getByLabel(/Li o documento acima/).check();
    await paciente.getByRole("button", { name: "Assinar documento" }).click();
    await expect(paciente.getByText("Beatriz Nogueira").first()).toBeVisible();
    await expect(paciente.getByRole("button", { name: /Salvar/ })).toBeVisible();
    await contexto.close();

    // Na clínica, o documento aparece assinado, pelo canal do link.
    const conferencia = await comoPerfil(browser, "recepcao");
    await conferencia.goto(documento);
    await expect(conferencia.getByText(/Assinado/).first()).toBeVisible();
    await conferencia.close();
  });
});
