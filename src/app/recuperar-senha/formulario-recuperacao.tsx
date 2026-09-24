"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, CircleAlert, LoaderCircle, Mail, MailCheck, ShieldCheck } from "lucide-react";
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
      <div role="status" className="relative overflow-hidden rounded-[18px] border border-positivo-borda bg-[linear-gradient(145deg,rgba(233,248,238,0.9),rgba(255,255,255,0.9))] px-4 py-5 text-sm text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.82),var(--shadow-cartao)] sm:px-5">
        <span aria-hidden="true" className="pointer-events-none absolute -top-14 -right-12 size-32 rounded-full bg-positivo-fundo blur-2xl" />
        <div className="relative flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-positivo-borda/70 bg-white/66 text-positivo shadow-[var(--shadow-cartao)]">
            <MailCheck aria-hidden="true" size={20} strokeWidth={1.8} />
          </span>
          <div>
            <p className="font-semibold tracking-[-0.01em]">Confira seu e-mail</p>
            <p className="mt-1 leading-6 text-on-surface-variant">Se houver uma conta com esse e-mail, você receberá um link seguro para redefinir a senha. Confira também a pasta de spam.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-positivo-borda/70 bg-white/55 px-2.5 py-1 text-[0.66rem] font-semibold text-positivo">
              <ShieldCheck aria-hidden="true" size={12} strokeWidth={1.8} />
              O e-mail da conta não é revelado
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <div className="group/campo flex flex-col gap-1.5">
        <label htmlFor="email-recuperacao" className="rotulo transition-colors duration-200 group-focus-within/campo:text-primary">E-mail</label>
        <div className="relative">
          <Mail aria-hidden="true" size={17} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-outline transition-colors group-focus-within/campo:text-primary" />
          <input
            id="email-recuperacao"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            required
            aria-describedby={erro ? "erro-recuperacao" : "dica-recuperacao"}
            aria-invalid={erro ? true : undefined}
            value={email}
            onChange={(evento) => definirEmail(evento.target.value)}
            className={`${ENTRADA} pl-10`}
            placeholder="voce@clinica.com.br"
          />
        </div>
        <p id="dica-recuperacao" className="text-xs leading-5 text-outline">Enviaremos um link de recuperação se existir uma conta correspondente.</p>
      </div>

      {erro ? (
        <p id="erro-recuperacao" role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary/10 bg-linear-to-b from-primary-container to-primary px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,box-shadow,filter] duration-180 hover:-translate-y-0.5 hover:brightness-[0.97] hover:shadow-[0_12px_28px_-12px_rgba(10,110,209,0.72)] active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/45" />
        {enviando ? (
          <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> Enviando…</>
        ) : (
          <>Enviar link seguro <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} className="transition-transform duration-180 group-hover:translate-x-0.5" /></>
        )}
      </button>
    </form>
  );
}
