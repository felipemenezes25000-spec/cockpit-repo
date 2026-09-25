import { MessageCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const TAMANHOS = {
  xs: "min-h-8 gap-1.5 px-2.5 text-xs [&_svg]:size-3.5",
  sm: "min-h-9 gap-2 px-3 text-xs [&_svg]:size-4",
  md: "min-h-10 gap-2 px-3.5 text-sm [&_svg]:size-4",
} as const;

/**
 * O WhatsApp com a mensagem já escrita (o `href` vem de `linkWhatsApp`, em
 * `lib/relacionamento.ts`). Abre em outra aba: quem manda de fato é a pessoa
 * da equipe, que ainda pode revisar o texto antes de enviar. O nome de quem
 * recebe vai para o leitor de tela — numa lista, "WhatsApp" sozinho não diz
 * de quem é.
 */
export function BotaoWhatsApp({
  href,
  paraQuem,
  children = "WhatsApp",
  tamanho = "sm",
  onClick,
  className,
}: {
  href: string;
  paraQuem: string;
  children?: ReactNode;
  tamanho?: keyof typeof TAMANHOS;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={cn(
        "botao-whatsapp group inline-flex items-center rounded-[var(--radius-controle)] border border-positivo bg-positivo font-semibold whitespace-nowrap text-on-primary transition-[transform,filter] duration-150 hover:brightness-[0.9] active:scale-[0.985]",
        TAMANHOS[tamanho],
        className,
      )}
    >
      <MessageCircle aria-hidden="true" strokeWidth={2} />
      {children}
      <span className="sr-only"> para {paraQuem} (abre em nova aba)</span>
    </a>
  );
}
