/**
 * A rubrica desenhada no quadro, como traçado.
 *
 * O quadro tem proporção fixa 5:2 e o traçado é guardado em coordenadas
 * inteiras de 0 a 1000 (largura) por 0 a 400 (altura): o mesmo desenho
 * reaparece igual em qualquer tela, com `viewBox="0 0 1000 400"`.
 *
 * O formato é o que o banco aceita (`private.rubrica_valida`, 0032):
 * "M x y L x y ..." e vários traços separados por espaço. Só esses
 * caracteres — é desenhado num <path> da aplicação, nunca como SVG vindo de
 * fora.
 */

export const LARGURA_DA_RUBRICA = 1000;
export const ALTURA_DA_RUBRICA = 400;

export type Ponto = { x: number; y: number };

/** Mesma expressão da CHECK do banco. */
const FORMATO = /^M[0-9]{1,4} [0-9]{1,4}( ?[ML][0-9]{1,4} [0-9]{1,4})*$/;

export function rubricaValida(caminho: string | null | undefined): boolean {
  if (caminho == null) return true;
  return caminho.length >= 12 && caminho.length <= 40000 && FORMATO.test(caminho);
}

/**
 * Traços em pixels do quadro → caminho normalizado. Descarta pontos a menos
 * de 2 unidades do anterior (o traço continua o mesmo e o texto encolhe) e
 * traço de um ponto só vira um ponto visível (um "L" para o lado).
 */
export function caminhoDaRubrica(tracos: Ponto[][], largura: number, altura: number): string {
  if (largura <= 0 || altura <= 0) return "";
  const escalaX = LARGURA_DA_RUBRICA / largura;
  const escalaY = ALTURA_DA_RUBRICA / altura;
  const limitar = (valor: number, maximo: number) => Math.max(0, Math.min(maximo, Math.round(valor)));

  const partes: string[] = [];
  for (const traco of tracos) {
    if (traco.length === 0) continue;
    const pontos: Ponto[] = [];
    for (const ponto of traco) {
      const p = { x: limitar(ponto.x * escalaX, LARGURA_DA_RUBRICA), y: limitar(ponto.y * escalaY, ALTURA_DA_RUBRICA) };
      const anterior = pontos.at(-1);
      if (!anterior || Math.hypot(p.x - anterior.x, p.y - anterior.y) >= 2) pontos.push(p);
    }
    if (pontos.length === 1) pontos.push({ x: Math.min(LARGURA_DA_RUBRICA, pontos[0].x + 1), y: pontos[0].y });
    partes.push(pontos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(""));
  }
  return partes.join(" ");
}

/**
 * Um desenho de verdade, não um toque acidental: pelo menos 12 pontos no
 * total e alguma extensão (a caixa que o envolve passa de 60 unidades).
 */
export function rubricaSuficiente(tracos: Ponto[][]): boolean {
  const pontos = tracos.flat();
  if (pontos.length < 12) return false;
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  return Math.max(...xs) - Math.min(...xs) > 30 || Math.max(...ys) - Math.min(...ys) > 30;
}
