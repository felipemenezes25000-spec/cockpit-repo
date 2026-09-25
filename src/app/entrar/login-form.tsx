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
      className="group relative inline-flex h-12 w-full items-center justify-center gap-2.5 overflow-hidden rounded-[var(--radius-cartao)] border border-primary-container bg-primary-container px-6 text-[0.95rem] font-semibold text-on-primary shadow-[0_18px_36px_-22px_rgba(10,110,209,.9)] transition-[transform,background-color,border-color,box-shadow] duration-150 hover:border-primary-hover hover:bg-primary-hover hover:shadow-[0_22px_40px_-22px_rgba(8,60,115,.9)] active:translate-y-px active:scale-[0.99] disabled:cursor-wait disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={18} className="animate-spin" />
          Entrando…
        </>
      ) : (
        <>
          Entrar
          <ArrowRight aria-hidden="true" size={18} strokeWidth={1.9} className="transition-transform duration-180 group-hover:translate-x-1" />
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
    <form action={acao} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="proximo" value={proximo} />

      <div className="group/campo flex flex-col gap-2">
        <label htmlFor="email" className="text-[0.8125rem] font-semibold text-on-surface transition-colors duration-150 group-focus-within/campo:text-primary">
          E-mail
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 z-[1] flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tag)] bg-surface-container-low text-outline transition-colors group-focus-within/campo:bg-primary-fixed group-focus-within/campo:text-primary">
            <Mail aria-hidden="true" size={15} strokeWidth={1.7} />
          </span>
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
            className={cn(
              ENTRADA,
              "h-12! rounded-[var(--radius-cartao)] border-card-border bg-surface px-3.5 pl-12 shadow-[0_1px_0_rgba(8,41,76,.02)] hover:border-borda-controle focus-visible:border-primary-container",
              emailInvalido && ENTRADA_ERRO,
            )}
            placeholder="voce@clinica.com.br"
          />
        </div>
      </div>

      <div className="group/campo flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="senha" className="text-[0.8125rem] font-semibold text-on-surface transition-colors duration-150 group-focus-within/campo:text-primary">
            Senha
          </label>
          <Link
            href="/recuperar-senha"
            className="inline-flex min-h-7 items-center rounded-[var(--radius-controle)] px-1.5 text-xs font-semibold text-primary transition-[background-color,transform] duration-150 hover:bg-selecao active:scale-[0.98]"
          >
            Esqueci minha senha
          </Link>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 z-[1] flex size-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-tag)] bg-surface-container-low text-outline transition-colors group-focus-within/campo:bg-primary-fixed group-focus-within/campo:text-primary">
            <LockKeyhole aria-hidden="true" size={15} strokeWidth={1.7} />
          </span>
          <input
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={senhaInvalida || undefined}
            aria-describedby={comErro ? "erro-login" : undefined}
            className={cn(
              ENTRADA,
              "h-12! rounded-[var(--radius-cartao)] border-card-border bg-surface pr-12 pl-12 shadow-[0_1px_0_rgba(8,41,76,.02)] hover:border-borda-controle focus-visible:border-primary-container",
              senhaInvalida && ENTRADA_ERRO,
            )}
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
        <p id="erro-login" role="alert" className="flex items-start gap-2.5 rounded-[var(--radius-cartao)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-on-error-container">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {estado.erro}
        </p>
      ) : null}

      <div className="mt-1">
        <BotaoEntrar />
      </div>
    </form>
  );
}
