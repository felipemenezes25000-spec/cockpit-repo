"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle, MailCheck } from "lucide-react";
import { ENTRADA } from "@/components/ui/field";

export function FormularioRecuperacao() {
  const [email, definirEmail] = useState("");
  const [enviando, definirEnviando] = useState(false);
  const [enviado, definirEnviado] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    definirErro(null);
    definirEnviando(true);

    try {
      const { clienteNavegador } = await import("@/lib/supabase/client");
      const { error } = await clienteNavegador().auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/redefinir-senha` },
      );

      if (error) {
        definirErro(
          error.status === 429
            ? "Aguarde alguns minutos antes de pedir outro link."
            : "Não foi possível solicitar o link agora. Tente novamente mais tarde.",
        );
        return;
      }

      definirEnviado(true);
    } catch {
      definirErro("Não foi possível conectar ao serviço de e-mail. Tente novamente mais tarde.");
    } finally {
      definirEnviando(false);
    }
  }

  if (enviado) {
    return (
      <div role="status" className="rounded-[var(--radius-painel)] border border-positivo-borda bg-positivo-fundo/80 px-4 py-4 text-sm text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
        <span className="mb-2 flex size-9 items-center justify-center rounded-xl bg-surface/70">
          <MailCheck aria-hidden="true" size={18} strokeWidth={1.8} />
        </span>
        <p className="font-semibold">Confira seu e-mail</p>
        <p className="mt-1 leading-6">Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha. Confira também a pasta de spam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email-recuperacao" className="rotulo">E-mail</label>
        <input
          id="email-recuperacao"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-describedby={erro ? "erro-recuperacao" : undefined}
          value={email}
          onChange={(evento) => definirEmail(evento.target.value)}
          className={ENTRADA}
          placeholder="voce@clinica.com.br"
        />
      </div>
      {erro ? (
        <p id="erro-recuperacao" role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      ) : null}
      <button type="submit" disabled={enviando} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary/10 bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_12px_28px_-12px_rgba(10,110,209,0.72)] active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        {enviando ? <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> Enviando…</> : "Enviar link seguro"}
      </button>
    </form>
  );
}
