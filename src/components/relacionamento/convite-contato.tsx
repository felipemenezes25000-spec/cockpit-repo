"use client";

import { Check, Copy, ExternalLink, LoaderCircle } from "lucide-react";
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
      aria-describedby={!preparado ? dica : undefined}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-xs font-medium text-primary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-55"
    >
      {pending ? (
        <LoaderCircle aria-hidden="true" size={14} className="animate-spin" />
      ) : (
        <Check aria-hidden="true" size={14} />
      )}
      {pending ? "Registrando…" : registrado ? "Registrado" : "Marcar como enviada"}
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
    } catch {
      // Navegador sem permissão de área de transferência: a pessoa é avisada
      // e ainda pode abrir o WhatsApp.
      setCopia("falhou");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {whatsapp ? (
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setPreparado(true)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] bg-primary-container px-3 text-xs font-medium text-on-primary hover:bg-primary"
        >
          <ExternalLink aria-hidden="true" size={14} /> Abrir WhatsApp
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      ) : (
        <span className="text-xs text-outline">Sem telefone válido</span>
      )}
      <button
        type="button"
        onClick={copiar}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-xs font-medium text-primary hover:bg-surface-container-low"
      >
        <Copy aria-hidden="true" size={14} /> {copia === "copiada" ? "Copiada" : "Copiar mensagem"}
      </button>
      {copia === "falhou" ? (
        <span role="alert" className="text-xs text-negativo">Não foi possível copiar. Use o WhatsApp.</span>
      ) : null}
      <form action={enviar} className="inline-flex flex-wrap items-center gap-2">
        <input type="hidden" name="paciente_id" value={pacienteId} />
        <input type="hidden" name="tipo" value={tipo} />
        <Registrar preparado={preparado} registrado={registrado} dica={dica} />
        {!preparado ? (
          // À vista, não só para o leitor de tela: o botão desabilitado sai
          // do Tab e, apagado, não diz por quê (mesmo princípio do
          // BotaoIndisponivel).
          <span id={dica} className="text-xs text-outline">
            Abra o WhatsApp ou copie a mensagem antes de registrar.
          </span>
        ) : null}
        {!estado.ok && estado.mensagem ? (
          <span role="alert" className="text-xs text-negativo">{estado.mensagem}</span>
        ) : null}
        {estado.ok && estado.mensagem ? (
          <span role="status" className="text-xs text-positivo">{estado.mensagem}</span>
        ) : null}
      </form>
    </div>
  );
}
