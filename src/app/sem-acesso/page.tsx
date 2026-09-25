import type { Metadata } from "next";
import { LockKeyhole, ShieldOff } from "lucide-react";
import { redirect } from "next/navigation";
import { BotaoSair } from "@/components/layout/botao-sair";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";
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
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#fbfdff_46%,#f6f9fc_100%)] px-5 py-10">
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-28 size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none -right-44 -bottom-52 size-[34rem] rounded-full bg-informativo-fundo/75 blur-3xl" />

      <div className="relative"><MarcaComNome tamanho="medio" /></div>
      <section className="premium-panel relative isolate w-full max-w-xl overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border px-6 py-10 text-center shadow-[0_30px_72px_-54px_rgba(7,57,112,.58)] sm:px-10 sm:py-12">
        <span aria-hidden="true" className="pointer-events-none absolute -top-28 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary-fixed/35 blur-3xl" />

        <span className="relative mx-auto flex size-14 items-center justify-center rounded-[var(--radius-painel)] border border-card-border bg-surface-container-low text-outline shadow-[0_16px_34px_-26px_rgba(8,41,76,.4)]">
          <ShieldOff aria-hidden="true" size={24} strokeWidth={1.65} />
        </span>

        <p className="rotulo relative mt-6 text-primary">Conta autenticada</p>
        <h1 className="titulo-tela relative mt-2 text-on-surface">
          Seu acesso está inativo
        </h1>
        <p className="relative mx-auto mt-4 max-w-md text-sm leading-6 text-on-surface-variant">
          O login foi reconhecido, mas esta conta não possui um perfil ativo para usar o sistema. A administradora da clínica pode reativar o acesso.
        </p>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
          <SeloHero>
            <LockKeyhole aria-hidden="true" size={13} strokeWidth={1.75} />
            Dados protegidos
          </SeloHero>
          <SeloHero tom="informativo">Sessão reconhecida</SeloHero>
        </div>

        <div className="relative mx-auto mt-7 max-w-md rounded-[var(--radius-controle)] border border-card-border bg-surface-container-low/90 px-4 py-3 text-left text-xs leading-5 text-outline">
          Se você acredita que deveria ter acesso, peça à administradora para conferir se seu perfil está ativo. Sair encerra esta sessão e permite entrar com outra conta.
        </div>

        <div className="relative mt-8 flex justify-center">
          <BotaoSair />
        </div>
      </section>
    </main>
  );
}
