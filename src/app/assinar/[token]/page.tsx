import { BadgeCheck, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AssinarPorLink } from "@/components/documentos/assinar-por-link";
import { tokenPlausivel, type TipoDocumento } from "@/lib/documento";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";
import { estadoDoLinkPublico } from "@/server/consultas/documentos";
import "../assinatura-premium.css";

export const metadata: Metadata = {
  title: "Assinar documento",
  description: "Leia e assine o documento enviado pela clínica.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const TIPOS = ["contrato", "termo", "orientacao", "anamnese"];

export default async function PaginaAssinar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const limpo = tokenPlausivel(token) ? token : "";
  const estado = await estadoDoLinkPublico(limpo);
  const situacao = estado.situacao;
  const tipo = estado.tipo && TIPOS.includes(estado.tipo) ? (estado.tipo as TipoDocumento) : null;

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#fbfdff_38%,#f6f9fc_100%)] px-3 py-4 sm:px-6 sm:py-8 lg:py-10">
      <span aria-hidden="true" className="pointer-events-none absolute -top-40 -left-28 size-[30rem] rounded-full bg-primary-fixed/45 blur-3xl" />
      <span aria-hidden="true" className="pointer-events-none absolute top-[28rem] -right-48 size-[34rem] rounded-full bg-informativo-fundo/70 blur-3xl" />

      <div className="relative mx-auto flex w-full max-w-4xl flex-col gap-4 sm:gap-6">
        <header className="sem-impressao glass-surface flex items-center justify-between gap-4 rounded-[calc(var(--radius-painel)+2px)] border border-card-border px-4 py-3.5 shadow-[0_18px_48px_-38px_rgba(8,41,76,.5)] sm:px-5">
          <MarcaComNome tamanho="medio" />

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-positivo-borda bg-positivo-fundo px-3 py-1.5 text-xs font-semibold text-positivo sm:inline-flex">
            <LockKeyhole aria-hidden="true" size={13} strokeWidth={1.75} />
            Link protegido
          </span>
        </header>

        <section className="sem-impressao premium-panel group relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border px-5 py-6 shadow-[0_28px_70px_-52px_rgba(7,57,112,.58)] sm:px-7 sm:py-7 lg:px-8">
          <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-20 size-72 rounded-full bg-primary-fixed/45 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
            <div>
              <p className="rotulo text-primary">Documento da clínica</p>
              <h1 className="titulo-tela mt-2 max-w-2xl text-on-surface">
                Leia com calma. Assine só depois de conferir tudo.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant sm:text-[0.95rem]">
                {estado.verificacao === "nascimento_email"
                  ? "O documento só é exibido depois que você confirma sua data de nascimento e um código enviado ao seu e-mail. Esta página não pede senha, cartão ou qualquer dado de pagamento."
                  : "O documento só é exibido depois que você confirma sua data de nascimento. Esta página não pede senha, cartão ou qualquer dado de pagamento."}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              <div className="rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo px-3 py-2.5 text-center lg:flex lg:items-center lg:gap-2.5 lg:text-left">
                <ShieldCheck aria-hidden="true" size={15} strokeWidth={1.75} className="mx-auto text-positivo lg:mx-0 lg:shrink-0" />
                <span className="mt-1 block text-[0.68rem] font-semibold leading-4 text-positivo lg:mt-0">Acesso protegido</span>
              </div>
              <div className="rounded-[var(--radius-controle)] border border-informativo-borda bg-informativo-fundo px-3 py-2.5 text-center lg:flex lg:items-center lg:gap-2.5 lg:text-left">
                <FileCheck2 aria-hidden="true" size={15} strokeWidth={1.75} className="mx-auto text-informativo-texto lg:mx-0 lg:shrink-0" />
                <span className="mt-1 block text-[0.68rem] font-semibold leading-4 text-informativo-texto lg:mt-0">Texto preservado</span>
              </div>
              <div className="rounded-[var(--radius-controle)] border border-card-border bg-surface px-3 py-2.5 text-center lg:flex lg:items-center lg:gap-2.5 lg:text-left">
                <BadgeCheck aria-hidden="true" size={15} strokeWidth={1.75} className="mx-auto text-primary lg:mx-0 lg:shrink-0" />
                <span className="mt-1 block text-[0.68rem] font-semibold leading-4 text-on-surface-variant lg:mt-0">Via verificável</span>
              </div>
            </div>
          </div>
        </section>

        <div className="assinatura-publica-premium [&_form]:relative [&_form]:overflow-hidden [&_form]:border-card-border [&_form]:bg-surface [&_form]:shadow-[0_24px_64px_-50px_rgba(7,57,112,.48)] [&_.folha-texto]:bg-surface">
          <AssinarPorLink token={limpo} tipo={tipo} situacaoInicial={situacao} verificacao={estado.verificacao} />
        </div>

        <footer className="sem-impressao glass-surface flex items-start gap-3 rounded-[var(--radius-painel)] border border-card-border px-4 py-4 text-xs leading-5 text-outline shadow-[0_16px_44px_-38px_rgba(8,41,76,.42)] sm:px-5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-controle)] border border-positivo-borda bg-positivo-fundo text-positivo">
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
