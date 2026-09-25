import { BadgeCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { AssinarPorLink } from "@/components/documentos/assinar-por-link";
import { tokenPlausivel, type TipoDocumento } from "@/lib/documento";
import { MarcaComNome } from "@/components/ui/marca-da-clinica";
import { estadoDoLinkPublico } from "@/server/consultas/documentos";

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
    <main className="relative min-h-dvh overflow-hidden bg-surface-container-low px-4 py-6 sm:px-6 sm:py-10">

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-5 sm:gap-6">
        <header className="sem-impressao glass-surface flex items-center justify-between gap-4 rounded-[var(--radius-painel)] border border-card-border px-4 py-3.5 sm:px-5">
          <MarcaComNome tamanho="medio" />

          <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-positivo-borda bg-positivo-fundo px-3 py-1.5 text-xs font-semibold text-positivo sm:inline-flex">
            <LockKeyhole aria-hidden="true" size={13} strokeWidth={1.75} />
            Link protegido
          </span>
        </header>

        <section className="sem-impressao premium-panel group relative isolate overflow-hidden rounded-[var(--radius-painel)] border px-5 py-5 sm:px-7 sm:py-7">

          <p className="rotulo text-primary">Documento da clínica</p>
          <h1 className="titulo-tela mt-2 text-on-surface">
            Leia com calma antes de continuar
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">
            O documento só abre depois que você confirma a sua data de nascimento. Esta página não pede senha do sistema nem dados de pagamento.
          </p>

          {/* No celular, os selos saem: o rodapé já diz o mesmo, e o documento sobe para a
              primeira tela em vez de ficar abaixo de um cartão que ocupava a tela inteira. */}
          <div className="mt-5 hidden flex-wrap gap-2 border-t border-card-border pt-4 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-positivo-borda bg-positivo-fundo px-3 py-1.5 text-xs font-medium text-positivo">
              <ShieldCheck aria-hidden="true" size={13} strokeWidth={1.75} />
              Acesso protegido
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-informativo-borda bg-informativo-fundo px-3 py-1.5 text-xs font-medium text-informativo-texto">
              <BadgeCheck aria-hidden="true" size={13} strokeWidth={1.75} />
              Conteúdo preservado
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-card-border bg-surface px-3 py-1.5 text-xs font-medium text-on-surface-variant">
              Sem cobrança nesta página
            </span>
          </div>
        </section>

        <div className="[&_form]:relative [&_form]:overflow-hidden [&_form]:border-card-border [&_form]:bg-surface [&_.folha-texto]:bg-surface">
          <AssinarPorLink token={limpo} tipo={tipo} situacaoInicial={situacao} />
        </div>

        <footer className="sem-impressao glass-surface flex items-start gap-3 rounded-[var(--radius-painel)] border border-card-border px-4 py-4 text-xs leading-5 text-outline sm:px-5">
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
