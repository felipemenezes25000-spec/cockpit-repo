import { describe, expect, it } from "vitest";
import { recortarFila } from "./fila";

describe("recortarFila", () => {
  it("mostra tudo e não oculta nada quando cabe no limite", () => {
    const fila = recortarFila([1, 2], ["a"], 5);
    expect(fila).toEqual({ tarefas: [1, 2], retornos: ["a"], tarefasOcultas: 0, retornosOcultos: 0 });
  });

  it("conta separadamente as tarefas e os retornos que ficaram de fora", () => {
    const fila = recortarFila([1, 2, 3, 4, 5, 6, 7], ["a", "b", "c", "d", "e", "f"], 5);
    expect(fila.tarefas).toEqual([1, 2, 3, 4, 5]);
    expect(fila.retornos).toEqual(["a", "b", "c", "d", "e"]);
    expect(fila.tarefasOcultas).toBe(2);
    expect(fila.retornosOcultos).toBe(1);
  });
});
