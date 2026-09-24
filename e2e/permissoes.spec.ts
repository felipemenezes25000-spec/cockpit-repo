import { expect, test } from "@playwright/test";
import { comoPerfil, fechar } from "./apoio";
import type { Papel } from "./contas";

/**
 * Permissões por perfil, entrando PELA URL — esconder o link não é proteger a
 * rota. Cada caso confere duas coisas: a tela de acesso restrito aparece e o
 * formulário (a porta da escrita) não é renderizado.
 *
 * A matriz vem do AGENTS.md §5 ("Os três perfis"); não é decisão deste teste.
 */

type Caso = {
  papel: Papel;
  rota: string;
  aviso: string;
  /** Botão de envio que não pode existir para este perfil. */
  semBotao?: string;
};

const CASOS: Caso[] = [
  // Recepção: nada de despesa, fluxo, taxas, importação, tabela ou prontuário.
  { papel: "recepcao", rota: "/financeiro/despesas/nova", aviso: "Área do financeiro e da administradora", semBotao: "Registrar despesa" },
  { papel: "recepcao", rota: "/financeiro/fluxo", aviso: "Área do financeiro e da administradora" },
  { papel: "recepcao", rota: "/financeiro/taxas/nova", aviso: "Só a administradora altera esta tabela", semBotao: "Cadastrar taxa" },
  { papel: "recepcao", rota: "/pacientes/importar", aviso: "Importação restrita à administradora", semBotao: "Analisar arquivo" },
  { papel: "recepcao", rota: "/configuracoes/procedimentos/novo", aviso: "Só a administradora altera esta tabela", semBotao: "Cadastrar procedimento" },
  { papel: "recepcao", rota: "/prontuarios/novo", aviso: "Prontuário clínico restrito", semBotao: "Salvar prontuário" },
  { papel: "recepcao", rota: "/formularios/modelos/novo", aviso: "Só a administradora altera esta tabela", semBotao: "Criar modelo" },
  // Financeiro: caixa sim; clínica, importação e tabelas de configuração não.
  { papel: "financeiro", rota: "/prontuarios", aviso: "Prontuário clínico restrito" },
  { papel: "financeiro", rota: "/prontuarios/novo", aviso: "Prontuário clínico restrito", semBotao: "Salvar prontuário" },
  { papel: "financeiro", rota: "/pacientes/importar", aviso: "Importação restrita à administradora", semBotao: "Analisar arquivo" },
  { papel: "financeiro", rota: "/configuracoes/procedimentos/novo", aviso: "Só a administradora altera esta tabela", semBotao: "Cadastrar procedimento" },
  { papel: "financeiro", rota: "/financeiro/taxas/nova", aviso: "Só a administradora altera esta tabela", semBotao: "Cadastrar taxa" },
];

test.describe("permissões por perfil, pela URL", () => {
  for (const caso of CASOS) {
    test(`${caso.papel} em ${caso.rota} vê acesso restrito`, async ({ browser }) => {
      const pagina = await comoPerfil(browser, caso.papel);
      await pagina.goto(caso.rota);
      await expect(pagina.getByText(caso.aviso).first()).toBeVisible();
      if (caso.semBotao) {
        await expect(pagina.getByRole("button", { name: caso.semBotao })).toHaveCount(0);
      }
      await fechar(pagina);
    });
  }

  test("financeiro vê despesas e o fluxo mensal, que são dele", async ({ browser }) => {
    const pagina = await comoPerfil(browser, "financeiro");
    await pagina.goto("/financeiro/despesas/nova");
    await expect(pagina.getByRole("button", { name: "Registrar despesa" })).toBeVisible();
    await pagina.goto("/financeiro/fluxo");
    await expect(pagina.getByText("Área do financeiro e da administradora")).toHaveCount(0);
    await fechar(pagina);
  });
});
