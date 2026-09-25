import { describe, expect, it } from "vitest";
import {
  ALTURA_CENA,
  CX,
  FAIXAS,
  LARGURA_FUNIL,
  X_BALAO,
  bordaDireita,
  costela,
  espiral,
  movimentoDaEspiral,
  pctX,
  pctY,
  proximaQualidade,
  raioNaAltura,
  voltaDaCostela,
} from "./funil-3d";

describe("geometria do funil 3D", () => {
  it("empilha as faixas de cima para baixo, estreitando", () => {
    for (let i = 0; i < FAIXAS.length; i++) {
      const f = FAIXAS[i];
      expect(f.yBase).toBeGreaterThan(f.yTopo);
      expect(f.rxBase).toBeLessThan(f.rxTopo);
      expect(f.ryTopo).toBeCloseTo(f.rxTopo * 0.2);
      const proxima = FAIXAS[i + 1];
      if (proxima) {
        expect(proxima.yTopo).toBeGreaterThan(f.yBase);
        expect(proxima.rxTopo).toBeLessThan(f.rxBase);
        // O lábio da faixa de baixo aparece no vão, logo abaixo da de cima.
        expect(proxima.frenteTopo).toBeGreaterThan(f.frenteBase);
      }
    }
    expect(CX - FAIXAS[0].rxTopo).toBeGreaterThanOrEqual(0);
    expect(CX + FAIXAS[0].rxTopo).toBeLessThanOrEqual(LARGURA_FUNIL);
    expect(FAIXAS[FAIXAS.length - 1].toqueBase).toBeLessThan(ALTURA_CENA);
  });

  it("divide a cena em faixas de toque contíguas, com o rótulo dentro da frente da faixa", () => {
    FAIXAS.forEach((f, i) => {
      expect(f.centroY).toBeGreaterThan(f.frenteTopo);
      expect(f.centroY).toBeLessThan(f.frenteBase);
      expect(f.centroY).toBeGreaterThan(f.toqueTopo);
      expect(f.centroY).toBeLessThan(f.toqueBase);
      if (i > 0) expect(f.toqueTopo).toBe(FAIXAS[i - 1].toqueBase);
    });
  });

  it("liga cada faixa ao balão com um traço que sai de fora do funil", () => {
    FAIXAS.forEach((f, i) => {
      const borda = bordaDireita(i, f.centroY);
      expect(borda).toBeGreaterThan(CX + f.rxBase - 0.001);
      expect(borda).toBeLessThan(CX + f.rxTopo + 0.001);
      expect(borda + 20).toBeLessThan(X_BALAO);
    });
  });

  it("acompanha o perfil do funil nos vãos entre as faixas", () => {
    const [a, b] = FAIXAS;
    expect(raioNaAltura(a.yTopo)).toBe(a.rxTopo);
    expect(raioNaAltura(a.yBase)).toBe(a.rxBase);
    const meioDoVao = (a.yBase + b.yTopo) / 2;
    expect(raioNaAltura(meioDoVao)).toBeLessThan(a.rxBase);
    expect(raioNaAltura(meioDoVao)).toBeGreaterThan(b.rxTopo);
  });

  it("gira os frisos em perspectiva: de frente no centro, somem quando passam por trás", () => {
    const f = FAIXAS[1];
    const frente = costela(f, 0);
    expect(frente.opacidade).toBe(1);
    const um = (n: number) => Math.round(n * 10) / 10;
    expect(frente.d).toBe(`M ${CX} ${um(f.frenteTopo)} L ${CX} ${um(f.frenteBase)}`);
    expect(costela(f, 180).opacidade).toBe(0);
    expect(costela(f, 90).opacidade).toBe(0);
    expect(costela(f, 45).opacidade).toBeGreaterThan(0);

    const volta = voltaDaCostela(f);
    expect(volta.valores.split(";")).toHaveLength(25);
    expect(volta.tempos.split(";")[0]).toBe("0");
    expect(volta.tempos.split(";").at(-1)).toBe("1");
    // Começa e termina na borda (invisível): o salto de volta nunca aparece.
    expect(volta.opacidades.split(";")[0]).toBe("0");
    expect(volta.opacidades.split(";").at(-1)).toBe("0");
  });

  it("desce a espiral de energia em tempo uniforme e a esconde atrás do funil", () => {
    const pontos = espiral(2, 0, 40);
    expect(pontos[0].y).toBeLessThan(pontos.at(-1)!.y);
    const movimento = movimentoDaEspiral(2, 0, 40);
    const chaves = movimento.keyPoints.split(";").map(Number);
    expect(chaves[0]).toBe(0);
    expect(chaves.at(-1)).toBe(1);
    chaves.slice(1).forEach((c, i) => expect(c).toBeGreaterThanOrEqual(chaves[i]));
    expect(movimento.keyTimes.split(";")).toHaveLength(40);
    expect(movimento.opacidades.split(";").map(Number).some((o) => o === 0)).toBe(true);
    expect(movimento.opacidades.split(";").map(Number).some((o) => o > 0.9)).toBe(true);
  });

  it("converte unidades da cena em porcentagem da caixa", () => {
    expect(pctX(310)).toBe("50%");
    expect(pctY(250)).toBe("50%");
  });
});

describe("qualidade do movimento", () => {
  it("começa leve, sobe com folga, desce sem fôlego e não sai de parada", () => {
    expect(proximaQualidade("leve", 58)).toBe("plena");
    expect(proximaQualidade("leve", 35)).toBe("leve");
    expect(proximaQualidade("leve", 25)).toBe("parada");
    expect(proximaQualidade("plena", 58)).toBe("plena");
    expect(proximaQualidade("plena", 24)).toBe("leve");
    expect(proximaQualidade("plena", 9)).toBe("parada");
    expect(proximaQualidade("parada", 60)).toBe("parada");
  });
});
