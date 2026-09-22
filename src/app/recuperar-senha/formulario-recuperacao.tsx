"use client";

import { useState, type FormEvent } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { ENTRADA } from "@/components/ui/field";
import { clienteNavegador } from "@/lib/supabase/client";

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

      // A confirmação é igual para e-mails cadastrados e desconhecidos.
      definirEnviado(true);
    } catch {
      definirErro("Não foi possível conectar ao serviço de e-mail. Tente novamente mais tarde.");
    } finally {
      definirEnviando(false);
    }
  }

  if (enviado) {
    return (
      <p role="status" className="rounded-[var(--radius-cartao)] border border-positivo-borda bg-positivo-fundo px-3.5 py-3 text-sm text-positivo">
        Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha. Confira também a pasta de spam.
      </p>
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
          value={email}
          onChange={(evento) => definirEmail(evento.target.value)}
          className={ENTRADA}
        />
      </div>
      {erro ? (
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      ) : null}
      <button type="submit" disabled={enviando} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60">
        {enviando ? <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> Enviando…</> : "Enviar link"}
      </button>
    </form>
  );
}
