"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { entrar, type EstadoLogin } from "./actions";

const INICIAL: EstadoLogin = { erro: null };

function BotaoEntrar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Entrando…
        </>
      ) : (
        "Entrar"
      )}
    </button>
  );
}

export function FormularioLogin({ proximo }: { proximo: string }) {
  const [estado, acao] = useActionState(entrar, INICIAL);

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="proximo" value={proximo} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface px-3.5 text-sm text-on-surface outline-none placeholder:text-outline focus-visible:border-primary"
          placeholder="voce@clinica.com.br"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="senha" className="rotulo">
          Senha
        </label>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-[var(--radius-cartao)] border border-outline-variant bg-surface px-3.5 text-sm text-on-surface outline-none focus-visible:border-primary"
        />
      </div>

      {estado.erro ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-error/25 bg-error-container px-3.5 py-2.5 text-sm text-on-error-container"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {estado.erro}
        </p>
      ) : null}

      <div className="mt-2">
        <BotaoEntrar />
      </div>
    </form>
  );
}
