"use client";

import { Check, Eraser, PenLine, Undo2 } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  ALTURA_DA_RUBRICA,
  caminhoDaRubrica,
  LARGURA_DA_RUBRICA,
  rubricaSuficiente,
  type Ponto,
} from "@/lib/assinatura/rubrica";

/** Cor e espessura do traço — as mesmas da `RubricaDesenhada` na via. */
const TINTA = "#0b2a4a";
const ESPESSURA = 7;

/**
 * O quadro onde a paciente faz a rubrica com o dedo, a caneta ou o mouse.
 *
 * O traço é guardado em coordenadas do quadro (0–1000 × 0–400), não em
 * pixels: girar o celular ou redimensionar a janela redesenha igual, e o que
 * vai para o banco é o mesmo desenho que aparece na via.
 *
 * Quem não consegue desenhar (tremor, leitor de tela, teclado) marca "assinar
 * só pelo nome" — a alternativa fica registrada como tal, e o nome digitado
 * continua sendo a assinatura.
 *
 * Com `nomes`, escreve campos ocultos para formulários com `FormData`
 * (balcão); sem, avisa por `aoMudar` (página da paciente).
 */
export function QuadroDeRubrica({
  aoMudar,
  aoDispensar,
  dispensada,
  erro,
  nomes = false,
  rotulo = "Sua rubrica",
  textoDispensa = "Prefiro não desenhar — assinar só com o nome digitado",
}: {
  aoMudar?: (caminho: string | null) => void;
  aoDispensar?: (dispensada: boolean) => void;
  dispensada?: boolean;
  erro?: string;
  nomes?: boolean;
  rotulo?: string;
  textoDispensa?: string;
}) {
  const id = useId();
  const quadro = useRef<HTMLCanvasElement>(null);
  const tracos = useRef<Ponto[][]>([]);
  const desenhando = useRef<number | null>(null);
  const [quantidade, setQuantidade] = useState(0);
  const [caminho, setCaminho] = useState<string | null>(null);
  const [dispensaLocal, setDispensaLocal] = useState(false);
  const semDesenho = dispensada ?? dispensaLocal;

  const pronta = caminho !== null;
  const curta = quantidade > 0 && !pronta;

  const redesenhar = useCallback(() => {
    const canvas = quadro.current;
    if (!canvas) return;
    const contexto = canvas.getContext("2d");
    if (!contexto) return;

    const caixa = canvas.getBoundingClientRect();
    const densidade = Math.min(3, window.devicePixelRatio || 1);
    const largura = Math.max(1, Math.round(caixa.width * densidade));
    const altura = Math.max(1, Math.round(caixa.height * densidade));
    if (canvas.width !== largura || canvas.height !== altura) {
      canvas.width = largura;
      canvas.height = altura;
    }

    contexto.setTransform(1, 0, 0, 1, 0, 0);
    contexto.clearRect(0, 0, largura, altura);
    contexto.scale(largura / LARGURA_DA_RUBRICA, altura / ALTURA_DA_RUBRICA);
    contexto.strokeStyle = TINTA;
    contexto.fillStyle = TINTA;
    contexto.lineWidth = ESPESSURA;
    contexto.lineCap = "round";
    contexto.lineJoin = "round";

    for (const traco of tracos.current) desenharTraco(contexto, traco);
  }, []);

  useEffect(() => {
    redesenhar();
    const canvas = quadro.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(() => redesenhar());
    observador.observe(canvas);
    return () => observador.disconnect();
  }, [redesenhar]);

  function publicar() {
    const suficiente = rubricaSuficiente(tracos.current);
    const novo = suficiente ? caminhoDaRubrica(tracos.current, LARGURA_DA_RUBRICA, ALTURA_DA_RUBRICA) : null;
    setQuantidade(tracos.current.length);
    setCaminho(novo);
    aoMudar?.(novo);
  }

  function pontoDoEvento(evento: { clientX: number; clientY: number }): Ponto | null {
    const canvas = quadro.current;
    if (!canvas) return null;
    const caixa = canvas.getBoundingClientRect();
    if (caixa.width === 0 || caixa.height === 0) return null;
    return {
      x: Math.max(0, Math.min(LARGURA_DA_RUBRICA, ((evento.clientX - caixa.left) / caixa.width) * LARGURA_DA_RUBRICA)),
      y: Math.max(0, Math.min(ALTURA_DA_RUBRICA, ((evento.clientY - caixa.top) / caixa.height) * ALTURA_DA_RUBRICA)),
    };
  }

  function comecar(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (semDesenho || evento.button > 0) return;
    const ponto = pontoDoEvento(evento);
    if (!ponto) return;
    evento.preventDefault();
    evento.currentTarget.setPointerCapture?.(evento.pointerId);
    desenhando.current = evento.pointerId;
    tracos.current.push([ponto]);
    redesenhar();
  }

  function mover(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (desenhando.current !== evento.pointerId) return;
    const traco = tracos.current.at(-1);
    if (!traco) return;
    // Os eventos agrupados pelo navegador entre dois quadros: sem eles, um
    // traço rápido no celular vira uma sequência de retas.
    const nativo = evento.nativeEvent;
    const eventos = typeof nativo.getCoalescedEvents === "function" ? nativo.getCoalescedEvents() : [nativo];
    for (const item of eventos.length > 0 ? eventos : [nativo]) {
      const ponto = pontoDoEvento(item);
      if (ponto) traco.push(ponto);
    }
    redesenhar();
  }

  function terminar(evento: React.PointerEvent<HTMLCanvasElement>) {
    if (desenhando.current !== evento.pointerId) return;
    desenhando.current = null;
    publicar();
  }

  function desfazer() {
    tracos.current.pop();
    redesenhar();
    publicar();
  }

  function limpar() {
    tracos.current = [];
    redesenhar();
    publicar();
  }

  function alternarDispensa(marcada: boolean) {
    if (marcada) {
      tracos.current = [];
      redesenhar();
      publicar();
    }
    setDispensaLocal(marcada);
    aoDispensar?.(marcada);
  }

  const idDica = `${id}-dica`;
  const idErro = `${id}-erro`;

  return (
    // Até 42rem: no desktop, um quadro da largura do cartão viraria um mural.
    <div className="flex w-full max-w-2xl min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <p id={`${id}-rotulo`} className="text-sm font-semibold text-on-surface">
            {rotulo}
          </p>
          <p id={idDica} className="mt-0.5 text-xs leading-5 text-outline">
            Desenhe com o dedo, a caneta ou o mouse, como no papel.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={desfazer}
            disabled={quantidade === 0 || semDesenho}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-colors duration-150 hover:border-primary-fixed-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Undo2 aria-hidden="true" size={14} strokeWidth={1.8} />
            Desfazer
          </button>
          <button
            type="button"
            onClick={limpar}
            disabled={quantidade === 0 || semDesenho}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 text-xs font-semibold text-on-surface-variant transition-colors duration-150 hover:border-primary-fixed-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Eraser aria-hidden="true" size={14} strokeWidth={1.8} />
            Limpar
          </button>
        </div>
      </div>

      <div
        className={cn(
          "quadro-rubrica relative aspect-[5/2] w-full overflow-hidden rounded-[var(--radius-cartao)] border bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_16px_36px_-30px_rgba(8,41,76,.4)] transition-[border-color,box-shadow,opacity] duration-200",
          erro ? "border-error" : pronta ? "border-positivo-borda" : "border-dashed border-primary-fixed-dim",
          semDesenho && "opacity-45",
        )}
      >
        {/* A linha de base e o "×" do papel: dão escala e lugar para a mão. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-[6%] top-[72%] h-px bg-primary-fixed-dim" />
        <span aria-hidden="true" className="pointer-events-none absolute top-[72%] left-[6%] -translate-y-[115%] text-lg leading-none font-light text-primary-fixed-dim">
          ×
        </span>
        {quantidade === 0 && !semDesenho ? (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 pb-[10%] text-sm font-medium text-outline">
            <PenLine size={16} strokeWidth={1.75} />
            Faça sua rubrica aqui
          </span>
        ) : null}

        <canvas
          ref={quadro}
          role="img"
          aria-labelledby={`${id}-rotulo`}
          aria-describedby={erro ? `${idDica} ${idErro}` : idDica}
          onPointerDown={comecar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          onLostPointerCapture={terminar}
          className={cn("absolute inset-0 size-full touch-none select-none", semDesenho ? "cursor-not-allowed" : "cursor-crosshair")}
        />
      </div>

      <p aria-live="polite" className="min-h-5 text-xs leading-5">
        {pronta ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-positivo">
            <Check aria-hidden="true" size={14} strokeWidth={2.2} />
            Rubrica pronta
          </span>
        ) : curta ? (
          <span className="text-atencao">Continue: a rubrica ainda está muito curta.</span>
        ) : null}
      </p>

      {erro ? (
        <p id={idErro} role="alert" className="-mt-1 text-xs leading-5 font-medium text-error">
          {erro}
        </p>
      ) : null}

      <label className="rubrica-dispensa flex cursor-pointer items-start gap-2.5 text-xs leading-5 text-on-surface-variant">
        <input
          type="checkbox"
          checked={semDesenho}
          onChange={(evento) => alternarDispensa(evento.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary-container)]"
        />
        <span className="min-w-0">{textoDispensa}</span>
      </label>

      {nomes ? (
        <>
          <input type="hidden" name="rubrica" value={semDesenho ? "" : (caminho ?? "")} />
          <input type="hidden" name="rubrica_dispensada" value={semDesenho ? "sim" : ""} />
        </>
      ) : null}
    </div>
  );
}

/** Um traço suave: curvas pelos pontos médios, como uma caneta. */
function desenharTraco(contexto: CanvasRenderingContext2D, traco: Ponto[]) {
  if (traco.length === 0) return;
  if (traco.length === 1) {
    contexto.beginPath();
    contexto.arc(traco[0].x, traco[0].y, ESPESSURA / 2, 0, Math.PI * 2);
    contexto.fill();
    return;
  }
  contexto.beginPath();
  contexto.moveTo(traco[0].x, traco[0].y);
  for (let i = 1; i < traco.length - 1; i++) {
    const meioX = (traco[i].x + traco[i + 1].x) / 2;
    const meioY = (traco[i].y + traco[i + 1].y) / 2;
    contexto.quadraticCurveTo(traco[i].x, traco[i].y, meioX, meioY);
  }
  const ultimo = traco[traco.length - 1];
  contexto.lineTo(ultimo.x, ultimo.y);
  contexto.stroke();
}
