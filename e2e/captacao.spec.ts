import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  SUFIXO,
  comoPerfil,
  diaSemAtendimento,
  digitarNoSeletorDePaciente,
  fechar,
  hojeNaClinica,
  indiceDoProjeto,
  literalSql,
  sqlNoBancoLocal,
} from "./apoio";

/**
 * Captação de ponta a ponta, contra o Supabase LOCAL.
 *
 * O ciclo inteiro do lead — contato, retorno, qualificação, paciente, agenda
 * e venda — e o caminho da perda: retorno que venceu, perda com motivo,
 * reabertura e as duas trilhas (funil e comercial) intactas. As passagens
 * automáticas (agenda → agendamento, venda → ganho) são dos gatilhos do banco
 * (0029): aqui se confere que a tela as mostra.
 *
 * Nomes levam o sufixo do processo e o índice do projeto, para Chromium e
 * WebKit não acharem os leads um do outro na busca.
 */

/** Chamada dentro do teste: o índice do projeto só existe com o teste rodando. */
function marca(): string {
  return `E2E ${SUFIXO}-${indiceDoProjeto()}`;
}

/** "27/09" de uma chave "AAAA-MM-DD". */
function diaMes(chave: string): string {
  const [, mes, dia] = chave.split("-");
  return `${dia}/${mes}`;
}

async function cadastrarLead(pagina: Page, nome: string, campanha: string) {
  await pagina.goto("/captacao");
  // Pelo id: a busca da carteira também fala em nome, telefone e campanha.
  await pagina.locator("#lead-nome").fill(nome);
  await pagina.locator("#lead-telefone").fill("(11) 98888-7766");
  await pagina.locator("#lead-campanha").fill(campanha);
  await pagina.getByRole("button", { name: "Adicionar ao funil" }).click();
  await expect(pagina.getByText("Lead adicionado ao topo do funil.")).toBeVisible();
}

function linhaDoLead(pagina: Page, nome: string): Locator {
  return pagina.getByRole("listitem").filter({ has: pagina.getByText(nome, { exact: true }) });
}

async function abrirCarteira(pagina: Page, nome: string, recorte = "") {
  await pagina.goto(`/captacao?busca=${encodeURIComponent(nome)}${recorte}`);
  const linha = linhaDoLead(pagina, nome);
  await expect(linha).toHaveCount(1);
  return linha;
}

async function registrarContato(
  linha: Locator,
  { canal, observacao, proximo }: { canal: string; observacao: string; proximo?: string },
) {
  const resumo = linha.locator("summary", { hasText: "Registrar contato" });
  if ((await linha.locator("details[open] input[name=lead_id]").count()) === 0) await resumo.click();
  await linha.getByLabel("Canal").selectOption(canal);
  await linha.getByLabel("Observação").fill(observacao);
  await linha.getByLabel("Próximo contato").fill(proximo ?? "");
  await linha.getByRole("button", { name: "Registrar contato" }).click();
}

async function mover(linha: Locator, nome: string, etapa: string, motivo?: string) {
  await linha.getByLabel(`Mover ${nome} para outra etapa`).selectOption({ label: etapa });
  if (motivo) await linha.getByLabel(`Motivo da perda de ${nome}`).fill(motivo);
  await linha.getByRole("button", { name: "Mover" }).click();
}

test.describe("captação", () => {
  test("lead → contato → retorno hoje → qualifica → paciente → agenda → venda: ganho com receita atribuída", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    const nome = `Lead Captação ${marca()}`;
    const campanha = `Campanha ${marca()}`;

    await cadastrarLead(pagina, nome, campanha);
    let linha = await abrirCarteira(pagina, nome);
    await expect(linha.getByText("Entrada de leads", { exact: true }).first()).toBeVisible();
    await expect(linha.getByText("Sem contato registrado")).toBeVisible();
    await expect(linha.getByText("Sem retorno programado")).toBeVisible();

    // Contato com retorno para hoje: resumo e histórico comercial no ato.
    await registrarContato(linha, {
      canal: "whatsapp",
      observacao: "Pediu os valores pelo WhatsApp.",
      proximo: hojeNaClinica(),
    });
    await expect(linha.getByText("Contato registrado e retorno programado.")).toBeVisible();
    await expect(linha.getByText("Retorno hoje")).toBeVisible();
    await expect(linha.getByText(/^Último contato: \d{2}\/\d{2} às \d{2}:\d{2}$/)).toBeVisible();
    await linha.locator("summary", { hasText: "Histórico comercial" }).click();
    await expect(linha.getByText("Pediu os valores pelo WhatsApp.")).toBeVisible();

    // O recorte de retornos de hoje o encontra; o Pulso leva até ele.
    linha = await abrirCarteira(pagina, nome, "&atencao=retorno_hoje");
    await expect(pagina.getByLabel("Acompanhamento")).toHaveValue("retorno_hoje");
    await expect(pagina.getByText(/Retornos valem para toda a carteira aberta/)).toBeVisible();
    await expect(pagina.getByRole("link", { name: /Retornos para hoje/ })).toHaveAttribute(
      "href",
      "/captacao?atencao=retorno_hoje",
    );

    await mover(linha, nome, "Lead qualificado");
    await expect(linha.getByText("Lead qualificado", { exact: true }).first()).toBeVisible();

    pagina.once("dialog", (dialogo) => dialogo.accept());
    await linha.getByRole("button", { name: "Criar paciente com dados do lead" }).click();
    await expect(linha.getByText("Paciente vinculada", { exact: true })).toBeVisible();

    // Agendar leva à Agenda com a paciente já escolhida; o banco avança o lead.
    await linha.getByRole("link", { name: "Agendar" }).click();
    await expect(pagina).toHaveURL(/\/agenda\/novo\?paciente=[0-9a-f-]{36}/);
    await expect(pagina.getByText(nome).first()).toBeVisible();
    const dia = diaSemAtendimento();
    await pagina.getByLabel("Quem atende").selectOption({ label: "Camila Duarte" });
    await pagina.getByLabel("Procedimento").selectOption({ label: "Toxina botulínica" });
    await pagina.getByLabel("Data").fill(dia);
    await pagina.getByLabel("Hora").fill("06:00");
    await pagina.getByRole("button", { name: "Marcar atendimento" }).click();
    await expect(pagina).toHaveURL(new RegExp(`/agenda\\?dia=${dia}`));

    linha = await abrirCarteira(pagina, nome);
    await expect(linha.getByText("Agendamento", { exact: true }).first()).toBeVisible();

    // A venda nasce no Financeiro; o lead vira ganho pela venda real.
    await pagina.goto("/financeiro/vendas/nova");
    await digitarNoSeletorDePaciente(pagina, nome);
    await pagina.getByRole("listbox").getByRole("option").first().click();
    await pagina.getByLabel("Procedimento ou serviço").selectOption({ label: "Toxina botulínica" });
    await pagina.getByLabel("Forma de pagamento").selectOption("pix");
    await pagina.getByLabel("Valor original (R$)").fill("1.450,00");
    await pagina.getByRole("button", { name: "Registrar venda" }).click();
    await expect(pagina).toHaveURL(/\/financeiro\/vendas\/[0-9a-f-]{36}$/);

    linha = await abrirCarteira(pagina, nome);
    await expect(linha.getByText("Venda concluída", { exact: true }).first()).toBeVisible();
    await expect(linha.getByText("Venda comprovada pelo Financeiro.")).toBeVisible();
    // Encerrado: sem retorno pendente e sem contato comercial novo.
    await expect(linha.getByText("Retorno hoje")).toHaveCount(0);
    await expect(linha.locator("summary", { hasText: "Registrar contato" })).toHaveCount(0);

    await linha.locator("summary", { hasText: "Histórico do funil" }).click();
    for (const passo of [
      "Entrada → Entrada de leads",
      "Entrada de leads → Lead qualificado",
      "Lead qualificado → Agendamento",
      "Agendamento → Venda concluída",
    ]) {
      await expect(linha.getByText(passo)).toBeVisible();
    }

    // Receita atribuída: o recorte de vendas concluídas o mostra, e o Pulso o conta.
    await abrirCarteira(pagina, nome, "&etapa=ganho");
    await expect(pagina.getByRole("link", { name: /Receita atribuída/ })).toBeVisible();
    await fechar(pagina);
  });

  test("retorno recusado no passado, retorno que venceu, perda com motivo e reabertura sem perder histórico", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    const nome = `Lead Retorno ${marca()}`;

    await cadastrarLead(pagina, nome, `Retorno ${marca()}`);
    let linha = await abrirCarteira(pagina, nome);

    // Data no passado volta como erro do campo, com o foco nele.
    await registrarContato(linha, { canal: "telefone", observacao: "Não atendeu.", proximo: hojeNaClinica(-1) });
    const data = linha.getByLabel("Próximo contato");
    await expect(data).toHaveAttribute("aria-invalid", "true");
    await expect(data).toBeFocused();
    await expect(linha.getByText("O próximo contato não pode ficar no passado.")).toBeVisible();
    await expect(linha.getByLabel("Canal")).toHaveValue("telefone");

    const amanha = hojeNaClinica(1);
    await registrarContato(linha, { canal: "telefone", observacao: "Não atendeu.", proximo: amanha });
    await expect(linha.getByText(`Próximo contato em ${diaMes(amanha)}`)).toBeVisible();

    // O tempo passa: um retorno combinado há dois dias (pela API o banco não
    // aceita a data no passado; sem sessão, como uma importação, aceita).
    sqlNoBancoLocal(`
      insert into public.lead_interacoes (lead_id, canal, observacao, proximo_contato)
      select id, 'telefone', 'Retorno combinado que venceu.', (now() at time zone 'America/Sao_Paulo')::date - 2
        from public.leads where nome = ${literalSql(nome)};
    `);

    linha = await abrirCarteira(pagina, nome, "&atencao=retorno_atrasado");
    await expect(linha.getByText("Retorno atrasado há 2 dias")).toBeVisible();
    await expect(pagina.getByRole("link", { name: /Retornos atrasados/ })).toBeVisible();

    // Perdido sai do recorte de atrasados na hora: o banco limpa o retorno (0031).
    await mover(linha, nome, "Perdido", "Escolheu outra clínica.");
    await expect(pagina.getByText("Nenhum retorno atrasado.")).toBeVisible();
    await expect(linha).toHaveCount(0);

    linha = await abrirCarteira(pagina, nome);
    await expect(linha.getByText("Motivo da perda: Escolheu outra clínica.")).toBeVisible();
    await expect(linha.locator("summary", { hasText: "Registrar contato" })).toHaveCount(0);

    await mover(linha, nome, "Entrada de leads");
    await expect(linha.getByText("Sem retorno programado")).toBeVisible();
    await expect(linha.locator("summary", { hasText: "Registrar contato" })).toBeVisible();

    // As duas trilhas ficam: etapas com o motivo, contatos com o que venceu.
    await linha.locator("summary", { hasText: "Histórico do funil" }).click();
    await expect(linha.getByText("Entrada de leads → Perdido")).toBeVisible();
    await expect(linha.getByText("Motivo registrado: Escolheu outra clínica.")).toBeVisible();
    await expect(linha.getByText("Perdido → Entrada de leads")).toBeVisible();
    const comercial = linha.locator("details", { has: pagina.locator("summary", { hasText: "Histórico comercial" }) });
    await comercial.locator("summary").click();
    // O contador fica no summary e precisa ser exato: "· 2" também casa com
    // o horário "· 21:38" dos contatos, das 20h às 23h59.
    await expect(comercial.locator("summary").getByText("· 2", { exact: true })).toBeVisible();
    await expect(comercial.getByText("Retorno combinado que venceu.")).toBeVisible();
    await fechar(pagina);
  });

  test("financeiro acompanha a carteira, mas não cadastra lead nem registra contato", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "financeiro");
    await pagina.goto("/captacao");
    await expect(pagina.getByRole("heading", { name: "Carteira comercial" })).toBeVisible();
    await expect(pagina.getByText("Entrada rápida de lead")).toHaveCount(0);
    await expect(pagina.locator("summary", { hasText: "Registrar contato" })).toHaveCount(0);
    await fechar(pagina);
  });

  test("carteira aberta, com contatos e retornos, sem violação de acessibilidade e sem rolagem lateral", async ({ browser }) => {
    test.skip(test.info().project.name !== "chromium", "axe e refluxo rodam só no Chromium, como em acessibilidade.spec.ts");
    const pagina = await comoPerfil(browser, "recepcao");
    const nome = `Lead Tela ${marca()}`;

    await cadastrarLead(pagina, nome, `Tela ${marca()}`);
    const linha = await abrirCarteira(pagina, nome);
    await registrarContato(linha, {
      canal: "instagram",
      observacao: "Respondeu o story e quer saber de horários à noite para a avaliação.",
      proximo: hojeNaClinica(),
    });
    await expect(linha.getByText("Retorno hoje")).toBeVisible();

    for (const largura of [320, 360, 390, 430, 768, 1440]) {
      await pagina.setViewportSize({ width: largura, height: 900 });
      await pagina.goto(`/captacao?busca=${encodeURIComponent(nome)}`);
      await expect(linhaDoLead(pagina, nome)).toHaveCount(1);
      // Tudo aberto: formulário de contato, históricos e vínculo de paciente.
      await pagina.evaluate(() => document.querySelectorAll("li details").forEach((d) => d.setAttribute("open", "")));

      const larguras = await pagina.evaluate(() => ({
        pagina: document.documentElement.scrollWidth,
        janela: document.documentElement.clientWidth,
      }));
      expect(larguras.pagina, `rolagem horizontal em ${largura}px`).toBeLessThanOrEqual(larguras.janela);

      if (largura === 360 || largura === 1440) {
        const resultado = await new AxeBuilder({ page: pagina })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();
        const violacoes = resultado.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(" | ")}`);
        expect(violacoes, `violações em ${largura}px`).toEqual([]);
      }
    }
    await fechar(pagina);
  });
});
