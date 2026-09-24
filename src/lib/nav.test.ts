import { describe, expect, it } from "vitest";
import { ATALHOS, MENU, MODULOS_DA_BARRA, MODULOS_EM_MAIS } from "./nav";

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

describe("menu — barra de módulos", () => {
  it("todo módulo tem lugar na barra do topo ou em Mais, sem repetir", () => {
    const hrefs = [...MODULOS_DA_BARRA, ...MODULOS_EM_MAIS].map((i) => i.href);
    expect(hrefs).toEqual(MENU.map((i) => i.href));
  });

  it("os atalhos de tecla não repetem letra", () => {
    const teclas = ATALHOS.map((a) => a.tecla);
    expect(new Set(teclas).size).toBe(teclas.length);
  });
});
