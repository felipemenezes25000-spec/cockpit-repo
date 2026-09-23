"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ESTILO_SITUACAO } from "@/components/ui/status-chip";
import type { SituacaoAtendimento } from "@/lib/dominio";

/**
 * Para onde o foco vai depois de mudar a situação de um atendimento.
 *
 * O botão clicado some junto com a situação antiga: "Confirmar" vira
 * "Iniciar". Sem isto, o foco caía no `<body>` — quem usa teclado voltava ao
 * topo da página a cada clique, e o leitor de tela não dizia se deu certo
 * (o aviso de sucesso do `FormularioDeAcao` morre com o formulário).
 *
 * Só age quando a mudança veio de um envio feito aqui dentro e o foco se
 * perdeu: se a página foi atualizada por outra pessoa, ou se o foco já está em
 * outro lugar, não mexe em nada. O destino é o primeiro botão ou link do
 * bloco; sem nenhum ("Concluído" não tem próximo passo), o próprio bloco.
 */
export function FocoAposAcao({
  situacao,
  children,
  className,
}: {
  situacao: SituacaoAtendimento;
  children: ReactNode;
  className?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const aviso = useRef<HTMLParagraphElement>(null);
  const agiu = useRef(false);
  const anterior = useRef(situacao);

  useEffect(() => {
    if (anterior.current === situacao) return;
    anterior.current = situacao;
    if (!agiu.current) return;
    agiu.current = false;

    // O aviso vai direto no DOM: é texto de uma região viva, sem estado para
    // o React guardar, e escrever nela não re-renderiza o bloco.
    if (aviso.current) {
      aviso.current.textContent = `Situação agora: ${ESTILO_SITUACAO[situacao].rotulo}.`;
    }

    const ativo = document.activeElement;
    if (ativo && ativo !== document.body) return;

    const elemento = caixa.current;
    if (!elemento) return;
    const destino =
      elemento.querySelector<HTMLElement>("button:not([disabled]), a[href]") ?? elemento;
    destino.focus();
  }, [situacao]);

  return (
    <div
      ref={caixa}
      tabIndex={-1}
      className={className}
      onSubmitCapture={() => {
        agiu.current = true;
      }}
      onBlurCapture={(evento) => {
        // Foco que saiu para outro lugar da página: a pessoa seguiu adiante.
        // `relatedTarget` nulo é o botão sumindo — é justamente o caso a tratar.
        const para = evento.relatedTarget;
        if (para instanceof Node && !evento.currentTarget.contains(para)) {
          agiu.current = false;
        }
      }}
    >
      {children}
      <p ref={aviso} role="status" className="sr-only" />
    </div>
  );
}
