import { ALTURA_DA_RUBRICA, LARGURA_DA_RUBRICA, rubricaValida } from "@/lib/assinatura/rubrica";

/**
 * A rubrica gravada, redesenhada. É sempre um `<path>` montado pela
 * aplicação a partir de um texto que o banco só aceita com "M", "L" e
 * números (0032) — nunca um SVG vindo de fora.
 */
export function RubricaDesenhada({
  caminho,
  className,
  titulo = "Rubrica de quem assinou",
}: {
  caminho: string | null | undefined;
  className?: string;
  titulo?: string;
}) {
  if (!caminho || !rubricaValida(caminho)) return null;

  return (
    <svg
      viewBox={`0 0 ${LARGURA_DA_RUBRICA} ${ALTURA_DA_RUBRICA}`}
      role="img"
      aria-label={titulo}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d={caminho}
        fill="none"
        stroke="currentColor"
        strokeWidth={7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
