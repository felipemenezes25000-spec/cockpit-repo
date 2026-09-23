import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EstruturaPendenteDocumento } from "@/components/documentos/estrutura-pendente";
import { FormularioEmissao } from "@/components/documentos/formulario-emissao";
import { uuidValido } from "@/lib/formulario";
import { pacienteParaSelecao } from "@/server/consultas/pacientes";
import {
  EstruturaDocumentoPendenteError,
  modelosParaEmissao,
} from "@/server/consultas/documentos";

export const metadata: Metadata = {
  title: "Emitir documento",
  description: "Emite contrato, termo ou orientação a partir de um modelo.",
};

function lerTexto(valor: string | string[] | undefined): string {
  const texto = Array.isArray(valor) ? valor[0] : valor;
  return (texto ?? "").slice(0, 36);
}

export default async function PaginaEmitirDocumento({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const corrige = lerTexto(parametros.corrige);

  const modelos = await modelosParaEmissao().catch((erro: unknown) => {
    if (erro instanceof EstruturaDocumentoPendenteError) return null;
    throw erro;
  });

  if (!modelos) {
    return (
      <div>
        <EstruturaPendenteDocumento />
      </div>
    );
  }

  const paciente = await pacienteParaSelecao(lerTexto(parametros.paciente));

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/formularios"
        className="mb-6 inline-flex min-h-6 items-center gap-2 text-sm text-on-surface-variant transition-colors hover:text-primary"
      >
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Voltar para documentos
      </Link>

      {/* Correção não edita o documento antigo: emite um novo apontando para
          ele, e o antigo passa a "substituído". */}
      <FormularioEmissao
        modelos={modelos}
        pacienteInicial={paciente}
        corrigeId={uuidValido(corrige) ? corrige : ""}
      />
    </div>
  );
}
