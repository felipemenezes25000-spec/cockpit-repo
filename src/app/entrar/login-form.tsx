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
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] bg-primary-container px-6 text-sm font-medium text-on-primary transition-colors hover:bg-primary disabled:cursor-wait disabled:opacity-60"
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

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="proximo" value={proximo} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="rotulo">
          E-mail
        </label>
        <input
          // A chave remonta o campo com o e-mail devolvido pela ação: o React
          // limpa o formulário depois de cada envio, e errar a senha não pode
          // obrigar a digitar o e-mail de novo.
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
          aria-invalid={comErro || undefined}
          aria-describedby={comErro ? "erro-login" : undefined}
          className={cn(ENTRADA, comErro && ENTRADA_ERRO)}
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
          aria-invalid={comErro || undefined}
          aria-describedby={comErro ? "erro-login" : undefined}
          className={cn(ENTRADA, comErro && ENTRADA_ERRO)}
        />
        <Link
          href="/recuperar-senha"
          className="self-end py-1 text-sm font-medium text-primary hover:underline"
        >
          Esqueci minha senha
        </Link>
      </div>

      {estado.erro ? (
        <p
          id="erro-login"
          role="alert"
          className="flex items-start gap-2 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-2.5 text-sm text-on-error-container"
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
