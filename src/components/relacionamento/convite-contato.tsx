"use client";

import { Check, Copy, ExternalLink } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  LINK_AVALIACAO_GOOGLE,
  mensagemAvaliacao,
  telefoneParaWhatsApp,
  type EstadoRelacionamento,
} from "@/lib/relacionamento";
import { registrarContato } from "@/server/acoes/relacionamento";

function Registrar({ enviado }: { enviado: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending || !enviado} title={!enviado ? "Abra o WhatsApp ou copie a mensagem antes de registrar" : undefined} className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-xs font-medium text-primary hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-55">
    <Check aria-hidden="true" size={14} />
    {pending ? "Registrando…" : "Marcar como enviada"}
  </button>;
}

export function ConviteContato({ pacienteId, nome, telefone, tipo }: {
  pacienteId: string;
  nome: string;
  telefone: string | null;
  tipo: "avaliacao" | "aniversario";
}) {
  const [estado, enviar] = useActionState(registrarContato, { erros: {} } as EstadoRelacionamento);
  const [preparado, setPreparado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const numero = telefoneParaWhatsApp(telefone);
  const mensagem = tipo === "avaliacao"
    ? mensagemAvaliacao(nome, LINK_AVALIACAO_GOOGLE)
    : `Olá, ${nome.trim().split(/\s+/)[0]}! A equipe da Dra. Érika Passos deseja a você um feliz aniversário!`;
  const whatsapp = numero ? `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}` : null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensagem);
      setCopiado(true);
      setPreparado(true);
    } catch {
      setCopiado(false);
    }
  }

  return <div className="flex flex-wrap items-center gap-2">
    {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer" onClick={() => setPreparado(true)} className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] bg-primary-container px-3 text-xs font-medium text-on-primary hover:bg-primary">
      <ExternalLink aria-hidden="true" size={14} /> Abrir WhatsApp
    </a> : <span className="text-xs text-outline">Sem telefone válido</span>}
    <button type="button" onClick={copiar} className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-cartao)] border border-card-border bg-surface px-3 text-xs font-medium text-primary hover:bg-surface-container-low">
      <Copy aria-hidden="true" size={14} /> {copiado ? "Copiada" : "Copiar mensagem"}
    </button>
    <form action={enviar} className="inline-flex flex-wrap items-center gap-2">
      <input type="hidden" name="paciente_id" value={pacienteId} />
      <input type="hidden" name="tipo" value={tipo} />
      <Registrar enviado={preparado && !estado.mensagem} />
      {estado.erros.geral && <span role="alert" className="text-xs text-error">{estado.erros.geral}</span>}
      {estado.mensagem && <span role="status" className="text-xs text-positivo">{estado.mensagem}</span>}
    </form>
  </div>;
}
