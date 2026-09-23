import { cn } from "@/lib/cn";

/**
 * Seletor segmentado: um grupo de rádio com cara de botões ("Todas ·
 * Pendentes · Pagas"). É rádio de verdade, não abas — sem JavaScript ainda dá
 * para escolher e enviar o formulário.
 *
 * Duas coisas que o desenho anterior deixava escapar, e que agora valem para
 * todo seletor assim:
 *
 * - No celular, cinco opções não cabem em 360 px. O grupo rola dentro de si
 *   mesmo, em vez de empurrar a página para o lado.
 * - O rádio é invisível (`sr-only`), então o foco do teclado caía num
 *   elemento que ninguém vê. O contorno de foco vai para o rótulo visível,
 *   por dentro, para a rolagem não cortá-lo.
 */
export const SEGMENTO_GRUPO =
  "rolagem-discreta flex max-w-full overflow-x-auto rounded-[var(--radius-controle)] border border-outline-variant p-0.5";

export function classeDaOpcao(ativa: boolean): string {
  return cn(
    "shrink-0 cursor-pointer rounded-[var(--radius-cartao)] px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors",
    "has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-2 has-[:focus-visible]:outline-primary",
    ativa ? "bg-secondary-fixed text-primary" : "text-on-surface-variant hover:text-primary",
  );
}
