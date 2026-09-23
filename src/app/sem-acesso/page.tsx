import type { Metadata } from "next";
import { ShieldOff } from "lucide-react";
import { redirect } from "next/navigation";
import { BotaoSair } from "@/components/layout/botao-sair";
import { usuarioAtual } from "@/lib/auth";
import { clienteServidor } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sem acesso" };

/**
 * Quem tem login válido mas está sem perfil ativo cai aqui. Acontece quando a
 * administradora desativa alguém que ainda tem sessão aberta.
 *
 * A rota é pública no middleware, então chega aqui também quem não tem sessão
 * (endereço digitado, aba antiga depois de sair) e quem está liberado. Para
 * esses a frase "o login funcionou, mas a conta não está liberada" seria
 * falsa: sem sessão vai para o login; com perfil ativo, para a Visão Geral.
 */
export default async function PaginaSemAcesso() {
  const supabase = await clienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  if (await usuarioAtual()) redirect("/");

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <span
          aria-hidden="true"
          className="mx-auto mb-6 flex size-12 items-center justify-center rounded-[var(--radius-controle)] bg-surface-container text-outline"
        >
          <ShieldOff size={22} strokeWidth={1.5} />
        </span>

        <h1 className="t-headline text-primary">Seu acesso está inativo</h1>
        <p className="mt-3 text-sm text-on-surface-variant">
          O login funcionou, mas a conta não está liberada para usar o sistema.
          Fale com a administradora para reativar.
        </p>

        <div className="mt-8 flex justify-center">
          <BotaoSair />
        </div>
      </div>
    </main>
  );
}
