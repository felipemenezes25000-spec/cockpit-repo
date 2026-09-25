import { useId, type CSSProperties, type Ref } from "react";
import {
  ALTURA_CENA,
  CX,
  FAIXAS,
  LARGURA_CENA,
  X_BALAO,
  arcoFrente,
  bordaDireita,
  caminhoCorpo,
  caminhoElipse,
  costela,
  movimentoDaEspiral,
  voltaDaCostela,
} from "@/lib/funil-3d";

/**
 * O desenho do funil 3D da Captação. É decorativo (aria-hidden): quem lê a
 * tela usa os botões por cima dele.
 *
 * Toda animação é SMIL, com períodos que dividem 6 s — a cena inteira se
 * repete a cada 6 s (as costelas dão uma volta em 12 s, mas são 6 iguais a
 * 60°) — e `svg.setCurrentTime(t)` congela qualquer instante. As cores vêm
 * dos tokens `--color-funil-*` de globals.css (AGENTS.md §7.3).
 *
 * Nenhum filtro (blur, sombra) na cena: com tudo se mexendo, o WebKit refazia
 * o desfoque na CPU a cada quadro e caía a 9 fps. Brilho aqui é degradê
 * radial ou traço em camadas — mesmo efeito, custo de pintura comum.
 */

const COSTELAS = 6;
const VOLTA_S = 12;
const CICLO = "6s";

const r = (n: number, casas = 3) => Math.round(n * 10 ** casas) / 10 ** casas;
const cor = (nome: string) => `var(--color-funil-${nome})`;
const pinta = (nome: string): CSSProperties => ({ fill: cor(nome) });
const risca = (nome: string): CSSProperties => ({ stroke: cor(nome) });
const tom = (nome: string): CSSProperties => ({ stopColor: cor(nome) });

/** Pseudoaleatório determinístico (a mesma cena no servidor e no navegador). */
function sorteio(i: number, sal: number): number {
  const v = Math.sin(i * 12.9898 + sal * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** Estrelas só onde não há texto: sobre o funil, no alto e no rodapé do palco. */
const ESTRELAS = Array.from({ length: 24 }, (_, i) => {
  const zona = i % 3;
  const x = zona === 0 ? 12 + sorteio(i, 1) * 400 : 12 + sorteio(i, 1) * 596;
  const y = zona === 1 ? 8 + sorteio(i, 2) * 64 : zona === 2 ? 446 + sorteio(i, 2) * 46 : 60 + sorteio(i, 2) * 390;
  return {
    x: r(x, 1),
    y: r(y, 1),
    raio: r(0.6 + (i % 4) * 0.35, 2),
    dur: ["2s", "3s", "6s"][i % 3],
    inicio: `-${r((i * 0.37) % 3, 2)}s`,
  };
});

/** Estrelas de quatro pontas, maiores, que acendem de vez em quando. */
const CINTILAS = [
  { x: 36, y: 96, t: 7, inicio: "0s" },
  { x: 410, y: 40, t: 6, inicio: "-2s" },
  { x: 590, y: 28, t: 8, inicio: "-4s" },
  { x: 28, y: 330, t: 5, inicio: "-1s" },
  { x: 386, y: 452, t: 6, inicio: "-3s" },
  { x: 600, y: 470, t: 7, inicio: "-5s" },
];

const LEADS = [
  { de: [34, 36], para: [150, 102], controle: [74, 62] },
  { de: [100, 12], para: [182, 106], controle: [132, 40] },
  { de: [212, 8], para: [204, 100], controle: [218, 44] },
  { de: [306, 14], para: [228, 106], controle: [276, 44] },
  { de: [370, 40], para: [252, 101], controle: [336, 66] },
] as const;

/** Partículas sugadas pelo vórtice: espiral para dentro da boca. */
function sugada(k: number): string {
  const pontos: string[] = [];
  const passos = 28;
  for (let i = 0; i < passos; i++) {
    const t = i / (passos - 1);
    const raio = 168 * (1 - t) + 8;
    const ang = ((k * 45 + t * 540) * Math.PI) / 180;
    pontos.push(`${i ? "L" : "M"} ${r(CX + raio * Math.cos(ang), 1)} ${r(100 + t * 8 + raio * 0.19 * Math.sin(ang), 1)}`);
  }
  return pontos.join(" ");
}
const SUGADAS = Array.from({ length: 8 }, (_, k) => ({ d: sugada(k), inicio: `-${r(k * 0.375, 3)}s` }));

const MOEDAS = [-14, 10, -4, 16].map((dx, i) => ({
  de: [CX + dx, FAIXAS[3].yBase - 6],
  para: [CX + dx * 2.6, 468],
  inicio: `-${r(i * 0.75, 2)}s`,
}));

const MOEDAS_FUNDO = [
  { x: 34, y: 236, escala: 1.2, inicio: "0s" },
  { x: 376, y: 300, escala: 1, inicio: "-2s" },
  { x: 56, y: 404, escala: 0.85, inicio: "-4s" },
];

const ESPIRAIS = Array.from({ length: 8 }, (_, k) => ({
  movimento: movimentoDaEspiral(2.2, k * 45),
  inicio: `-${r(k * 0.75, 2)}s`,
}));

const VORTICE = [
  { rx: 152, ry: 28, cy: 100, traco: "46 38", dur: "6s", forca: 0.34 },
  { rx: 112, ry: 21, cy: 103, traco: "30 26", dur: "3s", forca: 0.46 },
  { rx: 74, ry: 14, cy: 106, traco: "20 16", dur: "2s", forca: 0.58 },
  { rx: 40, ry: 7.5, cy: 108, traco: "12 10", dur: "1.5s", forca: 0.72 },
];

function Moeda({ raio, desenho }: { raio: number; desenho: string }) {
  return (
    <g>
      <circle r={raio} style={{ fill: desenho, stroke: cor("ouro-luz") }} strokeWidth={raio * 0.1} />
      <circle r={raio * 0.74} fill="none" style={risca("ouro-escuro")} strokeOpacity={0.45} strokeWidth={raio * 0.08} />
      <text y={raio * 0.32} textAnchor="middle" fontSize={raio * 0.86} fontWeight={800} style={pinta("ouro-texto")} fontFamily="inherit">
        R$
      </text>
    </g>
  );
}

export function CenaFunil3d({
  selecionada,
  destaque,
  animar,
  leve = false,
  fluxo,
  toques = 0,
  svgRef,
}: {
  selecionada: number;
  destaque: number | null;
  animar: boolean;
  /** Aparelho sem fôlego: sem estrelas piscando, frisos parados, metade das partículas. */
  leve?: boolean;
  fluxo: boolean;
  /** Quantas vezes a etapa foi trocada: cada troca solta uma onda de luz na faixa nova. */
  toques?: number;
  svgRef?: Ref<SVGSVGElement>;
}) {
  const base = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (nome: string) => `${base}-${nome}`;
  const url = (nome: string) => `url(#${id(nome)})`;
  const movendo = animar && fluxo;
  const detalhe = animar && !leve;
  const boca = FAIXAS[0];
  const bocaRx = boca.rxTopo - 12;
  const bocaRy = boca.ryTopo - 2.6;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${LARGURA_CENA} ${ALTURA_CENA}`}
      aria-hidden="true"
      focusable="false"
      data-funil-3d=""
    >
      <defs>
        <linearGradient id={id("corpo")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={tom("profundo")} />
          <stop offset="0.14" style={tom("escuro")} />
          <stop offset="0.34" style={tom("medio")} />
          <stop offset="0.46" style={tom("claro")} />
          <stop offset="0.56" style={tom("vivo")} />
          <stop offset="0.78" style={tom("escuro")} />
          <stop offset="1" style={tom("profundo")} />
        </linearGradient>
        <linearGradient id={id("sombra-v")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={tom("luz")} stopOpacity="0.24" />
          <stop offset="0.38" style={tom("luz")} stopOpacity="0" />
          <stop offset="1" style={tom("sombra")} stopOpacity="0.36" />
        </linearGradient>
        <linearGradient id={id("aro")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: "var(--color-cabine-linha)" }} />
          <stop offset="0.38" style={tom("gelo")} />
          <stop offset="0.5" style={tom("luz")} />
          <stop offset="0.62" style={tom("gelo")} />
          <stop offset="1" style={{ stopColor: "var(--color-cabine-linha)" }} />
        </linearGradient>
        <linearGradient id={id("interior")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={tom("noite")} />
          <stop offset="1" style={tom("profundo")} />
        </linearGradient>
        <radialGradient id={id("boca")} cx="0.5" cy="0.62" r="0.62">
          <stop offset="0" style={tom("abismo")} />
          <stop offset="0.55" style={tom("noite")} />
          <stop offset="1" style={tom("escuro")} />
        </radialGradient>
        <radialGradient id={id("brilho-centro")}>
          <stop offset="0" style={tom("gelo")} stopOpacity="0.9" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("holofote")}>
          <stop offset="0" style={tom("claro")} stopOpacity="0.42" />
          <stop offset="0.6" style={tom("vivo")} stopOpacity="0.12" />
          <stop offset="1" style={tom("medio")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("base")}>
          <stop offset="0" style={tom("gelo")} stopOpacity="0.95" />
          <stop offset="0.35" style={tom("claro")} stopOpacity="0.5" />
          <stop offset="1" style={tom("vivo")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("ponta")}>
          <stop offset="0" style={tom("ouro-luz")} stopOpacity="0.95" />
          <stop offset="0.4" style={tom("claro")} stopOpacity="0.5" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("moeda")} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" style={tom("ouro-luz")} />
          <stop offset="0.42" style={tom("ouro-claro")} />
          <stop offset="0.8" style={tom("ouro")} />
          <stop offset="1" style={tom("ouro-escuro")} />
        </radialGradient>
        <radialGradient id={id("ficha")} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" style={tom("luz")} />
          <stop offset="1" style={tom("gelo")} />
        </radialGradient>
        <linearGradient id={id("varredura")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={tom("luz")} stopOpacity="0" />
          <stop offset="0.5" style={tom("luz")} stopOpacity="0.5" />
          <stop offset="1" style={tom("luz")} stopOpacity="0" />
        </linearGradient>
        {LEADS.map((l, i) => (
          <linearGradient key={i} id={id(`trilha-${i}`)} gradientUnits="userSpaceOnUse" x1={l.de[0]} y1={l.de[1]} x2={l.para[0]} y2={l.para[1]}>
            <stop offset="0" style={tom("gelo")} stopOpacity="0" />
            <stop offset="0.55" style={tom("gelo")} stopOpacity="0.55" />
            <stop offset="1" style={tom("luz")} stopOpacity="0.9" />
          </linearGradient>
        ))}
        <radialGradient id={id("faisca")}>
          <stop offset="0" style={tom("luz")} stopOpacity="1" />
          <stop offset="0.35" style={tom("luz")} stopOpacity="0.9" />
          <stop offset="0.6" style={tom("claro")} stopOpacity="0.35" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        <marker id={id("seta")} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" style={pinta("gelo")} />
        </marker>
        {FAIXAS.map((f, i) => (
          <clipPath key={i} id={id(`corpo-${i}`)}>
            <path d={caminhoCorpo(f)} />
          </clipPath>
        ))}
        <clipPath id={id("boca-recorte")}>
          <ellipse cx={CX} cy={boca.yTopo} rx={bocaRx} ry={bocaRy} />
        </clipPath>
      </defs>

      {/* céu: estrelas, cintilas e o holofote atrás do funil */}
      {ESTRELAS.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={e.raio} style={pinta("gelo")} opacity={detalhe ? 0.2 : 0.45}>
          {detalhe ? <animate attributeName="opacity" values="0.15;0.95;0.15" dur={e.dur} begin={e.inicio} repeatCount="indefinite" /> : null}
        </circle>
      ))}
      {CINTILAS.map((c, i) => (
        <path
          key={i}
          d={`M ${c.x} ${c.y - c.t} Q ${c.x} ${c.y} ${c.x + c.t} ${c.y} Q ${c.x} ${c.y} ${c.x} ${c.y + c.t} Q ${c.x} ${c.y} ${c.x - c.t} ${c.y} Q ${c.x} ${c.y} ${c.x} ${c.y - c.t} z`}
          style={pinta("luz")}
          opacity={detalhe ? 0 : 0.5}
        >
          {detalhe ? <animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.4;0.5;0.6;1" dur={CICLO} begin={c.inicio} repeatCount="indefinite" /> : null}
        </path>
      ))}
      {CINTILAS.map((c, i) => (
        <circle key={`brilho-${i}`} cx={c.x} cy={c.y} r={c.t * 1.3} fill={url("faisca")} opacity={detalhe ? 0 : 0.3}>
          {detalhe ? <animate attributeName="opacity" values="0;0;0.7;0;0" keyTimes="0;0.4;0.5;0.6;1" dur={CICLO} begin={c.inicio} repeatCount="indefinite" /> : null}
        </circle>
      ))}
      <ellipse cx={CX} cy={262} rx={300} ry={250} fill={url("holofote")} />

      {/* moedas ao fundo, flutuando e girando */}
      {MOEDAS_FUNDO.map((m, i) => (
        <g key={i} transform={`translate(${m.x} ${m.y}) scale(${m.escala})`} opacity={0.68}>
          <g>
            {animar ? (
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -9;0 0" dur={CICLO} begin={m.inicio} repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
            ) : null}
            <g>
              {animar ? <animateTransform attributeName="transform" type="scale" values="1 1;0.2 1;1 1" dur="3s" begin={m.inicio} repeatCount="indefinite" /> : null}
              <Moeda raio={15} desenho={url("moeda")} />
            </g>
          </g>
        </g>
      ))}

      {/* plataforma de saída: brilho, anel e uma onda a cada moeda */}
      <ellipse cx={CX} cy={470} rx={176} ry={24} fill={url("base")} opacity={0.8}>
        {animar ? <animate attributeName="opacity" values="0.65;1;0.65" dur="3s" repeatCount="indefinite" /> : null}
      </ellipse>
      <ellipse cx={CX} cy={470} rx={118} ry={15} fill="none" style={risca("gelo")} strokeOpacity={0.55} strokeWidth={1.4} />
      {movendo
        ? [0, 1, 2, 3].map((k) => (
            <ellipse key={k} cx={CX} cy={470} rx={20} ry={4} fill="none" style={risca("gelo")} strokeWidth={1.6} opacity={0}>
              <animate attributeName="rx" values="16;150" dur="3s" begin={`-${k * 0.75}s`} repeatCount="indefinite" />
              <animate attributeName="ry" values="3;20" dur="3s" begin={`-${k * 0.75}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="3s" begin={`-${k * 0.75}s`} repeatCount="indefinite" />
            </ellipse>
          ))
        : null}

      {/* brilho na ponta, por onde saem as moedas */}
      <ellipse cx={CX} cy={FAIXAS[3].yBase + 12} rx={58} ry={16} fill={url("ponta")} opacity={movendo ? 0.7 : 0.45}>
        {movendo ? <animate attributeName="opacity" values="0.45;0.95;0.45" dur="0.75s" repeatCount="indefinite" /> : null}
      </ellipse>

      {/* moedas saindo pela ponta (atrás da última faixa: aparecem ao passar da borda) */}
      {movendo
        ? MOEDAS.map((m, i) => (
            <g key={i}>
              <g opacity={0}>
                <animateMotion
                  path={`M ${m.de[0]} ${m.de[1]} Q ${(m.de[0] + m.para[0]) / 2} ${m.de[1] + 8} ${m.para[0]} ${m.para[1]}`}
                  keyPoints="0;1;1"
                  keyTimes="0;0.32;1"
                  calcMode="spline"
                  keySplines="0.55 0 1 1;0 0 1 1"
                  dur="3s"
                  begin={m.inicio}
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.04;0.3;0.42;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
                <g>
                  <animateTransform attributeName="transform" type="scale" values="1 1;0.14 1;1 1" dur="0.5s" repeatCount="indefinite" />
                  <Moeda raio={11} desenho={url("moeda")} />
                </g>
              </g>
              <ellipse cx={m.para[0]} cy={m.para[1] + 2} rx={0} ry={0} fill="none" style={risca("ouro-luz")} strokeWidth={1.6} opacity={0}>
                <animate attributeName="rx" values="0;0;30;30" keyTimes="0;0.32;0.56;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
                <animate attributeName="ry" values="0;0;7;7" keyTimes="0;0.32;0.56;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0.95;0;0" keyTimes="0;0.32;0.56;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
              </ellipse>
            </g>
          ))
        : null}

      {/* faixas, de baixo para cima (a de cima cobre a borda de trás da de baixo) */}
      {[3, 2, 1, 0].map((i) => {
        const f = FAIXAS[i];
        const sel = i === selecionada;
        const sobre = !sel && i === destaque;
        const corpo = caminhoCorpo(f);
        const volta = voltaDaCostela(f);
        const labio = i === 0 ? 12 : 24;
        return (
          <g key={i} data-faixa={i} data-sel={sel ? "sim" : undefined}>
            <g style={{ transition: "opacity 320ms ease" }} opacity={sel ? 1 : sobre ? 0.55 : 0}>
              <path d={corpo} fill="none" style={risca("claro")} strokeWidth={26} strokeOpacity={0.12} strokeLinejoin="round" />
              <path d={corpo} fill="none" style={risca("claro")} strokeWidth={14} strokeOpacity={0.2} strokeLinejoin="round" />
              <path d={corpo} fill="none" style={risca("gelo")} strokeWidth={6} strokeOpacity={0.35} strokeLinejoin="round" />
            </g>
            {i === 0 ? (
              <g opacity={0.6}>
                {animar ? <animate attributeName="opacity" values="0.35;0.85;0.35" dur="3s" repeatCount="indefinite" /> : null}
                <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo + 4} ry={f.ryTopo + 3} fill="none" style={risca("claro")} strokeWidth={16} strokeOpacity={0.14} />
                <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo + 1} ry={f.ryTopo + 1} fill="none" style={risca("claro")} strokeWidth={7} strokeOpacity={0.3} />
              </g>
            ) : null}
            {/* borda de cima (lábio) */}
            <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo} ry={f.ryTopo} fill={url("aro")} />
            {i === 0 ? (
              <>
                <ellipse cx={CX} cy={f.yTopo} rx={bocaRx} ry={bocaRy} fill={url("boca")} />
                <g clipPath={url("boca-recorte")}>
                  <g>
                    {VORTICE.map((a, k) => {
                      const passo = a.traco.split(" ").reduce((s, v) => s + Number(v), 0) * 2;
                      return (
                        <g key={k}>
                          <ellipse cx={CX} cy={a.cy} rx={a.rx} ry={a.ry} fill="none" style={risca("claro")} strokeOpacity={a.forca * 0.35} strokeWidth={5} strokeDasharray={a.traco} strokeLinecap="round">
                            {animar ? <animate attributeName="stroke-dashoffset" values={`0;${passo}`} dur={a.dur} repeatCount="indefinite" /> : null}
                          </ellipse>
                          <ellipse cx={CX} cy={a.cy} rx={a.rx} ry={a.ry} fill="none" style={risca("gelo")} strokeOpacity={a.forca} strokeWidth={1.4} strokeDasharray={a.traco} strokeLinecap="round">
                            {animar ? <animate attributeName="stroke-dashoffset" values={`0;${passo}`} dur={a.dur} repeatCount="indefinite" /> : null}
                          </ellipse>
                        </g>
                      );
                    })}
                    {movendo
                      ? SUGADAS.map((p, k) => (
                          <circle key={k} r={2} style={pinta("luz")} opacity={0}>
                            <animateMotion path={p.d} dur="3s" begin={p.inicio} repeatCount="indefinite" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.5 0 0.9 0.6" />
                            <animate attributeName="opacity" values="0;0.95;0.9;0" keyTimes="0;0.15;0.8;1" dur="3s" begin={p.inicio} repeatCount="indefinite" />
                            <animate attributeName="r" values="2.4;2;0.6" keyTimes="0;0.6;1" dur="3s" begin={p.inicio} repeatCount="indefinite" />
                          </circle>
                        ))
                      : null}
                  </g>
                  <circle cx={CX} cy={110} r={30} fill={url("brilho-centro")}>
                    {animar ? (
                      <>
                        <animate attributeName="r" values="24;36;24" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.65;1;0.65" dur="3s" repeatCount="indefinite" />
                      </>
                    ) : null}
                  </circle>
                </g>
              </>
            ) : (
              <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo - labio} ry={Math.max(2, f.ryTopo - 6)} fill={url("interior")} />
            )}
            <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo} ry={f.ryTopo} fill="none" style={risca("luz")} strokeOpacity={0.85} strokeWidth={1.4} />
            {/* frente da faixa */}
            <path d={corpo} fill={url("corpo")} />
            <path d={corpo} fill={url("sombra-v")} />
            <path d={corpo} style={{ ...pinta("luz"), transition: "opacity 320ms ease" }} opacity={sel ? 0.16 : sobre ? 0.08 : 0} />
            <g clipPath={url(`corpo-${i}`)}>
              {Array.from({ length: COSTELAS }, (_, k) => {
                if (!detalhe) {
                  const fixa = costela(f, -75 + k * 30);
                  return <path key={k} d={fixa.d} style={risca("luz")} strokeOpacity={r(0.3 * fixa.opacidade)} strokeWidth={1.3} />;
                }
                const inicio = `-${r((VOLTA_S / COSTELAS) * k, 2)}s`;
                return (
                  <path key={k} d={costela(f, -90).d} style={risca("luz")} strokeWidth={1.3} strokeOpacity={0}>
                    <animate attributeName="d" values={volta.valores} keyTimes={volta.tempos} dur={`${VOLTA_S}s`} begin={inicio} repeatCount="indefinite" />
                    <animate
                      attributeName="stroke-opacity"
                      values={volta.opacidades.split(";").map((o) => r(Number(o) * 0.42)).join(";")}
                      keyTimes={volta.tempos}
                      dur={`${VOLTA_S}s`}
                      begin={inicio}
                      repeatCount="indefinite"
                    />
                  </path>
                );
              })}
              {animar ? (
                <rect x={CX - f.rxTopo - 130} y={f.yTopo - 50} width={96} height={f.frenteBase - f.yTopo + 70} fill={url("varredura")} transform="skewX(-16)" opacity={0.9}>
                  <animateTransform
                    attributeName="transform"
                    type="translate"
                    values={`0 0;${r(f.rxTopo * 2 + 260)} 0;${r(f.rxTopo * 2 + 260)} 0`}
                    keyTimes="0;0.3;1"
                    dur={CICLO}
                    begin={`${r(i * 0.16, 2)}s`}
                    repeatCount="indefinite"
                    additive="sum"
                    calcMode="spline"
                    keySplines="0.45 0 0.55 1;0 0 1 1"
                  />
                </rect>
              ) : null}
            </g>
            <path d={arcoFrente(f.rxBase, f.ryBase, f.yBase)} fill="none" style={risca("gelo")} strokeOpacity={0.6} strokeWidth={1.5} />
            <path
              d={`M ${r(CX - f.rxTopo, 1)} ${f.yTopo} L ${r(CX - f.rxBase, 1)} ${f.yBase} M ${r(CX + f.rxTopo, 1)} ${f.yTopo} L ${r(CX + f.rxBase, 1)} ${f.yBase}`}
              fill="none"
              style={risca("gelo")}
              strokeOpacity={0.5}
              strokeWidth={1.3}
              strokeLinecap="round"
            />
            {sel ? (
              <path d={corpo} fill="none" style={risca("luz")} strokeWidth={2.2} strokeOpacity={0.9}>
                {animar ? <animate attributeName="stroke-opacity" values="0.35;1;0.35" dur="1.5s" repeatCount="indefinite" /> : null}
              </path>
            ) : null}
            {sel && animar && toques > 0 ? (
              <path key={`onda-${toques}`} d={corpo} fill="none" style={risca("luz")} strokeWidth={3} data-onda="" />
            ) : null}
          </g>
        );
      })}

      {/* energia descendo em espiral pela superfície */}
      {movendo
        ? ESPIRAIS.filter((_, k) => !leve || k % 2 === 0).map((p, k) => (
            <circle key={k} r={5.5} fill={url("faisca")} opacity={0}>
              <animateMotion path={p.movimento.d} keyPoints={p.movimento.keyPoints} keyTimes={p.movimento.keyTimes} calcMode="linear" dur={CICLO} begin={p.inicio} repeatCount="indefinite" />
              <animate attributeName="opacity" values={p.movimento.opacidades} keyTimes={p.movimento.keyTimes} calcMode="linear" dur={CICLO} begin={p.inicio} repeatCount="indefinite" />
            </circle>
          ))
        : null}

      {/* brilhos girando nas bordas (apagados quando passam por trás) */}
      {detalhe
        ? FAIXAS.flatMap((f, i) => {
            const dur = i % 2 === 0 ? 6 : 3;
            return [0, 1].map((k) => {
              const inicio = `-${r((dur / 2) * k + i * 0.4, 2)}s`;
              return (
                <circle key={`${i}-${k}`} r={6} fill={url("faisca")}>
                  <animateMotion path={caminhoElipse(f.rxTopo, f.ryTopo, f.yTopo)} keyPoints="1;0" keyTimes="0;1" calcMode="linear" dur={`${dur}s`} begin={inicio} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.18;0.18;1;1;0.18" keyTimes="0;0.47;0.56;0.96;1" dur={`${dur}s`} begin={inicio} repeatCount="indefinite" />
                </circle>
              );
            });
          })
        : null}

      {/* leads entrando pela boca */}
      {movendo
        ? LEADS.map((l, i) => {
            const caminho = `M ${l.de[0]} ${l.de[1]} Q ${l.controle[0]} ${l.controle[1]} ${l.para[0]} ${l.para[1]}`;
            const inicio = `-${r(i * 1.2, 2)}s`;
            const pessoa = pinta(`lead-${i + 1}`);
            return (
              <g key={i}>
                <path d={caminho} fill="none" stroke={url(`trilha-${i}`)} strokeWidth={2.2} strokeDasharray="7 6" strokeLinecap="round" markerEnd={url("seta")}>
                  <animate attributeName="stroke-dashoffset" values="0;-26" dur="1.5s" repeatCount="indefinite" />
                </path>
                <g opacity={0}>
                  <animateMotion path={caminho} keyPoints="0;1;1" keyTimes="0;0.42;1" calcMode="spline" keySplines="0.35 0 0.65 1;0 0 1 1" dur={CICLO} begin={inicio} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.05;0.35;0.43;1" dur={CICLO} begin={inicio} repeatCount="indefinite" />
                  <g>
                    <animateTransform attributeName="transform" type="scale" values="0.7;1;1;0.35;0.35" keyTimes="0;0.08;0.28;0.42;1" dur={CICLO} begin={inicio} repeatCount="indefinite" />
                    <g>
                      <circle cy={2.6} r={15.6} style={pinta("sombra")} opacity={0.35} />
                      <circle r={15} fill={url("ficha")} style={risca("luz")} strokeWidth={2} />
                      <circle cy={-3.6} r={4.8} style={pessoa} />
                      <path d="M -8.2 10 a 8.2 6.6 0 0 1 16.4 0 z" style={pessoa} />
                    </g>
                  </g>
                </g>
              </g>
            );
          })
        : null}

      {/* traços até os balões */}
      {FAIXAS.map((f, i) => {
        const sel = i === selecionada;
        const x0 = r(bordaDireita(i, f.centroY) + 7, 1);
        const x1 = X_BALAO - 4;
        return (
          <g key={i} data-traco="" opacity={sel ? 1 : 0.62} style={{ transition: "opacity 320ms ease" }}>
            <line x1={x0} y1={f.centroY} x2={x1} y2={f.centroY} style={risca("gelo")} strokeWidth={sel ? 1.8 : 1.3} strokeDasharray={sel ? "4 5" : undefined}>
              {sel && animar ? <animate attributeName="stroke-dashoffset" values="0;-18" dur="1.5s" repeatCount="indefinite" /> : null}
            </line>
            <circle cx={x0} cy={f.centroY} r={3.4} style={pinta("luz")}>
              {sel && animar ? <animate attributeName="r" values="3;5.2;3" dur="1.5s" repeatCount="indefinite" /> : null}
            </circle>
            <circle cx={x1} cy={f.centroY} r={2.2} style={pinta("luz")} />
          </g>
        );
      })}
    </svg>
  );
}
