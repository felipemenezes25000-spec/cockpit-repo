"use client";

import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
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
      className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary transition-colors duration-150 hover:border-primary-hover hover:bg-primary-hover active:translate-y-px active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Entrando…
        </>
      ) : (
        <>
          Entrar
          <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} className="transition-transform duration-180 group-hover:translate-x-0.5" />
        </>
      )}
    </button>
  );
}

export function FormularioLogin({ proximo }: { proximo: string }) {
  const [estado, acao] = useActionState(entrar, INICIAL);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const comErro = Boolean(estado.erro);
  const emailInvalido = estado.invalidos?.includes("email") ?? false;
  const senhaInvalida = estado.invalidos?.includes("senha") ?? false;

  return (
    <form action={acao} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="proximo" value={proximo} />

      <div className="group/campo flex flex-col gap-1.5">
        <label htmlFor="email" className="text-[0.8125rem] font-semibold text-on-surface transition-colors duration-150 group-focus-within/campo:text-primary">E-mail</label>
        <div className="relative">
          <Mail aria-hidden="true" size={17} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-outline transition-colors group-focus-within/campo:text-primary" />
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
            className={cn(ENTRADA, "pl-10", emailInvalido && ENTRADA_ERRO)}
            placeholder="voce@clinica.com.br"
          />
        </div>
      </div>

      <div className="group/campo flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="senha" className="text-[0.8125rem] font-semibold text-on-surface transition-colors duration-150 group-focus-within/campo:text-primary">Senha</label>
          <Link href="/recuperar-senha" className="inline-flex min-h-7 items-center rounded-[var(--radius-controle)] px-1.5 text-xs font-semibold text-primary transition-[background-color,transform] duration-150 hover:bg-selecao active:scale-[0.98]">
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-outline transition-colors group-focus-within/campo:text-primary" />
          <input
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={senhaInvalida || undefined}
            aria-describedby={comErro ? "erro-login" : undefined}
            className={cn(ENTRADA, "pr-11 pl-10", senhaInvalida && ENTRADA_ERRO)}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((valor) => !valor)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={mostrarSenha}
            className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[var(--radius-controle)] text-outline transition-[transform,background-color,color] duration-150 hover:bg-selecao hover:text-primary active:scale-95"
          >
            {mostrarSenha ? <EyeOff aria-hidden="true" size={17} strokeWidth={1.65} /> : <Eye aria-hidden="true" size={17} strokeWidth={1.65} />}
          </button>
        </div>
      </div>

      {estado.erro ? (
        <p id="erro-login" role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-on-error-container">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {estado.erro}
        </p>
      ) : null}

      <div className="mt-2"><BotaoEntrar /></div>
    </form>
  );
}
