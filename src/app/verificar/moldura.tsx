import { ShieldCheck } from "lucide-react";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";

/** O entorno das páginas públicas de verificação: marca, conteúdo, rodapé. */
export function MolduraDaVerificacao({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#fbfdff_38%,#f6f9fc_100%)] px-3 py-4 sm:px-6 sm:py-8 lg:py-10">
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-28 size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute top-[26rem] -right-48 size-[34rem] rounded-full bg-informativo-fundo/70 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
        <header className="glass-surface flex items-center justify-between gap-4 rounded-[calc(var(--radius-painel)+2px)] border border-card-border px-4 py-3.5 shadow-[0_18px_48px_-38px_rgba(8,41,76,.5)] sm:px-5">
          <MarcaComNome tamanho="medio" />
          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-informativo-borda bg-informativo-fundo px-3 py-1.5 text-xs font-semibold text-informativo-texto sm:inline-flex">
            <ShieldCheck aria-hidden="true" size={13} strokeWidth={1.75} />
            Verificação de autenticidade
          </span>
        </header>

        {children}

        <footer className="glass-surface flex items-start gap-3 rounded-[var(--radius-painel)] border border-card-border px-4 py-4 text-xs leading-5 text-outline shadow-[0_16px_44px_-38px_rgba(8,41,76,.42)] sm:px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo text-positivo">
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.75} />
          </span>
          <span>
            Esta página confirma se uma via assinada é autêntica. Ela não mostra o conteúdo do documento nem dados de saúde — só iniciais, datas e as identificações criptográficas impressas na via.
          </span>
        </footer>
      </div>
    </main>
  );
}

/** Campo para digitar outro código. Formulário GET: funciona sem JavaScript. */
export function FormularioDeCodigo({ valor = "", compacto = false }: { valor?: string; compacto?: boolean }) {
  return (
    <form action="/verificar" method="get" className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1">
        <label htmlFor="codigo-verificacao" className={compacto ? "text-xs font-semibold text-outline" : "text-sm font-semibold text-on-surface"}>
          Código de verificação
        </label>
        <input
          id="codigo-verificacao"
          name="codigo"
          type="text"
          required
          defaultValue={valor}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={20}
          placeholder="XXXX-XXXX-XXXX"
          className="mt-1.5 h-12 w-full rounded-[var(--radius-controle)] border border-outline-variant bg-surface px-4 font-mono text-lg font-semibold tracking-[0.12em] text-on-surface uppercase placeholder:font-normal placeholder:tracking-[0.12em] placeholder:text-outline-variant focus-visible:border-primary-container focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/15"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-controle)] border border-primary-container bg-primary-container px-6 text-sm font-semibold text-on-primary shadow-[0_14px_28px_-18px_rgba(10,110,209,.7)] transition-[transform,background-color] duration-180 hover:-translate-y-0.5 hover:bg-primary-hover"
      >
        <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
        Verificar
      </button>
    </form>
  );
}
