import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUFIXO, comoPerfil, digitarNoSeletorDePaciente, fechar, hojeNaClinica } from "./apoio";

/**
 * Os módulos que os fluxos originais não cobriam: importação, relacionamento,
 * procedimentos, fotos de evolução, busca e as telas de erro.
 *
 * Mesmas regras de `fluxos.spec.ts`: Supabase LOCAL, sufixo único, nada que
 * dependa de limpar o banco antes.
 */

const FIXTURES = join(__dirname, "fixtures");

test.describe("importação de pacientes", () => {
  test("administradora analisa o CSV, vê a linha com erro e grava só a boa", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    // O arquivo de fixture tem um marcador no nome; troca-se pelo sufixo para
    // a linha boa ser nova a cada execução.
    const csv = readFileSync(join(FIXTURES, "pacientes.csv"), "utf8").replaceAll("__SUFIXO__", SUFIXO);
    const nomeBom = `Importada E2E ${SUFIXO}`;

    await pagina.goto("/pacientes/importar");
    await pagina.getByLabel("Arquivo").setInputFiles({
      name: "pacientes.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(csv, "utf8"),
    });
    await pagina.getByRole("button", { name: "Analisar arquivo" }).click();

    // Uma pronta, uma recusada pelo CPF inválido: o botão diz quantas entram.
    const importar = pagina.getByRole("button", { name: "Importar 1 paciente" });
    await expect(importar).toBeVisible();
    await expect(pagina.getByText(`Recusada E2E ${SUFIXO}`).first()).toBeVisible();

    await importar.click();
    await expect(pagina.getByText("Importação concluída")).toBeVisible();

    await pagina.goto(`/pacientes?busca=${encodeURIComponent(nomeBom)}`);
    await expect(pagina.getByRole("link", { name: new RegExp(nomeBom) }).first()).toBeVisible();
    await expect(pagina.getByText(`Recusada E2E ${SUFIXO}`)).toHaveCount(0);
    await fechar(pagina);
  });
});

test.describe("importação de pacientes — o que a prévia recusa", () => {
  test("aspa sem fechar e planilha .xlsx não passam da análise; CEP fora dos 8 números recusa a linha", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    await pagina.goto("/pacientes/importar");
    const campo = pagina.getByLabel("Arquivo");
    const analisar = pagina.getByRole("button", { name: "Analisar arquivo" });

    // Aspa aberta que nunca fecha: o arquivo inteiro é recusado, com a linha.
    await campo.setInputFiles({
      name: "aspa.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(`Nome;Telefone
"Aspa Aberta E2E ${SUFIXO};(11) 98765-4321
`, "utf8"),
    });
    await analisar.click();
    await expect(pagina.getByRole("alert").filter({ hasText: /abre aspas/ })).toBeVisible();
    await expect(pagina.getByRole("button", { name: /^Importar/ })).toHaveCount(0);

    // Planilha do Excel (zip) com a extensão trocada: recusada pelo conteúdo.
    await campo.setInputFiles({
      name: "planilha.csv",
      mimeType: "text/csv",
      buffer: Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(64)]),
    });
    await analisar.click();
    await expect(pagina.getByRole("alert").filter({ hasText: /Excel/ })).toBeVisible();
    await expect(pagina.getByRole("button", { name: /^Importar/ })).toHaveCount(0);

    // CEP fora dos 8 números recusa a linha, como no cadastro manual (a
    // regra de `validarPaciente`): nem o de dígito a mais nem o de 7 (o Excel
    // come o zero da frente) são completados ou apagados. Importar a base
    // antiga sem CEP é decisão da clínica em aberto (AGENTS.md §13, item 12).
    await campo.setInputFiles({
      name: "cep.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        // Com telefone, a linha certa não tem aviso nenhum e fica fora da
        // lista do que precisa de atenção.
        `Nome;CEP;Celular
CEP Errado E2E ${SUFIXO};012345-6789;(11) 98888-0001
CEP Sem Zero E2E ${SUFIXO};1234567;(11) 98888-0002
CEP Certo E2E ${SUFIXO};01234-567;(11) 98888-0003
`,
        "utf8",
      ),
    });
    await analisar.click();
    for (const nome of [`CEP Errado E2E ${SUFIXO}`, `CEP Sem Zero E2E ${SUFIXO}`]) {
      const linha = pagina.getByRole("listitem").filter({ hasText: nome });
      await expect(linha.getByText("Com erro")).toBeVisible();
      await expect(linha.getByText(/CEP: CEP inválido/)).toBeVisible();
    }
    await expect(
      pagina.getByRole("listitem").filter({ hasText: `CEP Certo E2E ${SUFIXO}` }),
    ).toHaveCount(0);
    await expect(pagina.getByRole("button", { name: "Importar 1 paciente" })).toBeVisible();
    // Nada é gravado: o teste não clica em Importar.
    await fechar(pagina);
  });
});

test.describe("relacionamento", () => {
  test("recepção cria tarefa, o servidor recusa descrição curta, e conclui", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    const descricao = `Ligar para confirmar retorno E2E ${SUFIXO}`;

    await pagina.goto("/relacionamento/tarefas/nova");
    const campo = pagina.getByLabel("O que precisa ser feito");
    await campo.fill("ok");
    await pagina.getByRole("button", { name: "Criar tarefa" }).click();
    await expect(campo).toHaveAttribute("aria-invalid", "true");
    await expect(pagina.getByText(/3 a 500 caracteres/)).toBeVisible();

    await campo.fill(descricao);
    await pagina.getByLabel("Prazo").fill(hojeNaClinica(7));
    await pagina.getByRole("button", { name: "Criar tarefa" }).click();
    await expect(pagina).toHaveURL(/\/relacionamento\?aba=tarefas$/);

    const linha = pagina.getByRole("listitem").filter({ hasText: descricao });
    await expect(linha).toBeVisible();
    await linha.getByRole("button", { name: "Concluir" }).click();
    await expect(linha.getByRole("button", { name: "Reabrir" })).toBeVisible();
    await fechar(pagina);
  });
});

test.describe("procedimentos", () => {
  test("administradora cadastra procedimento; nome vazio é recusado no servidor", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    const nome = `Procedimento E2E ${SUFIXO}`;

    await pagina.goto("/configuracoes/procedimentos/novo");
    await pagina.getByLabel("Duração (minutos)").fill("45");
    await pagina.getByRole("button", { name: "Cadastrar procedimento" }).click();
    await expect(pagina.getByLabel("Nome do procedimento")).toHaveAttribute("aria-invalid", "true");

    await pagina.getByLabel("Nome do procedimento").fill(nome);
    await pagina.getByLabel("Valor de tabela (R$)").fill("350,00");
    await pagina.getByRole("button", { name: "Cadastrar procedimento" }).click();
    await expect(pagina).toHaveURL(/\/configuracoes\/procedimentos$/);

    const lista = pagina.getByRole("list", { name: "Procedimentos" });
    await expect(lista.getByText(nome)).toBeVisible();
    await expect(lista.getByRole("listitem").filter({ hasText: nome }).getByText("R$ 350,00")).toBeVisible();
    await fechar(pagina);
  });
});

test.describe("fotos de evolução", () => {
  test("administradora envia uma foto ao prontuário e ela aparece na grade", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "administradora");
    const titulo = `Evolução com foto E2E ${SUFIXO}`;
    const legenda = `Frente, antes da sessão ${SUFIXO}`;

    await pagina.goto("/prontuarios/novo");
    await digitarNoSeletorDePaciente(pagina, "Daniela");
    await pagina.getByRole("listbox").getByRole("option").first().click();
    await pagina.getByLabel("Título").fill(titulo);
    await pagina.getByLabel("Queixa e anamnese").fill("Registro criado para o envio de foto do E2E.");
    await pagina.getByRole("button", { name: "Salvar prontuário" }).click();
    await expect(pagina).toHaveURL(/\/prontuarios\/[0-9a-f-]{36}$/);

    await pagina.getByLabel("Legenda").fill(legenda);
    await pagina.getByLabel("Fotos").setInputFiles(join(FIXTURES, "foto-evolucao.png"));
    await pagina.getByRole("button", { name: "Enviar foto" }).click();

    await expect(pagina.getByRole("img", { name: legenda }).first()).toBeVisible();
    await fechar(pagina);
  });
});

test.describe("busca", () => {
  test("acha a paciente pelo nome e leva à ficha", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");

    await pagina.goto("/busca");
    const campo = pagina.getByRole("searchbox", { name: "O que deseja buscar?" });
    await campo.fill("Beatriz");
    await campo.press("Enter");
    await expect(pagina).toHaveURL(/\/busca\?q=Beatriz/);

    await pagina.getByRole("link", { name: /Beatriz Nogueira/ }).first().click();
    await expect(pagina).toHaveURL(/\/pacientes\/c0000000-0000-4000-8000-000000000002$/);
    await fechar(pagina);
  });

  test("termo sem resultado diz que não achou, sem quebrar a tela", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    await pagina.goto(`/busca?q=${encodeURIComponent(`zzz-sem-resultado-${SUFIXO}`)}`);
    await expect(pagina.getByText("Nenhuma paciente encontrada")).toBeVisible();
    await fechar(pagina);
  });
});

test.describe("erros", () => {
  test("ficha de paciente que não existe mostra a página de não encontrada", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "recepcao");
    // O status HTTP não é conferido: com `loading.tsx` no grupo (app), o Next
    // já começou a responder (200, em streaming) quando o `notFound()` roda.
    // O que a pessoa vê é o que importa — e nada da ficha pode vazar.
    await pagina.goto("/pacientes/00000000-0000-4000-8000-000000000000");
    await expect(pagina.getByText("Página não encontrada").first()).toBeVisible();
    await expect(pagina.getByRole("button", { name: "Arquivar paciente" })).toHaveCount(0);
    await fechar(pagina);
  });
});
