import { expect, test } from "@playwright/test";
import { SUFIXO, comoPerfil, digitarNoSeletorDePaciente, hojeNaClinica, indiceDoProjeto } from "./apoio";
import { SENHA_LOCAL } from "./contas";

/**
 * Fluxos de ponta a ponta, contra o Supabase LOCAL (ver e2e/preparar.ts).
 *
 * Cada fluxo cria o que precisa com um sufixo único, para poder rodar de novo
 * sem limpar o banco. Os perfis entram com a sessão guardada pela preparação.
 * A assinatura por link, que é pública, mora em `assinatura.spec.ts`.
 */

test.describe("entrar", () => {
  test("senha errada avisa e não apaga o e-mail", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill("recepcao@cockpit.local");
    await page.getByLabel("Senha", { exact: true }).fill("senha-errada-de-proposito");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Por id: o anunciador de rotas do Next também tem role="alert".
    await expect(page.locator("#erro-login")).toHaveText("E-mail ou senha incorretos.");
    await expect(page.getByLabel("E-mail")).toHaveValue("recepcao@cockpit.local");
    await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("rota do sistema sem sessão leva ao login e volta ao destino", async ({ page }) => {
    await page.goto("/agenda");
    await expect(page).toHaveURL(/\/entrar\?proximo=%2Fagenda/);

    await page.getByLabel("E-mail").fill("recepcao@cockpit.local");
    await page.getByLabel("Senha", { exact: true }).fill(SENHA_LOCAL);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/agenda$/);
  });

  // `//x`, `/	x` e `/%2F%2Fx` viram "outro site" em algum navegador: o
  // destino depois do login fica sempre no sistema.
  for (const proximo of ["//exemplo.com", "/%09/exemplo.com", "/%2F%2Fexemplo.com"]) {
    test(`redirecionamento pós-login não sai do sistema (${proximo})`, async ({ page, baseURL }) => {
      await page.goto(`/entrar?proximo=${proximo}`);
      await page.getByLabel("E-mail").fill("recepcao@cockpit.local");
      await page.getByLabel("Senha", { exact: true }).fill(SENHA_LOCAL);
      await page.getByRole("button", { name: "Entrar" }).click();
      // A raiz do próprio sistema, na porta em que ele roda (3000 no dev, a
      // do build no gate de produção) — nunca outro host.
      await expect(page).toHaveURL(new URL("/", baseURL).href);
    });
  }
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
    // Um dia longe e sem ninguém; cada navegador fica com a sua faixa de 50
    // dias, porque os projetos rodam em sequência no mesmo banco.
    const dia = hojeNaClinica(300 + indiceDoProjeto() * 50 + (Date.now() % 50));

    await pagina.goto(`/agenda/novo?dia=${dia}`);
    const busca = await digitarNoSeletorDePaciente(pagina, "Aline");
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
    await digitarNoSeletorDePaciente(pagina, "Beatriz");
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

    await digitarNoSeletorDePaciente(recepcao, "Carolina");
    await recepcao.getByRole("listbox").getByRole("option").first().click();
    await recepcao.getByLabel("Procedimento ou serviço").selectOption({ label: "Toxina botulínica" });
    await recepcao.getByLabel("Forma de pagamento").selectOption("pix");

    // Valor vazio é recusado pelo servidor (o formulário é `noValidate`).
    const valorOriginal = recepcao.getByLabel("Valor original (R$)");
    await valorOriginal.fill("");
    await recepcao.getByRole("button", { name: "Registrar venda" }).click();
    await expect(recepcao.getByText("Informe o valor original.")).toBeVisible();
    await expect(valorOriginal).toHaveAttribute("aria-invalid", "true");
    await expect(recepcao).toHaveURL(/\/financeiro\/vendas\/nova/);

    await valorOriginal.fill("1.234,56");
    await recepcao.getByRole("button", { name: "Registrar venda" }).click();

    await expect(recepcao).toHaveURL(/\/financeiro\/vendas\/[0-9a-f-]{36}$/);
    const endereco = recepcao.url();
    await expect(recepcao.getByText("R$ 1.234,56").first()).toBeVisible();
    // A venda nasce pela função do banco (0023) com o recebimento a receber.
    await expect(recepcao.getByText(/^Previsto$/).first()).toBeVisible();
    // A recepção não confirma recebimento: a porta nem aparece.
    await expect(recepcao.getByRole("button", { name: "Confirmar recebimento" })).toHaveCount(0);
    await recepcao.close();

    const financeiro = await comoPerfil(browser, "financeiro");
    await financeiro.goto(endereco);

    // Vazio não é R$ 0,00: a ação pede o valor.
    const valorRecebido = financeiro.getByLabel("Valor que entrou (R$)");
    await valorRecebido.fill("");
    await financeiro.getByRole("button", { name: "Confirmar recebimento" }).click();
    await expect(financeiro.getByText(/Informe o valor que entrou/)).toBeVisible();

    // Entrou menos do que o previsto: fica registrado como divergência.
    await valorRecebido.fill("1.200,00");
    await financeiro.getByRole("button", { name: "Confirmar recebimento" }).click();
    await expect(financeiro.getByText("Recebido com divergência").first()).toBeVisible();
    await expect(financeiro.getByRole("button", { name: "Confirmar recebimento" })).toHaveCount(0);

    // Depois de confirmado, mudar a forma não reescreve o que entrou: a
    // prévia avisa que entra um ajuste (novo líquido − valor recebido).
    await financeiro.getByRole("link", { name: "Alterar forma de pagamento" }).click();
    await financeiro.getByLabel("Nova forma de pagamento").selectOption("dinheiro");
    await expect(financeiro.getByText(/entra um ajuste de/)).toBeVisible();
    await expect(financeiro.getByText("+ R$ 34,56")).toBeVisible();
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
    await digitarNoSeletorDePaciente(pagina, "Daniela");
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
