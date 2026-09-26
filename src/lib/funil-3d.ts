/**
 * Geometria do funil 3D da Captação, em unidades do viewBox da cena
 * (620 × 500). O funil ocupa x 24–376 (eixo em x = 200, com folga dos dois
 * lados para o brilho da borda não encostar no palco); de 400 a 620 ficam os
 * balões de cada etapa, ligados às faixas por um traço.
 *
 * Cada faixa é um tronco de cone visto de cima: a borda de cima e a de baixo
 * são elipses com altura = 20% da largura (a "perspectiva"). A frente da
 * faixa vai do arco de baixo da elipse de cima até o arco de baixo da elipse
 * de baixo. Tudo aqui é função pura, para o desenho e os botões por cima dele
 * usarem os mesmos números — e para os testes conferirem o alinhamento.
 */

export const LARGURA_CENA = 620;
export const LARGURA_FUNIL = 400;
export const ALTURA_CENA = 500;
export const CX = 200;
/** Onde o traço chega (o ponto); o balão começa 8 unidades depois. */
export const X_BALAO = 430;
export const PERSPECTIVA = 0.2;

export type Faixa = {
  rxTopo: number;
  rxBase: number;
  yTopo: number;
  yBase: number;
  ryTopo: number;
  ryBase: number;
  /** y do ponto mais baixo (frente) da elipse de cima e da de baixo. */
  frenteTopo: number;
  frenteBase: number;
  /** Centro visual da frente da faixa, onde vai o rótulo. */
  centroY: number;
  /** Faixa horizontal da cena que responde ao toque (contígua às vizinhas). */
  toqueTopo: number;
  toqueBase: number;
};

const BRUTAS: ReadonlyArray<readonly [number, number, number, number]> = [
  [176, 150, 96, 176],
  [144, 120, 190, 262],
  [114, 92, 276, 342],
  [86, 64, 356, 418],
];

export const FAIXAS: readonly Faixa[] = BRUTAS.map(([rxTopo, rxBase, yTopo, yBase], i) => {
  const ryTopo = rxTopo * PERSPECTIVA;
  const ryBase = rxBase * PERSPECTIVA;
  const frenteTopo = yTopo + ryTopo;
  const frenteBase = yBase + ryBase;
  const anterior = BRUTAS[i - 1];
  const toqueTopo = anterior ? anterior[3] + anterior[1] * PERSPECTIVA : yTopo - ryTopo;
  const toqueBase = i === BRUTAS.length - 1 ? frenteBase + 12 : frenteBase;
  return {
    rxTopo,
    rxBase,
    yTopo,
    yBase,
    ryTopo,
    ryBase,
    frenteTopo,
    frenteBase,
    centroY: (frenteTopo + frenteBase) / 2,
    toqueTopo,
    toqueBase,
  };
});

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Raio horizontal da superfície externa na altura y (interpola faixas e vãos). */
export function raioNaAltura(y: number): number {
  const primeira = FAIXAS[0];
  if (y <= primeira.yTopo) return primeira.rxTopo;
  for (let i = 0; i < FAIXAS.length; i++) {
    const f = FAIXAS[i];
    if (y <= f.yBase) {
      if (y >= f.yTopo) return f.rxTopo + ((f.rxBase - f.rxTopo) * (y - f.yTopo)) / (f.yBase - f.yTopo);
      const a = FAIXAS[i - 1];
      return a.rxBase + ((f.rxTopo - a.rxBase) * (y - a.yBase)) / (f.yTopo - a.yBase);
    }
  }
  return FAIXAS[FAIXAS.length - 1].rxBase;
}

/** x da borda direita da faixa na altura y. */
export function bordaDireita(i: number, y: number): number {
  const f = FAIXAS[i];
  const t = Math.min(1, Math.max(0, (y - f.yTopo) / (f.yBase - f.yTopo)));
  return CX + f.rxTopo + (f.rxBase - f.rxTopo) * t;
}

/** Frente da faixa (a superfície que se vê): arco de baixo da elipse de cima até o da de baixo. */
export function caminhoCorpo(f: Faixa): string {
  return [
    `M ${r1(CX - f.rxTopo)} ${r1(f.yTopo)}`,
    `A ${r1(f.rxTopo)} ${r1(f.ryTopo)} 0 0 0 ${r1(CX + f.rxTopo)} ${r1(f.yTopo)}`,
    `L ${r1(CX + f.rxBase)} ${r1(f.yBase)}`,
    `A ${r1(f.rxBase)} ${r1(f.ryBase)} 0 0 1 ${r1(CX - f.rxBase)} ${r1(f.yBase)}`,
    "Z",
  ].join(" ");
}

/** Arco de baixo de uma elipse (da esquerda para a direita), para filetes de luz. */
export function arcoFrente(rx: number, ry: number, y: number): string {
  return `M ${r1(CX - rx)} ${r1(y)} A ${r1(rx)} ${r1(ry)} 0 0 0 ${r1(CX + rx)} ${r1(y)}`;
}

/** Elipse inteira como caminho, começando à direita e descendo pela frente (sentido horário na tela). */
export function caminhoElipse(rx: number, ry: number, y: number): string {
  return [
    `M ${r1(CX + rx)} ${r1(y)}`,
    `A ${r1(rx)} ${r1(ry)} 0 1 1 ${r1(CX - rx)} ${r1(y)}`,
    `A ${r1(rx)} ${r1(ry)} 0 1 1 ${r1(CX + rx)} ${r1(y)}`,
  ].join(" ");
}

/**
 * Filete da superfície no ângulo `graus` (0 = bem de frente, positivo = para a
 * direita), da elipse de cima até a de baixo, e quanto ele aparece (0 atrás).
 */
export function costela(f: Faixa, graus: number): { d: string; opacidade: number } {
  const t = (graus * Math.PI) / 180;
  const s = Math.sin(t);
  const c = Math.cos(t);
  const d = `M ${r1(CX + f.rxTopo * s)} ${r1(f.yTopo + f.ryTopo * c)} L ${r1(CX + f.rxBase * s)} ${r1(f.yBase + f.ryBase * c)}`;
  return { d, opacidade: c > 0 ? Math.round(Math.pow(c, 1.4) * 100) / 100 : 0 };
}

/** Quadros (a cada 15°) de uma volta completa de um filete: para o `<animate>` do SVG. */
export function voltaDaCostela(f: Faixa): { valores: string; opacidades: string; tempos: string } {
  const passos = 24;
  const ds: string[] = [];
  const ops: number[] = [];
  const ts: string[] = [];
  for (let k = 0; k <= passos; k++) {
    const { d, opacidade } = costela(f, -90 + (360 * k) / passos);
    ds.push(d);
    ops.push(opacidade);
    ts.push(String(Math.round((k / passos) * 10000) / 10000));
  }
  return { valores: ds.join(";"), opacidades: ops.join(";"), tempos: ts.join(";") };
}

/**
 * Espiral de partículas descendo pela superfície: pontos (em tempo uniforme)
 * e a opacidade de cada um — some quando passa por trás do funil.
 */
export function espiral(voltas: number, faseGraus: number, amostras = 72) {
  const yIni = FAIXAS[0].yTopo + 10;
  const yFim = FAIXAS[FAIXAS.length - 1].yBase + 4;
  const pontos: Array<{ x: number; y: number; opacidade: number }> = [];
  for (let k = 0; k < amostras; k++) {
    const t = k / (amostras - 1);
    const y = yIni + (yFim - yIni) * t;
    const rx = raioNaAltura(y) + 5;
    const ang = ((faseGraus + 360 * voltas * t) * Math.PI) / 180;
    const c = Math.cos(ang);
    pontos.push({
      x: r1(CX + rx * Math.sin(ang)),
      y: r1(y + rx * PERSPECTIVA * c),
      opacidade: c > 0.05 ? Math.round(Math.min(1, c * 1.6) * 100) / 100 : 0,
    });
  }
  return pontos;
}

/** Caminho da espiral + keyPoints/keyTimes para o movimento sair em tempo uniforme. */
export function movimentoDaEspiral(voltas: number, faseGraus: number, amostras = 72) {
  const pontos = espiral(voltas, faseGraus, amostras);
  const d = pontos.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const acumulado = [0];
  for (let i = 1; i < pontos.length; i++) {
    acumulado.push(acumulado[i - 1] + Math.hypot(pontos[i].x - pontos[i - 1].x, pontos[i].y - pontos[i - 1].y));
  }
  const total = acumulado[acumulado.length - 1] || 1;
  return {
    d,
    keyPoints: acumulado.map((a) => String(Math.round((a / total) * 10000) / 10000)).join(";"),
    keyTimes: pontos.map((_, i) => String(Math.round((i / (pontos.length - 1)) * 10000) / 10000)).join(";"),
    opacidades: pontos.map((p) => p.opacidade).join(";"),
  };
}

/** Posições em % da cena (para o que é HTML por cima do SVG). */
export const pctX = (x: number) => `${Math.round((x / LARGURA_CENA) * 100000) / 1000}%`;
export const pctY = (y: number) => `${Math.round((y / ALTURA_CENA) * 100000) / 1000}%`;

/**
 * Qualidade do movimento conforme o aparelho aguenta: `plena` (tudo),
 * `leve` (sem estrelas piscando, frisos parados, menos partículas) e
 * `parada` (o desenho fica estático). O funil começa leve; com folga
 * (45+ quadros por segundo) sobe para a plena; abaixo de 30 no leve, para —
 * é decoração, e decoração engasgando é pior que parada. Assim o aparelho
 * fraco nunca passa pelo trecho pesado.
 */
export type QualidadeDoFunil = "plena" | "leve" | "parada";

export const QUALIDADES: readonly QualidadeDoFunil[] = ["plena", "leve", "parada"];

export function proximaQualidade(atual: QualidadeDoFunil, fps: number): QualidadeDoFunil {
  if (atual === "leve") return fps >= 45 ? "plena" : fps < 30 ? "parada" : "leve";
  if (atual === "plena" && fps < 30) return fps < 14 ? "parada" : "leve";
  return atual;
}
