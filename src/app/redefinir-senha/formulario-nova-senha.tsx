"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleAlert,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
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
  const [mostrarSenha, definirMostrarSenha] = useState(false);
  const [mostrarConfirmacao, definirMostrarConfirmacao] = useState(false);
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
      <div role="status" className="relative overflow-hidden rounded-[16px] border border-card-border/70 bg-white/68 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)]">
        <span aria-hidden="true" className="pointer-events-none absolute -top-12 -right-10 size-28 rounded-full bg-primary-fixed/45 blur-2xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-primary/10 bg-primary-fixed/55 text-primary shadow-[var(--shadow-cartao)]">
            <LoaderCircle aria-hidden="true" size={19} className="animate-spin" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-on-surface">Validando o link seguro</span>
            <span className="mt-0.5 block text-xs leading-5 text-outline">Confirmando se esta recuperação ainda pode ser usada.</span>
          </span>
        </div>
      </div>
    );
  }

  if (situacao === "invalido") {
    return (
      <div className="space-y-4 text-sm">
        <div role="alert" className="relative overflow-hidden rounded-[16px] border border-negativo-borda bg-negativo-fundo/82 px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-negativo-borda/70 bg-white/52 text-negativo">
              <CircleAlert aria-hidden="true" size={17} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block font-semibold text-negativo">Este link não pode mais ser usado</span>
              <span className="mt-1 block leading-6 text-on-error-container">Ele expirou ou não é válido. Solicite outro link para continuar.</span>
            </span>
          </div>
        </div>
        <Link href="/recuperar-senha" className="group inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-controle)] border border-primary/20 bg-primary-fixed/42 px-4 font-semibold text-primary shadow-[var(--shadow-cartao)] transition-[transform,background-color,box-shadow] duration-150 hover:-translate-y-0.5 hover:bg-primary-fixed/65 hover:shadow-[var(--shadow-realce)] active:translate-y-px">
          Pedir outro link
          <ArrowRight aria-hidden="true" size={16} strokeWidth={1.8} className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  const senhaMinima = senha.length >= 12;
  const coincidem = confirmacao.length > 0 && senha === confirmacao;

  return (
    <form onSubmit={salvar} className="flex flex-col gap-4">
      <div className="rounded-[14px] border border-positivo-borda/55 bg-positivo-fundo/48 px-3.5 py-3 text-xs leading-5 text-on-surface-variant shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]">
        <span className="flex items-center gap-2 font-semibold text-positivo">
          <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.8} />
          Link confirmado
        </span>
        <span className="mt-1 block">Defina uma nova senha para concluir a recuperação.</span>
      </div>

      <div className="group/campo flex flex-col gap-1.5">
        <label htmlFor="nova-senha" className="rotulo transition-colors duration-200 group-focus-within/campo:text-primary">Nova senha</label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-outline transition-colors group-focus-within/campo:text-primary" />
          <input
            id="nova-senha"
            name="nova-senha"
            type={mostrarSenha ? "text" : "password"}
            autoComplete="new-password"
            minLength={12}
            required
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "dica-nova-senha erro-nova-senha" : "dica-nova-senha"}
            value={senha}
            onChange={(evento) => definirSenha(evento.target.value)}
            className={`${ENTRADA} pr-11 pl-10`}
          />
          <button type="button" onClick={() => definirMostrarSenha((valor) => !valor)} aria-label={mostrarSenha ? "Ocultar nova senha" : "Mostrar nova senha"} aria-pressed={mostrarSenha} className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[10px] text-outline transition-[transform,background-color,color] duration-150 hover:bg-primary-fixed/40 hover:text-primary active:scale-95">
            {mostrarSenha ? <EyeOff aria-hidden="true" size={17} strokeWidth={1.65} /> : <Eye aria-hidden="true" size={17} strokeWidth={1.65} />}
          </button>
        </div>
        <div id="dica-nova-senha" className="flex items-center justify-between gap-3 text-xs">
          <span className={senhaMinima ? "font-medium text-positivo" : "text-outline"}>Pelo menos 12 caracteres</span>
          {senha ? <span className="tabular text-outline">{senha.length}/12+</span> : null}
        </div>
      </div>

      <div className="group/campo flex flex-col gap-1.5">
        <label htmlFor="confirmacao-senha" className="rotulo transition-colors duration-200 group-focus-within/campo:text-primary">Confirme a nova senha</label>
        <div className="relative">
          <LockKeyhole aria-hidden="true" size={17} strokeWidth={1.6} className="pointer-events-none absolute top-1/2 left-3.5 z-[1] -translate-y-1/2 text-outline transition-colors group-focus-within/campo:text-primary" />
          <input
            id="confirmacao-senha"
            name="confirmacao-senha"
            type={mostrarConfirmacao ? "text" : "password"}
            autoComplete="new-password"
            required
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? "erro-nova-senha" : undefined}
            value={confirmacao}
            onChange={(evento) => definirConfirmacao(evento.target.value)}
            className={`${ENTRADA} pr-11 pl-10`}
          />
          <button type="button" onClick={() => definirMostrarConfirmacao((valor) => !valor)} aria-label={mostrarConfirmacao ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"} aria-pressed={mostrarConfirmacao} className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 items-center justify-center rounded-[10px] text-outline transition-[transform,background-color,color] duration-150 hover:bg-primary-fixed/40 hover:text-primary active:scale-95">
            {mostrarConfirmacao ? <EyeOff aria-hidden="true" size={17} strokeWidth={1.65} /> : <Eye aria-hidden="true" size={17} strokeWidth={1.65} />}
          </button>
        </div>
        {confirmacao ? (
          <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${coincidem ? "text-positivo" : "text-atencao"}`}>
            {coincidem ? <CheckCircle2 aria-hidden="true" size={14} strokeWidth={1.8} /> : <CircleAlert aria-hidden="true" size={14} strokeWidth={1.8} />}
            {coincidem ? "As senhas coincidem" : "As senhas ainda não coincidem"}
          </span>
        ) : null}
      </div>

      {erro ? (
        <p id="erro-nova-senha" role="alert" className="flex items-start gap-2 rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-3 text-sm leading-6 text-on-error-container shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          <CircleAlert aria-hidden="true" size={16} className="mt-1 shrink-0" />
          {erro}
        </p>
      ) : null}

      <button type="submit" disabled={salvando} className="group relative inline-flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--radius-controle)] border border-primary/10 bg-linear-to-b from-primary-container to-primary px-6 text-sm font-semibold text-on-primary shadow-[var(--shadow-primary)] transition-[transform,box-shadow,filter] duration-180 hover:-translate-y-0.5 hover:brightness-[0.97] hover:shadow-[0_12px_28px_-12px_rgba(10,110,209,0.72)] active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0">
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-8 top-0 h-px bg-white/45" />
        {salvando ? (
          <><LoaderCircle aria-hidden="true" size={18} className="animate-spin" /> Salvando…</>
        ) : (
          <>Salvar nova senha <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} className="transition-transform duration-180 group-hover:translate-x-0.5" /></>
        )}
      </button>
    </form>
  );
}
