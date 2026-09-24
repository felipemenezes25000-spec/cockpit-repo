"use client";

import { Check, CheckCircle2, Copy, LoaderCircle, MessageCircle } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import { ACAO_INICIAL } from "@/lib/acao";
import {
  LINK_AVALIACAO_GOOGLE,
  linkWhatsApp,
  mensagemAniversario,
  mensagemAvaliacao,
} from "@/lib/relacionamento";
import { registrarContato } from "@/server/acoes/relacionamento";
import { cn } from "@/lib/cn";

/**
 * Botão de envio: filho do `<form>` porque `useFormStatus` só enxerga o
 * formulário ancestral. Fica indisponível enquanto a ação roda (clique duplo
 * não vira dois registros) e até a mensagem ter sido aberta ou copiada — trava
 * de interface; a ação não tem como saber se a mensagem saiu de fato.
 */
function Registrar({ preparado, registrado, dica }: { preparado: boolean; registrado: boolean; dica: string }) {
  const { pending } = useFormStatus();
  const indisponivel = pending || !preparado || registrado;
  return (
    <button
      type="submit"
      disabled={indisponivel}
      aria-busy={pending || undefined}
      // Mesma condição que desenha a dica: nunca aponta para um id ausente.
      aria-describedby={!preparado && !registrado ? dica : undefined}
      className={cn(
        "group inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-controle)] border px-3.5 text-xs font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-180 active:scale-[0.985] disabled:cursor-not-allowed disabled:shadow-none",
        registrado
          ? "border-positivo-borda/80 bg-positivo-fundo/75 text-positivo"
          : preparado
            ? "border-primary/15 bg-white/78 text-primary shadow-[var(--shadow-cartao)] hover:-translate-y-px hover:bg-primary-fixed/35 hover:shadow-[var(--shadow-realce)]"
            : "border-card-border/75 bg-surface-container-low/70 text-outline opacity-65",
      )}
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
      ) : registrado ? (
        <CheckCircle2 aria-hidden="true" size={15} strokeWidth={1.8} />
      ) : (
        <Check aria-hidden="true" size={14} strokeWidth={1.8} className="transition-transform duration-150 group-hover:scale-[1.06]" />
      )}
      {pending ? "Registrando…" : registrado ? "Contato registrado" : "Marcar como enviada"}
    </button>
  );
}

export function ConviteContato({ pacienteId, nome, telefone, tipo }: {
  pacienteId: string;
  nome: string;
  telefone: string | null;
  tipo: "avaliacao" | "aniversario";
}) {
  const [estado, enviar] = useActionState(registrarContato, ACAO_INICIAL);
  const [preparado, setPreparado] = useState(false);
  const [copia, setCopia] = useState<"nada" | "copiada" | "falhou">("nada");
  const dica = useId();
  const mensagem = tipo === "avaliacao" ? mensagemAvaliacao(nome, LINK_AVALIACAO_GOOGLE) : mensagemAniversario(nome);
  const whatsapp = linkWhatsApp(telefone, mensagem);
  const registrado = estado.ok && estado.mensagem !== null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopia("copiada");
      setPreparado(true);
      window.setTimeout(() => setCopia("nada"), 2400);
    } catch {
      // Navegador sem permissão de área de transferência: a pessoa é avisada
      // e ainda pode abrir o WhatsApp.
      setCopia("falhou");
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {whatsapp ? (
          <a
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setPreparado(true)}
            className="group relative inline-flex min-h-10 items-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-positivo-borda bg-[linear-gradient(135deg,var(--color-positivo),#0b8f45)] px-3.5 text-xs font-semibold text-on-primary shadow-[0_10px_22px_-15px_rgba(14,118,57,0.62)] transition-[transform,filter,box-shadow] duration-180 hover:-translate-y-px hover:brightness-[1.02] hover:shadow-[0_14px_26px_-14px_rgba(14,118,57,0.68)] active:translate-y-0 active:scale-[0.985]"
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/45" />
            <MessageCircle aria-hidden="true" size={15} strokeWidth={1.8} className="relative transition-transform duration-150 group-hover:scale-[1.05]" />
            <span className="relative">Abrir WhatsApp</span>
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        ) : (
          <span className="inline-flex min-h-10 items-center rounded-[var(--radius-controle)] border border-dashed border-outline-variant/80 bg-surface-container-low/65 px-3 text-xs font-medium text-outline">Sem telefone válido</span>
        )}

        <button
          type="button"
          onClick={copiar}
          aria-live="polite"
          className={cn(
            "group inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-controle)] border px-3.5 text-xs font-semibold transition-[transform,background-color,border-color,color,box-shadow] duration-180 active:scale-[0.985]",
            copia === "copiada"
              ? "border-positivo-borda bg-positivo-fundo text-positivo shadow-[0_8px_18px_-13px_rgba(14,118,57,0.5)]"
              : "border-card-border/85 bg-white/72 text-primary shadow-[var(--shadow-cartao)] hover:-translate-y-px hover:border-primary/15 hover:bg-white hover:shadow-[var(--shadow-realce)]",
          )}
        >
          {copia === "copiada" ? <Check aria-hidden="true" size={15} strokeWidth={1.9} /> : <Copy aria-hidden="true" size={14} strokeWidth={1.75} className="transition-transform duration-150 group-hover:scale-[1.05]" />}
          {copia === "copiada" ? "Copiada ✓" : "Copiar mensagem"}
        </button>

        <form action={enviar} className="inline-flex flex-wrap items-center gap-2">
          <input type="hidden" name="paciente_id" value={pacienteId} />
          <input type="hidden" name="tipo" value={tipo} />
          <Registrar preparado={preparado} registrado={registrado} dica={dica} />
        </form>
      </div>

      {copia === "falhou" ? (
        <span role="alert" className="inline-flex w-fit rounded-[9px] bg-negativo-fundo/72 px-2.5 py-1.5 text-xs text-negativo">Não foi possível copiar. Use o WhatsApp.</span>
      ) : null}

      {!preparado && !registrado ? (
        // À vista, não só para o leitor de tela: o botão desabilitado sai do
        // Tab e, apagado, não diz por quê (mesmo princípio do
        // BotaoIndisponivel). "Registrar o contato" casa com o rótulo
        // "Contato registrado" que o botão ganha depois.
        <span id={dica} className="text-xs leading-5 text-outline">Abra o WhatsApp ou copie a mensagem antes de registrar o contato.</span>
      ) : null}

      {!estado.ok && estado.mensagem ? (
        <span role="alert" className="inline-flex w-fit rounded-[9px] bg-negativo-fundo/72 px-2.5 py-1.5 text-xs text-negativo">{estado.mensagem}</span>
      ) : null}
      {estado.ok && estado.mensagem ? (
        <span role="status" className="inline-flex w-fit items-center gap-1.5 rounded-[9px] bg-positivo-fundo/72 px-2.5 py-1.5 text-xs font-medium text-positivo"><CheckCircle2 aria-hidden="true" size={13} />{estado.mensagem}</span>
      ) : null}
    </div>
  );
}
