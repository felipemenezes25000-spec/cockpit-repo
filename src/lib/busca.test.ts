import { describe, expect, it } from "vitest";
import { semAcento, termoDeBusca } from "./busca";

describe("semAcento", () => {
  it("tira acento e cedilha e passa para minúsculas, como a coluna pacientes.busca", () => {
    expect(semAcento("Maria da Conceição Ávila")).toBe("maria da conceicao avila");
    expect(semAcento("JOÃO Ênio Günther")).toBe("joao enio gunther");
  });

  it("termo já sem acento continua igual (só minúsculas)", () => {
    expect(semAcento("Conceicao")).toBe("conceicao");
  });

  it("não devolve nada da gramática do filtro que o termo seguro já tirou", () => {
    expect(semAcento(termoDeBusca("Conceição, (teste)*%"))).toBe("conceicao teste");
  });
});
