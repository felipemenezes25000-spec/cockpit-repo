"use client";

import { ArrowRight, CircleAlert, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { BOTAO_ACESSO, CAMPO_ACESSO, ICONE_ACESSO, OLHO_ACESSO } from "@/components/ui/campo-de-acesso";
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
      className={BOTAO_ACESSO}
    >
      {pending ? (
        <>
          <LoaderCircle aria-hidden="true" size={19} className="animate-spin" />
          Entrando…
        </>
      ) : (
        <>
          Entrar
          <ArrowRight aria-hidden="true" size={19} strokeWidth={1.9} className="transition-transform duration-180 group-hover:translate-x-1" />
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
          <span className={ICONE_ACESSO}>
            <Mail aria-hidden="true" size={16} strokeWidth={1.7} />
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
            className={cn(ENTRADA, CAMPO_ACESSO, emailInvalido && ENTRADA_ERRO)}
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
          <span className={ICONE_ACESSO}>
            <LockKeyhole aria-hidden="true" size={16} strokeWidth={1.7} />
          </span>
          <input
            id="senha"
            name="senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="current-password"
            required
            aria-invalid={senhaInvalida || undefined}
            aria-describedby={comErro ? "erro-login" : undefined}
            className={cn(ENTRADA, CAMPO_ACESSO, "pr-13!", senhaInvalida && ENTRADA_ERRO)}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((valor) => !valor)}
            aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            aria-pressed={mostrarSenha}
            className={OLHO_ACESSO}
          >
            {mostrarSenha ? <EyeOff aria-hidden="true" size={18} strokeWidth={1.65} /> : <Eye aria-hidden="true" size={18} strokeWidth={1.65} />}
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
