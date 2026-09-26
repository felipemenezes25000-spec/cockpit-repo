import { QrCode } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioDeCodigo, MolduraDaVerificacao } from "./moldura";

export const metadata: Metadata = {
  title: "Verificar assinatura",
  description: "Confira se uma via assinada é autêntica pelo código impresso nela.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PaginaVerificar({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string | string[] }>;
}) {
  const { codigo } = await searchParams;
  const digitado = (Array.isArray(codigo) ? codigo[0] : codigo) ?? "";
  const limpo = digitado.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (limpo.length === 12) {
    redirect(`/verificar/${limpo.slice(0, 4)}-${limpo.slice(4, 8)}-${limpo.slice(8)}`);
  }

  return (
    <MolduraDaVerificacao>
      <section className="relative isolate overflow-hidden rounded-[calc(var(--radius-painel)+4px)] border border-card-border bg-[linear-gradient(155deg,#ffffff_0%,#f9fcff_58%,#edf6ff_100%)] px-5 py-7 shadow-[0_28px_72px_-50px_rgba(8,52,99,.58)] sm:px-9 sm:py-9">
        <span aria-hidden="true" className="pointer-events-none absolute -top-28 -right-16 size-72 rounded-full bg-primary-fixed/55 blur-3xl" />
        <div className="relative">
          <span className="mb-5 flex size-13 items-center justify-center rounded-[var(--radius-painel)] border border-primary-fixed-dim bg-surface text-primary shadow-[0_14px_30px_-24px_rgba(8,84,160,.48)]">
            <QrCode aria-hidden="true" size={22} strokeWidth={1.65} />
          </span>
          <p className="rotulo text-primary">Via assinada</p>
          <h1 className="titulo-tela mt-2 max-w-2xl text-on-surface">Confira se a via é autêntica</h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant">
            Leia o QR da via com a câmera do celular, ou digite o código de 12 caracteres impresso ao lado dele.
          </p>

          {digitado && limpo.length !== 12 ? (
            <p role="alert" className="mt-4 max-w-xl rounded-[var(--radius-controle)] border border-negativo-borda bg-negativo-fundo px-3.5 py-2.5 text-sm text-negativo">
              O código tem 12 letras e números, no formato XXXX-XXXX-XXXX.
            </p>
          ) : null}

          <div className="mt-6 max-w-xl">
            <FormularioDeCodigo valor={digitado} />
          </div>
        </div>
      </section>
    </MolduraDaVerificacao>
  );
}
