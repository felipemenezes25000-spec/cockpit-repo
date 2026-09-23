import { LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AssinarPorLink } from "@/components/documentos/assinar-por-link";
import { tokenPlausivel, type TipoDocumento } from "@/lib/documento";
import { CLINICA } from "@/lib/nav";
import { estadoDoLinkPublico } from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Assinar documento",
  description: "Leia e assine o documento enviado pela clínica.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TIPOS = ["contrato", "termo", "orientacao", "anamnese"];

export default async function PaginaAssinar({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const limpo = tokenPlausivel(token) ? token : "";

  const estado = await estadoDoLinkPublico(limpo);
  const situacao = estado.situacao;
  const tipo = estado.tipo && TIPOS.includes(estado.tipo) ? (estado.tipo as TipoDocumento) : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-surface-container-low px-4 py-6 sm:px-6 sm:py-10">
      <div aria-hidden="true" className="sem-impressao pointer-events-none absolute -top-40 left-[5%] size-[30rem] rounded-full bg-primary-fixed/42 blur-3xl" />
      <div aria-hidden="true" className="sem-impressao pointer-events-none absolute -right-40 bottom-[-12rem] size-[34rem] rounded-full bg-secondary-fixed/30 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
        <header className="sem-impressao glass-surface flex items-center justify-between gap-4 rounded-[var(--radius-painel)] border px-4 py-3.5 shadow-[var(--shadow-cartao)] sm:px-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-primary-container text-sm font-bold text-on-primary shadow-[var(--shadow-primary)]">
              {CLINICA.monograma}
            </span>
            <div className="min-w-0">
              <p className="font-semibold tracking-[-0.015em] text-on-surface">{CLINICA.nome}</p>
              <p className="mt-0.5 truncate text-xs text-outline">{CLINICA.descricao}</p>
            </div>
          </div>

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-positivo-borda/80 bg-positivo-fundo/75 px-3 py-1.5 text-xs font-semibold text-positivo shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:inline-flex">
            <LockKeyhole aria-hidden="true" size={13} strokeWidth={1.75} />
            Link protegido
          </span>
        </header>

        <section className="sem-impressao premium-panel relative isolate overflow-hidden rounded-[var(--radius-painel)] border px-5 py-5 sm:px-6">
          <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 -z-10 size-52 rounded-full bg-primary-fixed/38 blur-3xl" />
          <p className="rotulo text-primary/80">Documento da clínica</p>
          <h1 className="mt-2 text-[clamp(1.45rem,4vw,2rem)] leading-[1.1] font-semibold tracking-[-0.035em] text-on-surface">
            Leia com calma antes de continuar
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-variant">
            Para proteger o documento, o conteúdo só é liberado após a conferência solicitada pela clínica. Esta página não pede senha do sistema nem dados de pagamento.
          </p>
        </section>

        <AssinarPorLink token={limpo} tipo={tipo} situacaoInicial={situacao} />

        <footer className="sem-impressao glass-surface flex items-start gap-3 rounded-[var(--radius-painel)] border px-4 py-4 text-xs leading-5 text-outline shadow-[var(--shadow-cartao)] sm:px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-positivo-fundo text-positivo">
            <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.75} />
          </span>
          <span>
            Esta página pertence ao consultório. Ela não pede senha, não cobra nada e não guarda dados de pagamento. Na dúvida, confirme o envio diretamente com a clínica antes de assinar.
          </span>
        </footer>
      </div>
    </main>
  );
}
