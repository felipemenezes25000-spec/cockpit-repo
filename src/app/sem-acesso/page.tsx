import type { Metadata } from "next";
import { LockKeyhole, ShieldOff } from "lucide-react";
import { redirect } from "next/navigation";
import { BotaoSair } from "@/components/layout/botao-sair";
import { SeloHero } from "@/components/ui/page-hero";
import { usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sem acesso" };

export default async function PaginaSemAcesso() {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (await usuarioAtual()) redirect("/");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-10">
      <section className="premium-panel relative isolate w-full max-w-xl overflow-hidden rounded-[var(--radius-painel)] border px-6 py-10 text-center sm:px-10 sm:py-12">

        <span className="mx-auto flex size-14 items-center justify-center rounded-[var(--radius-painel)] border border-card-border bg-surface-container-low text-outline">
          <ShieldOff aria-hidden="true" size={24} strokeWidth={1.65} />
        </span>

        <p className="rotulo mt-6 text-primary">Conta autenticada</p>
        <h1 className="titulo-tela mt-2 text-on-surface">
          Seu acesso está inativo
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-on-surface-variant">
          O login foi reconhecido, mas esta conta não possui um perfil ativo para usar o sistema. A administradora da clínica pode reativar o acesso.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <SeloHero>
            <LockKeyhole aria-hidden="true" size={13} strokeWidth={1.75} />
            Dados protegidos
          </SeloHero>
          <SeloHero tom="informativo">Sessão reconhecida</SeloHero>
        </div>

        <div className="mx-auto mt-7 max-w-md rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low px-4 py-3 text-left text-xs leading-5 text-outline">
          Se você acredita que deveria ter acesso, peça à administradora para conferir se seu perfil está ativo. Sair encerra esta sessão e permite entrar com outra conta.
        </div>

        <div className="mt-8 flex justify-center">
          <BotaoSair />
        </div>
      </section>
    </main>
  );
}
