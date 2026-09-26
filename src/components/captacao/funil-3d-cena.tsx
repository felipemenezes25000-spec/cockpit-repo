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
 * repete a cada 6 s (as costelas e o vórtice dão uma volta em 12 s, mas são
 * 6 iguais a 60°) — e `svg.setCurrentTime(t)` congela qualquer instante. As
 * cores vêm dos tokens `--color-funil-*` de globals.css (AGENTS.md §7.3).
 *
 * Nenhum filtro (blur, sombra) na cena: com tudo se mexendo, o WebKit refazia
 * o desfoque na CPU a cada quadro e caía a 9 fps. Brilho aqui é degradê
 * radial ou traço em camadas — mesmo efeito, custo de pintura comum.
 *
 * Menos é mais: nada solto pelo palco (moedas de enfeite, setas tracejadas,
 * anéis tracejados). O movimento conta a história do funil — leads entram
 * pela boca, a energia desce girando, o faturamento sai pela ponta e cai na
 * luz logo abaixo dela.
 */

const COSTELAS = 6;
const VOLTA_S = 12;
const CICLO = "6s";
const BRACOS = 6;

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

const PONTA = FAIXAS[FAIXAS.length - 1];
/** A luz onde cai o que sai pela ponta: logo abaixo dela, não solta no rodapé. */
const Y_POCA = r(PONTA.frenteBase + 30, 1);

/**
 * Estrelas só onde não há texto nem funil: a faixa de cima, a de baixo e a
 * margem direita, além dos balões.
 */
const ESTRELAS = Array.from({ length: 16 }, (_, i) => {
  const zona = i < 8 ? 0 : i < 12 ? 1 : 2;
  const x = zona === 2 ? 588 + sorteio(i, 1) * 24 : 10 + sorteio(i, 1) * 600;
  const y = zona === 0 ? 10 + sorteio(i, 2) * 40 : zona === 1 ? 474 + sorteio(i, 2) * 18 : 90 + sorteio(i, 2) * 360;
  return {
    x: r(x, 1),
    y: r(y, 1),
    raio: r(0.6 + (i % 3) * 0.3, 2),
    dur: ["2s", "3s", "6s"][i % 3],
    inicio: `-${r((i * 0.37) % 3, 2)}s`,
  };
});

/** Leads chegando do alto e descendo na boca, em curva. */
const LEADS = [
  { de: [52, 26], para: [150, 100], controle: [84, 58] },
  { de: [124, 10], para: [180, 104], controle: [146, 42] },
  { de: [206, 6], para: [202, 98], controle: [214, 44] },
  { de: [292, 12], para: [226, 104], controle: [268, 42] },
  { de: [352, 30], para: [252, 100], controle: [322, 60] },
] as const;

/** Partículas sugadas pelo vórtice: espiral para dentro da boca. */
function sugada(k: number): string {
  const pontos: string[] = [];
  const passos = 28;
  const boca = FAIXAS[0];
  for (let i = 0; i < passos; i++) {
    const t = i / (passos - 1);
    const raio = (boca.rxTopo - 26) * (1 - t) + 6;
    const ang = ((k * 45 + t * 540) * Math.PI) / 180;
    pontos.push(`${i ? "L" : "M"} ${r(CX + raio * Math.cos(ang), 1)} ${r(boca.yTopo + 4 + t * 8 + raio * 0.19 * Math.sin(ang), 1)}`);
  }
  return pontos.join(" ");
}
const SUGADAS = Array.from({ length: 8 }, (_, k) => ({ d: sugada(k), inicio: `-${r(k * 0.375, 3)}s` }));

/** Braço do vórtice (num círculo de raio 1; a perspectiva vem do grupo). */
function braco(k: number): string {
  const pontos: string[] = [];
  const passos = 22;
  for (let i = 0; i < passos; i++) {
    const t = i / (passos - 1);
    const raio = 1 - t * 0.94;
    const ang = ((k * (360 / BRACOS) + t * 150) * Math.PI) / 180;
    pontos.push(`${i ? "L" : "M"} ${r(raio * Math.cos(ang), 4)} ${r(raio * Math.sin(ang), 4)}`);
  }
  return pontos.join(" ");
}
const BRACOS_DO_VORTICE = Array.from({ length: BRACOS }, (_, k) => braco(k));

const MOEDAS = [-12, 9, -3].map((dx, i) => ({
  de: [CX + dx, PONTA.yBase - 4],
  para: [CX + dx * 3.2, Y_POCA - 3],
  inicio: `-${r(i * 1, 2)}s`,
}));

const ESPIRAIS = Array.from({ length: 8 }, (_, k) => ({
  movimento: movimentoDaEspiral(2.2, k * 45),
  inicio: `-${r(k * 0.75, 2)}s`,
}));

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
  const bocaRx = boca.rxTopo - 11;
  const bocaRy = boca.ryTopo - 2.4;

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
        <radialGradient id={id("boca")} cx="0.5" cy="0.6" r="0.62">
          <stop offset="0" style={tom("abismo")} />
          <stop offset="0.5" style={tom("noite")} />
          <stop offset="0.86" style={tom("profundo")} />
          <stop offset="1" style={tom("escuro")} />
        </radialGradient>
        {/* O braço do vórtice acende no meio do caminho e some nas pontas. */}
        <radialGradient id={id("braco")} gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1">
          <stop offset="0" style={tom("gelo")} stopOpacity="0" />
          <stop offset="0.3" style={tom("gelo")} stopOpacity="0.55" />
          <stop offset="0.7" style={tom("claro")} stopOpacity="0.3" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("brilho-centro")}>
          <stop offset="0" style={tom("gelo")} stopOpacity="0.9" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("holofote")}>
          <stop offset="0" style={tom("claro")} stopOpacity="0.38" />
          <stop offset="0.6" style={tom("vivo")} stopOpacity="0.1" />
          <stop offset="1" style={tom("medio")} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("poca")}>
          <stop offset="0" style={tom("gelo")} stopOpacity="0.85" />
          <stop offset="0.4" style={tom("claro")} stopOpacity="0.38" />
          <stop offset="1" style={tom("vivo")} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("feixe")} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={tom("claro")} stopOpacity="0.34" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("ponta")}>
          <stop offset="0" style={tom("ouro-luz")} stopOpacity="0.9" />
          <stop offset="0.4" style={tom("claro")} stopOpacity="0.45" />
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
        <radialGradient id={id("aura")}>
          <stop offset="0.55" style={tom("claro")} stopOpacity="0.45" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={id("varredura")} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={tom("luz")} stopOpacity="0" />
          <stop offset="0.5" style={tom("luz")} stopOpacity="0.4" />
          <stop offset="1" style={tom("luz")} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("faisca")}>
          <stop offset="0" style={tom("luz")} stopOpacity="1" />
          <stop offset="0.35" style={tom("luz")} stopOpacity="0.9" />
          <stop offset="0.6" style={tom("claro")} stopOpacity="0.35" />
          <stop offset="1" style={tom("claro")} stopOpacity="0" />
        </radialGradient>
        {FAIXAS.map((f, i) => (
          <clipPath key={i} id={id(`corpo-${i}`)}>
            <path d={caminhoCorpo(f)} />
          </clipPath>
        ))}
        <clipPath id={id("boca-recorte")}>
          <ellipse cx={CX} cy={boca.yTopo} rx={bocaRx} ry={bocaRy} />
        </clipPath>
      </defs>

      {/* céu: poucas estrelas, longe do texto, e o holofote atrás do funil */}
      {ESTRELAS.map((e, i) => (
        <circle key={i} cx={e.x} cy={e.y} r={e.raio} style={pinta("gelo")} opacity={detalhe ? 0.2 : 0.4}>
          {detalhe ? <animate attributeName="opacity" values="0.12;0.8;0.12" dur={e.dur} begin={e.inicio} repeatCount="indefinite" /> : null}
        </circle>
      ))}
      <ellipse cx={CX} cy={262} rx={290} ry={240} fill={url("holofote")} />

      {/* saída: feixe da ponta até a luz de baixo, colada no funil */}
      <path
        d={`M ${r(CX - PONTA.rxBase + 8, 1)} ${PONTA.yBase} L ${r(CX - 118, 1)} ${Y_POCA} L ${r(CX + 118, 1)} ${Y_POCA} L ${r(CX + PONTA.rxBase - 8, 1)} ${PONTA.yBase} Z`}
        fill={url("feixe")}
      />
      <ellipse cx={CX} cy={Y_POCA} rx={140} ry={20} fill={url("poca")} opacity={0.75}>
        {animar ? <animate attributeName="opacity" values="0.6;0.9;0.6" dur="3s" repeatCount="indefinite" /> : null}
      </ellipse>
      <ellipse cx={CX} cy={Y_POCA} rx={104} ry={13} fill="none" style={risca("gelo")} strokeOpacity={0.4} strokeWidth={1.2} />
      {movendo
        ? [0, 1, 2].map((k) => (
            <ellipse key={k} cx={CX} cy={Y_POCA} rx={16} ry={3} fill="none" style={risca("gelo")} strokeWidth={1.4} opacity={0}>
              <animate attributeName="rx" values="16;128" dur="3s" begin={`-${k}s`} repeatCount="indefinite" />
              <animate attributeName="ry" values="3;18" dur="3s" begin={`-${k}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="3s" begin={`-${k}s`} repeatCount="indefinite" />
            </ellipse>
          ))
        : null}

      {/* brilho na ponta, por onde sai o faturamento */}
      <ellipse cx={CX} cy={PONTA.yBase + 12} rx={50} ry={13} fill={url("ponta")} opacity={movendo ? 0.7 : 0.45}>
        {movendo ? <animate attributeName="opacity" values="0.45;0.9;0.45" dur="1.5s" repeatCount="indefinite" /> : null}
      </ellipse>

      {/* moedas saindo pela ponta (atrás da última faixa: aparecem ao passar da borda) */}
      {movendo
        ? MOEDAS.map((m, i) => (
            <g key={i}>
              <g opacity={0}>
                <animateMotion
                  path={`M ${m.de[0]} ${m.de[1]} Q ${(m.de[0] + m.para[0]) / 2} ${m.de[1] + 6} ${m.para[0]} ${m.para[1]}`}
                  keyPoints="0;1;1"
                  keyTimes="0;0.36;1"
                  calcMode="spline"
                  keySplines="0.55 0 1 1;0 0 1 1"
                  dur="3s"
                  begin={m.inicio}
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.06;0.34;0.44;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
                <g>
                  <animateTransform attributeName="transform" type="scale" values="1 1;0.14 1;1 1" dur="0.75s" repeatCount="indefinite" />
                  <Moeda raio={9} desenho={url("moeda")} />
                </g>
              </g>
              <ellipse cx={m.para[0]} cy={m.para[1] + 2} rx={0} ry={0} fill="none" style={risca("ouro-luz")} strokeWidth={1.4} opacity={0}>
                <animate attributeName="rx" values="0;0;24;24" keyTimes="0;0.36;0.6;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
                <animate attributeName="ry" values="0;0;5;5" keyTimes="0;0.36;0.6;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0.9;0;0" keyTimes="0;0.36;0.6;1" dur="3s" begin={m.inicio} repeatCount="indefinite" />
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
        const labio = i === 0 ? 11 : 20;
        return (
          <g key={i} data-faixa={i} data-sel={sel ? "sim" : undefined}>
            <g style={{ transition: "opacity 320ms ease" }} opacity={sel ? 1 : sobre ? 0.55 : 0}>
              <path d={corpo} fill="none" style={risca("claro")} strokeWidth={18} strokeOpacity={0.1} strokeLinejoin="round" />
              <path d={corpo} fill="none" style={risca("claro")} strokeWidth={9} strokeOpacity={0.18} strokeLinejoin="round" />
            </g>
            {i === 0 ? (
              <g opacity={0.6}>
                {animar ? <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" repeatCount="indefinite" /> : null}
                <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo + 3} ry={f.ryTopo + 2.5} fill="none" style={risca("claro")} strokeWidth={10} strokeOpacity={0.14} />
                <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo + 1} ry={f.ryTopo + 1} fill="none" style={risca("claro")} strokeWidth={4} strokeOpacity={0.3} />
              </g>
            ) : null}
            {/* borda de cima (lábio) */}
            <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo} ry={f.ryTopo} fill={url("aro")} />
            {i === 0 ? (
              <>
                <ellipse cx={CX} cy={f.yTopo} rx={bocaRx} ry={bocaRy} fill={url("boca")} />
                <g clipPath={url("boca-recorte")}>
                  {/* vórtice: braços de luz girando em perspectiva, sem tracejado */}
                  <g transform={`translate(${CX} ${f.yTopo + 3}) scale(${r(bocaRx - 4, 1)} ${r((bocaRy - 1) * 1.02, 2)})`}>
                    <g>
                      {animar ? (
                        <animateTransform attributeName="transform" type="rotate" values="0;360" dur={`${VOLTA_S}s`} repeatCount="indefinite" />
                      ) : null}
                      {BRACOS_DO_VORTICE.map((d, k) => (
                        <g key={k}>
                          <path d={d} fill="none" stroke={url("braco")} strokeWidth={0.08} strokeOpacity={0.35} strokeLinecap="round" />
                          <path d={d} fill="none" stroke={url("braco")} strokeWidth={0.022} strokeLinecap="round" />
                        </g>
                      ))}
                    </g>
                  </g>
                  {movendo
                    ? SUGADAS.filter((_, k) => !leve || k % 2 === 0).map((p, k) => (
                        <circle key={k} r={2} style={pinta("luz")} opacity={0}>
                          <animateMotion path={p.d} dur="3s" begin={p.inicio} repeatCount="indefinite" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.5 0 0.9 0.6" />
                          <animate attributeName="opacity" values="0;0.95;0.9;0" keyTimes="0;0.15;0.8;1" dur="3s" begin={p.inicio} repeatCount="indefinite" />
                          <animate attributeName="r" values="2.2;1.8;0.6" keyTimes="0;0.6;1" dur="3s" begin={p.inicio} repeatCount="indefinite" />
                        </circle>
                      ))
                    : null}
                  <circle cx={CX} cy={f.yTopo + 10} r={28} fill={url("brilho-centro")}>
                    {animar ? (
                      <>
                        <animate attributeName="r" values="22;32;22" dur="3s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
                      </>
                    ) : null}
                  </circle>
                </g>
              </>
            ) : (
              <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo - labio} ry={Math.max(2, f.ryTopo - 5)} fill={url("interior")} />
            )}
            <ellipse cx={CX} cy={f.yTopo} rx={f.rxTopo} ry={f.ryTopo} fill="none" style={risca("luz")} strokeOpacity={0.85} strokeWidth={1.3} />
            {/* frente da faixa */}
            <path d={corpo} fill={url("corpo")} />
            <path d={corpo} fill={url("sombra-v")} />
            <path d={corpo} style={{ ...pinta("luz"), transition: "opacity 320ms ease" }} opacity={sel ? 0.14 : sobre ? 0.07 : 0} />
            <g clipPath={url(`corpo-${i}`)}>
              {Array.from({ length: COSTELAS }, (_, k) => {
                if (!detalhe) {
                  const fixa = costela(f, -75 + k * 30);
                  return <path key={k} d={fixa.d} style={risca("luz")} strokeOpacity={r(0.26 * fixa.opacidade)} strokeWidth={1.2} />;
                }
                const inicio = `-${r((VOLTA_S / COSTELAS) * k, 2)}s`;
                return (
                  <path key={k} d={costela(f, -90).d} style={risca("luz")} strokeWidth={1.2} strokeOpacity={0}>
                    <animate attributeName="d" values={volta.valores} keyTimes={volta.tempos} dur={`${VOLTA_S}s`} begin={inicio} repeatCount="indefinite" />
                    <animate
                      attributeName="stroke-opacity"
                      values={volta.opacidades.split(";").map((o) => r(Number(o) * 0.36)).join(";")}
                      keyTimes={volta.tempos}
                      dur={`${VOLTA_S}s`}
                      begin={inicio}
                      repeatCount="indefinite"
                    />
                  </path>
                );
              })}
              {animar ? (
                <rect x={CX - f.rxTopo - 130} y={f.yTopo - 50} width={90} height={f.frenteBase - f.yTopo + 70} fill={url("varredura")} transform="skewX(-16)" opacity={0.85}>
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
            <path d={arcoFrente(f.rxBase, f.ryBase, f.yBase)} fill="none" style={risca("gelo")} strokeOpacity={0.6} strokeWidth={1.4} />
            <path
              d={`M ${r(CX - f.rxTopo, 1)} ${f.yTopo} L ${r(CX - f.rxBase, 1)} ${f.yBase} M ${r(CX + f.rxTopo, 1)} ${f.yTopo} L ${r(CX + f.rxBase, 1)} ${f.yBase}`}
              fill="none"
              style={risca("gelo")}
              strokeOpacity={0.5}
              strokeWidth={1.2}
              strokeLinecap="round"
            />
            {sel ? (
              <path d={corpo} fill="none" style={risca("luz")} strokeWidth={1.8} strokeOpacity={0.85} strokeLinejoin="round">
                {animar ? <animate attributeName="stroke-opacity" values="0.4;0.95;0.4" dur="3s" repeatCount="indefinite" /> : null}
              </path>
            ) : null}
            {sel && animar && toques > 0 ? (
              <path key={`onda-${toques}`} d={corpo} fill="none" style={risca("luz")} strokeWidth={2.4} strokeLinejoin="round" data-onda="" />
            ) : null}
          </g>
        );
      })}

      {/* energia descendo em espiral pela superfície */}
      {movendo
        ? ESPIRAIS.filter((_, k) => !leve || k % 2 === 0).map((p, k) => (
            <circle key={k} r={4.5} fill={url("faisca")} opacity={0}>
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
                <circle key={`${i}-${k}`} r={5} fill={url("faisca")}>
                  <animateMotion path={caminhoElipse(f.rxTopo, f.ryTopo, f.yTopo)} keyPoints="1;0" keyTimes="0;1" calcMode="linear" dur={`${dur}s`} begin={inicio} repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.12;0.12;1;1;0.12" keyTimes="0;0.47;0.56;0.96;1" dur={`${dur}s`} begin={inicio} repeatCount="indefinite" />
                </circle>
              );
            });
          })
        : null}

      {/* leads entrando pela boca: sem trilha tracejada, só a ficha com a aura */}
      {movendo
        ? LEADS.map((l, i) => {
            const caminho = `M ${l.de[0]} ${l.de[1]} Q ${l.controle[0]} ${l.controle[1]} ${l.para[0]} ${l.para[1]}`;
            const inicio = `-${r(i * 1.2, 2)}s`;
            const pessoa = pinta(`lead-${i + 1}`);
            return (
              <g key={i} opacity={0}>
                <animateMotion path={caminho} keyPoints="0;1;1" keyTimes="0;0.42;1" calcMode="spline" keySplines="0.35 0 0.65 1;0 0 1 1" dur={CICLO} begin={inicio} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.06;0.34;0.43;1" dur={CICLO} begin={inicio} repeatCount="indefinite" />
                <g>
                  <animateTransform attributeName="transform" type="scale" values="0.6;0.9;0.9;0.3;0.3" keyTimes="0;0.08;0.28;0.42;1" dur={CICLO} begin={inicio} repeatCount="indefinite" />
                  <circle r={22} fill={url("aura")} />
                  <circle r={13} fill={url("ficha")} style={risca("luz")} strokeWidth={1.6} />
                  <circle cy={-3.1} r={4.1} style={pessoa} />
                  <path d="M -7 8.6 a 7 5.6 0 0 1 14 0 z" style={pessoa} />
                </g>
              </g>
            );
          })
        : null}

      {/* traços até os balões: todos iguais; o da etapa escolhida acende e leva um ponto de luz */}
      {FAIXAS.map((f, i) => {
        const sel = i === selecionada;
        const x0 = r(bordaDireita(i, f.centroY) + 8, 1);
        const x1 = X_BALAO;
        return (
          <g key={i} data-traco="" opacity={sel ? 1 : 0.55} style={{ transition: "opacity 320ms ease" }}>
            <line x1={x0} y1={f.centroY} x2={x1} y2={f.centroY} style={risca("gelo")} strokeWidth={sel ? 1.5 : 1.1} strokeOpacity={sel ? 0.9 : 0.7} />
            <circle cx={x0} cy={f.centroY} r={3} style={pinta("luz")} />
            <circle cx={x1} cy={f.centroY} r={2.2} style={pinta("luz")} />
            {sel && animar ? (
              <circle cx={x0} cy={f.centroY} r={2.6} fill={url("faisca")}>
                <animate attributeName="cx" values={`${x0};${x1}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.85;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
