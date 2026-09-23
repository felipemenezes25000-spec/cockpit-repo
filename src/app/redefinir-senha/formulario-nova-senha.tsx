"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { ENTRADA } from "@/components/ui/field";
import { clienteNavegador } from "@/lib/supabase/client";

type Situacao = "validando" | "pronto" | "invalido";
const MARCA_RECUPERACAO = "cockpit-recuperacao-senha";

function marcarRecuperacao(usuarioId: string) {
  sessionStorage.setItem(MARCA_RECUPERACAO, JSON.stringify({
    usuarioId,
    expiraEm: Date.now() + 15 * 60 * 1000,
  }));
}

function recuperacaoPendente(usuarioId: string): boolean {
  const marca = sessionStorage.getItem(MARCA_RECUPERACAO);
  if (!marca) return false;
  try {
    const { usuarioId: marcado, expiraEm } = JSON.parse(marca) as {
      usuarioId: string;
      expiraEm: number;
    };
    return marcado === usuarioId && expiraEm > Date.now();
  } catch {
    return false;
  }
}

export function FormularioNovaSenha() {
  const [situacao, definirSituacao] = useState<Situacao>("validando");
  const [senha, definirSenha] = useState("");
  const [confirmacao, definirConfirmacao] = useState("");
  const [salvando, definirSalvando] = useState(false);
  const [erro, definirErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    const supabase = clienteNavegador();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (evento, sessao) => {
        if (ativo && sessao && evento === "PASSWORD_RECOVERY") {
          marcarRecuperacao(sessao.user.id);
          definirSituacao("pronto");
        }
      },
    );

    async function validarLink() {
      try {
        const parametros = new URLSearchParams(window.location.search);
        const tokenHash = parametros.get("token_hash");

        if (tokenHash) {
          window.history.replaceState(null, "", window.location.pathname);
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "recovery",
          });
          if (!error && data.user) marcarRecuperacao(data.user.id);
          if (ativo) definirSituacao(error || !data.user ? "invalido" : "pronto");
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (ativo) definirSituacao((anterior) =>
          anterior === "pronto" ? anterior : user && recuperacaoPendente(user.id) ? "pronto" : "invalido"
        );
      } catch {
        if (ativo) definirSituacao("invalido");
      }
    }

    void validarLink();

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, []);

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    definirErro(null);

    if (senha.length < 12) {
      definirErro("Use pelo menos 12 caracteres na nova senha.");
      return;
    }
    if (senha !== confirmacao) {
      definirErro("As senhas digitadas não coincidem.");
      return;
    }

    definirSalvando(true);
    const supabase = clienteNavegador();
    let senhaAlterada = false;
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        definirErro("Não foi possível alterar a senha. Verifique o link e tente novamente.");
        return;
      }

      senhaAlterada = true;
      sessionStorage.removeItem(MARCA_RECUPERACAO);
      const { error: erroSaida } = await supabase.auth.signOut({ scope: "local" });
      if (erroSaida) {
        definirErro("A senha foi alterada, mas não foi possível encerrar a sessão. Saia do sistema antes de entrar novamente.");
        return;
      }
      window.location.replace("/entrar?senha=alterada");
    } catch {
      definirErro(senhaAlterada
        ? "A senha foi alterada, mas não foi possível encerrar a sessão. Saia do sistema antes de entrar novamente."
        : "Não foi possível conectar ao serviço de autenticação. Tente novamente.");
    } finally {
      definirSalvando(false);
    }
  }

  if (situacao === "validando") {
    return (
      <p role="status" className="flex items-center gap-2 rounded-[var(--radius-controle)] border border-card-border/70 bg-surface/60 px-3.5 py-3 text-sm text-outline">
        <LoaderCircle aria-hidden="true" size={18} className="animate-spin text-primary" />
        Validando o link…
      </p>
    );
  }

  if (situacao === "invalido") {
    return (
      <div className="space-y-4 text-sm">
        <p role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          O link expirou ou não é válido. Solicite outro para continuar.
        </p>
        <Link href="/recuperar-senha" className="inline-flex min-h-9 items-center rounded-[var(--radius-controle)] bg-primary-fixed/40 px-3 font-semibold text-primary transition-colors hover:bg-primary-fixed/65">
          Pedir outro link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nova-senha" className="rotulo">Nova senha</label>
        <input id="nova-senha" name="nova-senha" type="password" autoComplete="new-password" minLength={12} required aria-invalid={erro ? true : undefined} aria-describedby={erro ? "dica-nova-senha erro-nova-senha" : "dica-nova-senha"} value={senha} onChange={(evento) => definirSenha(evento.target.value)} className={ENTRADA} />
        <p id="dica-nova-senha" className="text-xs text-outline">Use pelo menos 12 caracteres.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmacao-senha" className="rotulo">Confirme a nova senha</label>
        <input id="confirmacao-senha" name="confirmacao-senha" type="password" autoComplete="new-password" required aria-invalid={erro ? true : undefined} aria-describedby={erro ? "erro-nova-senha" : undefined} value={confirmacao} onChange={(evento) => definirConfirmacao(evento.target.value)} className={ENTRADA} />
      </div>
      {erro ? (
        <p id="erro-nova-senha" role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <CircleAlert aria-hidden="true" size={16} className="mt-0.5 shrink-0" />
          {erro}
        </p>
      ) : null}
      <button type="submit" disabled={salvando} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary/10 bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_12px_28px_-12px_rgba(10,110,209,0.72)] active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        {salvando ? <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> Salvando…</> : "Salvar nova senha"}
      </button>
    </form>
  );
}
