"use client";

import { CircleAlert, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ENTRADA, ENTRADA_ERRO } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { entrar, type EstadoLogin } from "./actions";

const INICIAL: EstadoLogin = { erro: null };

function BotaoEntrar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary/10 bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_12px_28px_-12px_rgba(10,110,209,0.72)] active:translate-y-px active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
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
  const comErro = Boolean(estado.erro);
  const emailInvalido = estado.invalidos?.includes("email") ?? false;
  const senhaInvalida = estado.invalidos?.includes("senha") ?? false;

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="proximo" value={proximo} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="rotulo">E-mail</label>
        <input
          key={estado.email ?? ""}
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          defaultValue={estado.email ?? ""}
          aria-invalid={emailInvalido || undefined}
          aria-describedby={comErro ? "erro-login" : undefined}
          className={cn(ENTRADA, emailInvalido && ENTRADA_ERRO)}
          placeholder="voce@clinica.com.br"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="senha" className="rotulo">Senha</label>
          <Link
            href="/recuperar-senha"
            className="inline-flex min-h-7 items-center rounded-lg px-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed/40"
          >
            Esqueci minha senha
          </Link>
        </div>
        <input
          id="senha"
          name="senha"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={senhaInvalida || undefined}
          aria-describedby={comErro ? "erro-login" : undefined}
          className={cn(ENTRADA, senhaInvalida && ENTRADA_ERRO)}
        />
      </div>

      {estado.erro ? (
        <p
          id="erro-login"
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
        >
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {estado.erro}
        </p>
      ) : null}

      <div className="mt-2"><BotaoEntrar /></div>
    </form>
  );
}
