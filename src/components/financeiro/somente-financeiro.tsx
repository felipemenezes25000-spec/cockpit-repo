import { ShieldAlert, WalletCards } from "lucide-react";
import { LinkDeVoltar, SeloHero } from "@/components/ui/page-hero";

/** Estado institucional para perfis que não operam o caixa. */
export function SomenteFinanceiro({ voltarPara }: { voltarPara: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <LinkDeVoltar href={voltarPara}>Voltar</LinkDeVoltar>

      <section className="premium-panel relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+6px)] border px-6 py-9 text-center sm:px-10 sm:py-11">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 -z-10 size-64 rounded-full bg-primary-fixed/38 blur-3xl" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-16 top-0 h-px bg-white/95" />

        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-card-border/80 bg-surface-container-low text-outline shadow-[inset_0_1px_0_rgba(255,255,255,0.9),var(--shadow-cartao)]">
          <ShieldAlert aria-hidden="true" size={24} strokeWidth={1.65} />
        </span>
        <p className="rotulo mt-6 text-primary/80">Permissão financeira</p>
        <h2 className="mt-3 text-[clamp(1.8rem,4vw,2.65rem)] leading-[1.06] font-semibold tracking-[-0.04em] text-on-surface">
          Área do financeiro e da administradora
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-on-surface-variant">
          A recepção registra vendas com a taxa padrão. Alterar valores, confirmar recebimentos e lançar despesas fica com quem responde pelo caixa.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <SeloHero>
            <WalletCards aria-hidden="true" size={13} strokeWidth={1.75} />
            Caixa protegido por perfil
          </SeloHero>
          <SeloHero tom="informativo">A RLS repete a restrição no banco</SeloHero>
        </div>
      </section>
    </div>
  );
}
