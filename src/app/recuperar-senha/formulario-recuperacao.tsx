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
      // O cliente do Supabase no navegador pesa ~70 kB e só serve no envio:
      // carregado aqui, a tela abre com o JS da base (o `next build` media
      // 178 kB de First Load contra ~105 kB das outras telas públicas). Se o
      // pedaço não baixar, cai no mesmo aviso de falha de conexão.
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
      <div role="status" className="relative overflow-hidden rounded-[var(--radius-painel)] border border-positivo-borda bg-positivo-fundo px-4 py-5 text-sm text-positivo sm:px-5">
        <div className="relative flex items-start gap-3.5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-cartao)] border border-positivo-borda bg-surface text-positivo">
            <MailCheck aria-hidden="true" size={20} strokeWidth={1.8} />
          </span>
          <div>
            <p className="font-semibold tracking-[-0.01em]">Confira seu e-mail</p>
            <p className="mt-1 leading-6 text-on-surface-variant">Se houver uma conta com esse e-mail, você receberá um link seguro para redefinir a senha. Confira também a pasta de spam.</p>
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-positivo-borda bg-surface px-2.5 py-1 text-[0.66rem] font-semibold text-positivo">
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
        <label htmlFor="email-recuperacao" className="text-[0.8125rem] font-semibold text-on-surface transition-colors duration-150 group-focus-within/campo:text-primary">E-mail</label>
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
            // Os erros daqui são do serviço (limite, conexão), não do e-mail
            // digitado: o aviso fica ligado ao campo sem marcá-lo inválido
            // (aria-invalid também pintaria a borda de vermelho em ENTRADA).
            aria-describedby={erro ? "erro-recuperacao" : "dica-recuperacao"}
            value={email}
            onChange={(evento) => definirEmail(evento.target.value)}
            className={`${ENTRADA} pl-10`}
            placeholder="voce@clinica.com.br"
          />
        </div>
        <p id="dica-recuperacao" className="text-xs leading-5 text-outline">Enviaremos um link de recuperação se existir uma conta correspondente.</p>
      </div>

      {erro ? (
        <p id="erro-recuperacao" role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-on-error-container">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={enviando} className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary transition-colors duration-150 hover:border-primary-hover hover:bg-primary-hover active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        {enviando ? (
          <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> Enviando…</>
        ) : (
          <>Enviar link seguro <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} className="transition-transform duration-180 group-hover:translate-x-0.5" /></>
        )}
      </button>
    </form>
  );
}
