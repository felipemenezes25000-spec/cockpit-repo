import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Um número que se lê de relance, sempre com a frase que diz o que ele conta.
 * A proporção, quando houver, vai numa barra lisa ao lado do número — nunca
 * em mostrador. Dentro da cabine, as cores vêm da própria cabine.
 */
export function Indicador({
  rotulo,
  valor,
  complemento,
  frase,
  proporcao,
  descricaoDaBarra,
  tamanho = "numero",
  className,
}: {
  rotulo: string;
  valor: ReactNode;
  /** Texto menor ao lado do número: "de 9", "no mês". */
  complemento?: ReactNode;
  frase?: ReactNode;
  /** 0 a 1. */
  proporcao?: number;
  /** O que a barra mostra, para o leitor de tela: "3 de 9 atendimentos concluídos". */
  descricaoDaBarra?: string;
  tamanho?: "numero" | "numero-sm";
  className?: string;
}) {
  const largura = typeof proporcao === "number" ? Math.round(Math.max(0, Math.min(1, proporcao)) * 100) : null;

  return (
    <div className={cn("min-w-0", className)}>
      <p className="rotulo">{rotulo}</p>
      <p className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className={cn(tamanho, "min-w-0 break-words")}>{valor}</span>
        {complemento ? <span className="text-sm font-semibold opacity-90">{complemento}</span> : null}
      </p>
      {largura !== null ? (
        <span className="barra mt-3" role="img" aria-label={descricaoDaBarra ?? `${largura}%`}>
          <span style={{ width: `${largura}%` }} />
        </span>
      ) : null}
      {frase ? <p className="mt-2 text-sm leading-5">{frase}</p> : null}
    </div>
  );
}
