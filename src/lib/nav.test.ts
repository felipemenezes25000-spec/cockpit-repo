import { describe, expect, it } from "vitest";
import { MENU } from "./nav";

describe("menu — módulo provisório avisa antes do clique", () => {
  it("só Relatórios está marcado como em construção", () => {
    expect(MENU.filter((i) => i.emConstrucao).map((i) => i.href)).toEqual(["/relatorios"]);
  });

  it("todo módulo em construção diz o que vai trazer, sem beco sem saída", () => {
    for (const item of MENU.filter((i) => i.emConstrucao)) {
      expect(item.finalidade.length).toBeGreaterThan(0);
      expect(item.proximosPassos.length).toBeGreaterThan(0);
    }
  });
});
